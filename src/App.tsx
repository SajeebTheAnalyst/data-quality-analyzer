import React, { useState, useEffect } from 'react';
import UploadArea from './components/UploadArea';
import Dashboard from './components/Dashboard';
import { DataQualityReport } from './types';
import { analyzeDataset } from './lib/analyzer';
import { ShieldCheck, Sparkles, Sun, Moon, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [dataset, setDataset] = useState<any[] | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleDataAnalyzed = (data: any[], report: DataQualityReport) => {
    setDataset(data);
    setReport(report);
  };

  const handleReset = () => {
    setReport(null);
    setDataset(null);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#09090B] text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/50 dark:selection:text-blue-100 flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Subtle Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] opacity-50 mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#09090B]/70 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/80 transition-colors">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 relative z-10">
            <img src="/logo.png" alt="Data Quality Analyzer Logo" className="w-9 h-9 rounded-full shadow-sm object-cover bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.replace('hidden', 'flex'); }} />
            <div className="hidden items-center justify-center w-8 h-8 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-gray-900 dark:text-white">
              Data Quality Analyzer
            </span>
          </div>
          <div className="flex items-center gap-4 relative z-10">
             <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 text-xs font-medium">
               <Sparkles className="w-3.5 h-3.5 text-blue-500" />
               <span>Pro Analytics</span>
             </div>
             <button
               onClick={() => setIsDark(!isDark)}
               className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
               aria-label="Toggle dark mode"
             >
               {isDark ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
             </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {report ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Dashboard report={report} dataset={dataset!} onReset={handleReset} />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]"
            >
              <div className="max-w-3xl w-full flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Local Processing Engine Ready</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-gray-900 dark:text-white">
                  Audit your datasets with precision.
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg mb-10 max-w-xl leading-relaxed">
                  Upload a CSV or Excel file to instantly generate a comprehensive quality report. Deep column analysis and anomaly detection, entirely in your browser.
                </p>
                <UploadArea onDataAnalyzed={handleDataAnalyzed} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Premium Footer */}
      <footer className="w-full border-t border-gray-200/80 dark:border-gray-800/80 bg-white/50 dark:bg-[#09090B]/50 backdrop-blur-md py-6 mt-auto relative z-10 transition-colors">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Data Quality Auditor © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Terms</a>
            <a href="#" className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
