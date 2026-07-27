import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeDataset } from '../lib/analyzer';
import { DataQualityReport } from '../types';

interface UploadAreaProps {
  onDataAnalyzed: (data: any[], report: DataQualityReport) => void;
}

export default function UploadArea({ onDataAnalyzed }: UploadAreaProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('Reading file...');
  const [stats, setStats] = useState<{ time: string, rows: number, cols: number } | null>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setIsSuccess(false);
    setError(null);
    setProgressText('Reading file...');
    
    const startTime = Date.now();
    const wait = async () => new Promise(r => setTimeout(r, 0));

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let data: any[] = [];
      
      if (extension === 'csv') {
        data = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
          });
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        setProgressText('Parsing Excel file...');
        await wait();
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      } else {
        throw new Error("Unsupported file type. Please upload a CSV or Excel file.");
      }

      if (data.length === 0) {
        throw new Error("The uploaded file is empty or contains no data rows.");
      }

      const report = await analyzeDataset(data, file.name, file.size, (step) => {
        setProgressText(step);
      });

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      setStats({
        time: processingTime,
        rows: report.overview.rowCount,
        cols: report.overview.columnCount
      });
      
      setIsProcessing(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        onDataAnalyzed(data, report);
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis.");
      setIsProcessing(false);
      setIsSuccess(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: onDrop as any,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isProcessing || isSuccess
  } as any);

  const PROGRESS_STEPS = [
    'Reading file...',
    'Parsing File',
    'Checking Duplicates',
    'Profiling Columns',
    'Calculating Statistics',
    'Generating Recommendations',
    'Building Dashboard'
  ];

  return (
    <div className="w-full max-w-2xl relative">
      <motion.div 
        {...getRootProps()} 
        animate={isDragActive ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 hover:shadow-lg
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]' 
            : 'border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-[#111113]/80 backdrop-blur-sm hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-white dark:hover:bg-[#111113]'
          } ${(isProcessing || isSuccess) ? 'pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {isSuccess && stats ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-4 min-h-[160px] py-4"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2"
              >
                <CheckCircle className="w-8 h-8" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Analysis completed successfully.</h3>
              <div className="flex flex-col gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium">
                <p>Processing Time: {stats.time} seconds</p>
                <p>Dataset Size: {stats.rows.toLocaleString()} rows × {stats.cols.toLocaleString()} columns</p>
              </div>
            </motion.div>
          ) : isProcessing ? (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-6 min-h-[160px] w-full px-4"
            >
              <div className="w-full max-w-md mx-auto space-y-3 relative">
                {PROGRESS_STEPS.map((step, idx) => {
                  const currentIdx = PROGRESS_STEPS.findIndex(s => progressText.startsWith(s));
                  
                  const isPast = idx < currentIdx || (currentIdx === -1 && idx === 0);
                  const isCurrent = idx === currentIdx;
                  
                  if (Math.abs((currentIdx === -1 ? 0 : currentIdx) - idx) > 1) return null;

                  return (
                    <motion.div 
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ 
                        opacity: isCurrent ? 1 : isPast ? 0.4 : 0, 
                        x: 0,
                        scale: isCurrent ? 1 : 0.95
                      }}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isPast ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' :
                        isCurrent ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                        'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                      }`}>
                        {isPast ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : isCurrent ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {isCurrent ? progressText : step}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
              <div className="w-full max-w-md h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-4">
                 {(() => {
                   const cIdx = PROGRESS_STEPS.findIndex(s => progressText.startsWith(s));
                   const percent = cIdx === -1 ? 0 : (cIdx / (PROGRESS_STEPS.length - 1)) * 100;
                   return (
                     <motion.div 
                       className="h-full bg-blue-500 rounded-full"
                       animate={{ width: `${percent}%` }}
                       transition={{ duration: 0.5, ease: "easeInOut" }}
                     />
                   );
                 })()}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-4 min-h-[160px]"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragActive ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 scale-110 shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {isDragActive ? 'Drop dataset here...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  CSV, XLSX, XLS up to 50MB
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5 border border-transparent dark:border-gray-700">
                  <FileText className="w-3.5 h-3.5" /> CSV
                </div>
                <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5 border border-transparent dark:border-gray-700">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-500/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
