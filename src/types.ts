export interface DatasetOverview {
  fileName: string;
  fileSize: number; // bytes
  rowCount: number;
  columnCount: number;
  memoryUsage: number; // bytes
  preview: any[];
}

export interface ColumnQuality {
  columnName: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'mixed' | 'unknown';
  missingCount: number;
  missingPercentage: number;
  uniqueValues: number;
  isHighCardinality: boolean; // > 90% unique
  isEmpty: boolean; // 100% missing
  isConstant: boolean; // 1 unique value
  
  // Text analysis
  emptyStrings?: number;
  leadingTrailingWhitespace?: number;
  averageLength?: number;
  
  // Numeric analysis
  mean?: number;
  median?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  q1?: number;
  q3?: number;
  outlierCount?: number;
  outlierPercentage?: number;
  
  // Date analysis
  dateRange?: { start: Date; end: Date };
  futureDates?: number;
  veryOldDates?: number;
  invalidDateFormats?: number;
}

export interface DataQualityReport {
  overview: DatasetOverview;
  columns: ColumnQuality[];
  duplicateRows: number;
  duplicatePercentage: number;
  qualityScore: number;
  recommendations: Recommendation[];
  correlationMatrix?: Record<string, Record<string, number>>;
}

export interface Recommendation {
  id: string;
  type: 'critical' | 'warning' | 'info';
  column?: string;
  issue: string;
  action: string;
  impact?: string;
  improvement?: string;
}
