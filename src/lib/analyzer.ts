import { ColumnQuality, DataQualityReport, DatasetOverview, Recommendation } from '../types';
import { parseISO, isValid, isFuture, isBefore } from 'date-fns';

// Helper for standard deviation
const calcStdDev = (arr: number[], mean: number) => {
  if (arr.length <= 1) return 0;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
};

// Helper for median and quartiles
const calcQuantile = (sortedArr: number[], q: number) => {
  const pos = (sortedArr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedArr[base + 1] !== undefined) {
    return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
  } else {
    return sortedArr[base];
  }
};

export async function analyzeDataset(
  data: any[],
  fileName: string,
  fileSize: number,
  onProgress?: (step: string) => void
): Promise<DataQualityReport> {
  const rowCount = data.length;
  if (rowCount === 0) throw new Error("Dataset is empty");
  
  const yieldToMain = async () => new Promise(resolve => setTimeout(resolve, 0));

  onProgress?.('Parsing File');
  await yieldToMain();

  const columns = Object.keys(data[0] || {});
  const columnCount = columns.length;
  
  // Approximate memory usage (very rough estimate in JS)
  const memoryUsage = fileSize > 0 ? fileSize : JSON.stringify(data.slice(0, 100)).length * (rowCount / 100);
  
  const overview: DatasetOverview = {
    fileName,
    fileSize,
    rowCount,
    columnCount,
    memoryUsage,
    preview: data.slice(0, 10),
  };

  const colQuality: ColumnQuality[] = [];
  const recommendations: Recommendation[] = [];
  
  onProgress?.('Checking Duplicates');
  await yieldToMain();

  // Duplicate rows
  const rowHashes = new Set();
  let duplicateRows = 0;
  let rowChunk = 0;
  for (const row of data) {
    const hash = JSON.stringify(row);
    if (rowHashes.has(hash)) {
      duplicateRows++;
    } else {
      rowHashes.add(hash);
    }
    rowChunk++;
    if (rowChunk % 5000 === 0) await yieldToMain();
  }
  const duplicatePercentage = (duplicateRows / rowCount) * 100;

  if (duplicateRows > 0) {
    recommendations.push({
      id: 'dup_rows',
      type: duplicatePercentage > 5 ? 'critical' : 'warning',
      issue: `${duplicateRows} duplicate rows detected (${duplicatePercentage.toFixed(2)}%).`,
      action: 'Review and remove duplicate rows to avoid skewed analysis.', impact: 'May cause biased aggregations and inflate counts.', improvement: 'Improves accuracy of statistical measurements.'
    });
  }

  onProgress?.('Profiling Columns');
  await yieldToMain();

  // Column Analysis
  const numericDataForCorr: Record<string, number[]> = {};

  let colIndex = 0;
  for (const col of columns) {
    colIndex++;
    if (colIndex % 5 === 0) {
      onProgress?.(`Profiling Columns (${colIndex}/${columnCount})`);
      await yieldToMain();
    }
    
    let missingCount = 0;
    const valueCounts = new Map<any, number>();
    const types = new Set<string>();
    
    let isLikelyDate = false;
    let numericValues: number[] = [];
    let textValues: string[] = [];
    let dateValues: Date[] = [];
    let invalidDateFormats = 0;
    
    // First pass: collect basic stats and infer type
    let innerRowChunk = 0;
    for (const row of data) {
      let val = row[col];
      
      if (val === null || val === undefined || val === '') {
        missingCount++;
        continue;
      }
      
      // Update unique counts
      valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
      
      // Infer type
      if (typeof val === 'number') {
        types.add('number');
        numericValues.push(val);
      } else if (typeof val === 'boolean') {
        types.add('boolean');
      } else if (val instanceof Date) {
        types.add('date');
        if (isValid(val)) dateValues.push(val);
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        // Check if it's a number string
        if (trimmed !== '' && !isNaN(Number(trimmed))) {
          types.add('number');
          numericValues.push(Number(trimmed));
        } else if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
           types.add('boolean');
        } else {
          // Check if it's a date
          const dateObj = parseISO(trimmed);
          if (isValid(dateObj) && trimmed.length >= 8 && (trimmed.includes('-') || trimmed.includes('/'))) {
             types.add('date');
             dateValues.push(dateObj);
          } else {
             types.add('string');
             textValues.push(val);
          }
        }
      }
      innerRowChunk++;
      if (innerRowChunk % 10000 === 0) await yieldToMain();
    }
    
    const missingPercentage = (missingCount / rowCount) * 100;
    const uniqueValues = valueCounts.size;
    const isHighCardinality = uniqueValues > 0 && (uniqueValues / (rowCount - missingCount)) > 0.9;
    const isEmpty = missingCount === rowCount;
    const isConstant = uniqueValues === 1;
    
    let inferredType: ColumnQuality['type'] = 'unknown';
    if (isEmpty) {
      inferredType = 'unknown';
    } else if (types.size === 1) {
      inferredType = Array.from(types)[0] as any;
    } else if (types.size > 1) {
      inferredType = 'mixed';
    }

    const quality: ColumnQuality = {
      columnName: col,
      type: inferredType,
      missingCount,
      missingPercentage,
      uniqueValues,
      isHighCardinality,
      isEmpty,
      isConstant
    };

    // Specific Analysis based on type
    if (inferredType === 'number' || (inferredType === 'mixed' && numericValues.length > 0)) {
       numericValues.sort((a, b) => a - b);
       const sum = numericValues.reduce((a, b) => a + b, 0);
       const mean = sum / numericValues.length;
       const q1 = calcQuantile(numericValues, 0.25);
       const median = calcQuantile(numericValues, 0.5);
       const q3 = calcQuantile(numericValues, 0.75);
       const iqr = q3 - q1;
       const lowerBound = q1 - 1.5 * iqr;
       const upperBound = q3 + 1.5 * iqr;
       
       const outliers = numericValues.filter(v => v < lowerBound || v > upperBound);
       
       quality.mean = mean;
       quality.median = median;
       quality.min = numericValues[0];
       quality.max = numericValues[numericValues.length - 1];
       quality.stdDev = calcStdDev(numericValues, mean);
       quality.q1 = q1;
       quality.q3 = q3;
       quality.outlierCount = outliers.length;
       quality.outlierPercentage = (outliers.length / numericValues.length) * 100;

       if (inferredType === 'number') {
           numericDataForCorr[col] = [];
           // Repopulate aligning with original order for correlation
           for (const row of data) {
               let v = row[col];
               if (typeof v === 'string') v = Number(v);
               numericDataForCorr[col].push(typeof v === 'number' && !isNaN(v) ? v : 0); // basic imputation for correlation
           }
       }
       
       if (quality.outlierPercentage > 5) {
         recommendations.push({
           id: `outlier_${col}`,
           column: col,
           type: 'warning',
           issue: `High number of outliers (${quality.outlierPercentage.toFixed(1)}%).`,
           action: 'Investigate outliers. Consider capping or removing them if they are errors.', impact: 'May skew averages and linear models.', improvement: 'Improves robustness of analysis.'
         });
       }
    }

    if (inferredType === 'string' || (inferredType === 'mixed' && textValues.length > 0)) {
       let emptyStrings = 0;
       let whitespaceCount = 0;
       let totalLength = 0;
       
       for (const str of textValues) {
           if (str === "") emptyStrings++;
           else if (str !== str.trim()) whitespaceCount++;
           totalLength += str.length;
       }
       
       quality.emptyStrings = emptyStrings;
       quality.leadingTrailingWhitespace = whitespaceCount;
       quality.averageLength = textValues.length > 0 ? totalLength / textValues.length : 0;
       
       if (whitespaceCount > 0) {
         recommendations.push({
            id: `ws_${col}`,
            column: col,
            type: 'info',
            issue: `${whitespaceCount} values have leading/trailing whitespace.`,
            action: 'Trim whitespace to prevent issues in grouping and joining.',
            impact: 'Causes exact-match joins and grouping to fail.',
            improvement: 'Ensures correct aggregation and joins.'
         });
       }
    }

    if (inferredType === 'date' && dateValues.length > 0) {
       dateValues.sort((a, b) => a.getTime() - b.getTime());
       quality.dateRange = { start: dateValues[0], end: dateValues[dateValues.length - 1] };
       
       const future = dateValues.filter(d => isFuture(d)).length;
       const oldDateThreshold = new Date('1970-01-01');
       const veryOld = dateValues.filter(d => isBefore(d, oldDateThreshold)).length;
       
       quality.futureDates = future;
       quality.veryOldDates = veryOld;
       quality.invalidDateFormats = 0;
    }
    
    // Any string that failed parsing in a mixed column where some dates succeeded
    if (inferredType === 'mixed' && dateValues.length > 0 && types.has('string')) {
       quality.invalidDateFormats = textValues.length;
    }

    // Generate column-level recommendations
    if (missingPercentage > 0) {
      recommendations.push({
        id: `miss_${col}`,
        column: col,
        type: missingPercentage > 20 ? 'critical' : 'warning',
        issue: `${missingPercentage.toFixed(1)}% missing values.`,
        action: missingPercentage > 50 ? 'Consider dropping this column.' : 'Impute missing values using median/mode or a predictive model.',
        impact: missingPercentage > 20 ? 'High risk of bias in analysis.' : 'Minor reduction in statistical power.',
        improvement: 'Improves model accuracy by 10-15%'
      });
    }
    
    if (inferredType === 'mixed') {
      recommendations.push({
        id: `mix_${col}`,
        column: col,
        type: 'critical',
        issue: 'Mixed data types detected (e.g., numbers and text).',
        action: 'Standardize the column to a single data type to ensure analysis integrity.',
        impact: 'Prevents statistical calculations and breaks ML models.',
        improvement: 'Ensures 100% data consistency for processing.'
      });
    }

    if (isConstant && !isEmpty) {
      recommendations.push({
        id: `const_${col}`,
        column: col,
        type: 'info',
        issue: 'Constant column (only 1 unique value).',
        action: 'Consider dropping this column as it provides no variance for modeling.',
        impact: 'Adds memory overhead without providing analytical value.',
        improvement: 'Reduces dataset size and speeds up processing.'
      });
    }
    
    colQuality.push(quality);
  }

  onProgress?.('Calculating Statistics');
  await yieldToMain();

  // Calculate Correlation Matrix for numeric columns
  const numericCols = Object.keys(numericDataForCorr);
  const correlationMatrix: Record<string, Record<string, number>> = {};
  
  if (numericCols.length > 1) {
      for (const col1 of numericCols) {
          correlationMatrix[col1] = {};
          for (const col2 of numericCols) {
              if (col1 === col2) {
                  correlationMatrix[col1][col2] = 1;
              } else {
                  // Pearson correlation
                  const xs = numericDataForCorr[col1];
                  const ys = numericDataForCorr[col2];
                  const xMean = xs.reduce((a,b)=>a+b,0)/xs.length;
                  const yMean = ys.reduce((a,b)=>a+b,0)/ys.length;
                  
                  let num = 0;
                  let den1 = 0;
                  let den2 = 0;
                  
                  for (let i=0; i<xs.length; i++) {
                      const dx = xs[i] - xMean;
                      const dy = ys[i] - yMean;
                      num += dx * dy;
                      den1 += dx * dx;
                      den2 += dy * dy;
                  }
                  const corr = (den1 === 0 || den2 === 0) ? 0 : num / Math.sqrt(den1 * den2);
                  correlationMatrix[col1][col2] = isNaN(corr) ? 0 : corr;
              }
          }
      }
  }

  onProgress?.('Generating Recommendations');
  await yieldToMain();

  // Data Quality Score (0-100)
  let score = 100;
  
  // Deductions
  score -= (duplicatePercentage > 1 ? Math.min(20, duplicatePercentage * 2) : 0);
  
  for (const col of colQuality) {
      // Missing values
      score -= (col.missingPercentage * 0.2); // max 20 pts across all cols is possible
      if (col.isEmpty) score -= 5;
      if (col.isConstant) score -= 1;
      if (col.type === 'mixed') score -= 5;
      if (col.outlierPercentage && col.outlierPercentage > 5) score -= 2;
  }
  
  score = Math.max(0, Math.min(100, Math.round(score)));

  onProgress?.('Building Dashboard');
  await yieldToMain();

  return {
    overview,
    columns: colQuality,
    duplicateRows,
    duplicatePercentage,
    qualityScore: score,
    recommendations,
    correlationMatrix
  };
}
