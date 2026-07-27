import React, { useRef } from 'react';
import { DataQualityReport } from '../types';
import QualityScore from './QualityScore';
import DataTable from './DataTable';
import { FileText, Database, Layers, Hash, AlertTriangle, CheckCircle, Download, FileSpreadsheet, ArrowLeft, Info, BarChart2, Printer, Copy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

function CollapsibleSection({ title, icon, defaultOpen = true, children }: { title: string, icon?: React.ReactNode, defaultOpen?: boolean, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <motion.div variants={itemVariants} className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className="w-full flex items-center justify-between p-5 bg-white dark:bg-[#111113] hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      >
        <div className="flex items-center gap-3 text-gray-900 dark:text-white">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-gray-100 dark:border-gray-800/60"
          >
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface DashboardProps {
  report: DataQualityReport;
  dataset: any[];
  onReset: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function Dashboard({ report, dataset, onReset }: DashboardProps) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const missingValuesData = report.columns
    .filter(c => c.missingPercentage > 0)
    .sort((a, b) => b.missingPercentage - a.missingPercentage)
    .map(c => ({
      name: c.columnName,
      missing: parseFloat(c.missingPercentage.toFixed(1))
    }));

  const typeDistribution = report.columns.reduce((acc, col) => {
    acc[col.type] = (acc[col.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeData = Object.keys(typeDistribution).map(key => ({
    name: key,
    value: typeDistribution[key]
  }));
  
  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

  const [isExportMenuOpen, setIsExportMenuOpen] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // cmd/ctrl + e to export pdf
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        downloadReport();
      }
      // cmd/ctrl + p to print
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        printReport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const downloadReport = async () => {
    setIsExportMenuOpen(false);
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Data_Quality_Report_${report.overview.fileName.replace(/\.[^/.]+$/, "")}.pdf`);
  };

  const downloadJSON = () => {
    setIsExportMenuOpen(false);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `report_${report.overview.fileName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const copyReport = () => {
    setIsExportMenuOpen(false);
    const summary = `Data Quality Report: ${report.overview.fileName}\nScore: ${report.qualityScore}/100\nRows: ${report.overview.rowCount}\nIssues: ${report.recommendations.length}`;
    navigator.clipboard.writeText(summary);
    alert('Summary copied to clipboard');
  };

  const printReport = () => {
    setIsExportMenuOpen(false);
    window.print();
  };

  return (
    <motion.div 
      className="w-full pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <button 
            onClick={onReset}
            className="group flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#09090B]"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            Back to Upload
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Audit Report</h1>
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-[#111113] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm text-sm text-gray-600 dark:text-gray-300">
              <FileSpreadsheet className="w-4 h-4 text-blue-500" />
              <span className="font-medium max-w-[200px] truncate">{report.overview.fileName}</span>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            aria-haspopup="true"
            aria-expanded={isExportMenuOpen}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export
          </button>
          
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111113] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden z-50">
              <button onClick={downloadReport} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/50">
                <FileText className="w-4 h-4" aria-hidden="true" /> Export PDF
              </button>
              <button onClick={downloadJSON} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/50">
                <Database className="w-4 h-4" aria-hidden="true" /> Export JSON
              </button>
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
              <button onClick={printReport} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/50">
                <Printer className="w-4 h-4" aria-hidden="true" /> Print Report
              </button>
              <button onClick={copyReport} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/50">
                <Copy className="w-4 h-4" aria-hidden="true" /> Copy Summary
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <div ref={dashboardRef} className="space-y-6">
        {/* Top Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <QualityScore score={report.qualityScore} />
          
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <StatCard icon={<Database className="text-gray-700 dark:text-gray-300" />} label="Total Rows" value={report.overview.rowCount.toLocaleString()} tooltip="Total number of records in the dataset" />
            <StatCard icon={<Layers className="text-gray-700 dark:text-gray-300" />} label="Columns" value={report.overview.columnCount.toLocaleString()} tooltip="Total number of features/variables" />
            <StatCard icon={<Hash className={report.duplicatePercentage > 0 ? "text-amber-600 dark:text-amber-500" : "text-gray-700 dark:text-gray-300"} />} label="Duplicates" value={report.duplicateRows.toLocaleString()} highlight={report.duplicatePercentage > 0} tooltip={`${report.duplicatePercentage.toFixed(2)}% of rows are duplicates`} />
            <StatCard icon={<FileText className="text-gray-700 dark:text-gray-300" />} label="Memory Size" value={formatBytes(report.overview.memoryUsage)} tooltip="Estimated memory footprint" />
          </div>
        </motion.div>

        {/* Recommendations */}
        <CollapsibleSection title="Insights & Recommendations" icon={<AlertTriangle className="w-5 h-5 text-gray-700 dark:text-gray-300" />} defaultOpen={true}>
          {report.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.recommendations.map((rec) => (
                <motion.div whileHover={{ y: -2 }} key={rec.id} className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111113] shadow-sm hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: rec.type === 'critical' ? '#EF4444' : rec.type === 'warning' ? '#F59E0B' : '#3B82F6' }} />
                    <div className="flex gap-3">
                      {rec.type === 'critical' ? <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" /> : 
                       rec.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> :
                       <Info className="w-5 h-5 text-blue-500 shrink-0" />}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            {rec.column && <span className="font-mono text-[11px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-400">{rec.column}</span>}
                            {rec.issue}
                          </h4>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${rec.type === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : rec.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {rec.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rec.action}</p>
                        
                        {(rec.impact || rec.improvement) && (
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            {rec.impact && (
                              <div>
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">Impact</span>
                                <span className="text-xs text-gray-700 dark:text-gray-300 leading-tight block">{rec.impact}</span>
                              </div>
                            )}
                            {rec.improvement && (
                              <div>
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">Improvement</span>
                                <span className="text-xs text-green-600 dark:text-green-500 font-medium leading-tight block">{rec.improvement}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Issues Found</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">Your dataset is clean and ready for analysis. We couldn't find any anomalies, missing values, or structural issues.</p>
            </div>
          )}
        </CollapsibleSection>

        {/* Charts Grid */}
        <CollapsibleSection title="Data Quality Charts" icon={<BarChart2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />} defaultOpen={true}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Missing Values Chart */}
            {missingValuesData.length > 0 && (
              <div className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">Missing Values (%)</h3>
                <div className="h-64 w-full overflow-y-auto overflow-x-hidden pr-1">
                  <div style={{ height: Math.max(256, missingValuesData.length * 36) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={missingValuesData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{fill: 'rgba(107, 114, 128, 0.05)'}}
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--tw-colors-gray-200)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-white)', color: 'var(--tw-colors-gray-900)', fontSize: '13px' }}
                        />
                        <Bar dataKey="missing" radius={[0, 4, 4, 0]} maxBarSize={24}>
                          {missingValuesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.missing > 50 ? '#EF4444' : entry.missing > 20 ? '#F59E0B' : '#3B82F6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Data Type Distribution */}
            <div className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">Type Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--tw-colors-gray-200)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', color: 'var(--tw-colors-gray-500)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Correlation Heatmap */}
        {report.correlationMatrix && Object.keys(report.correlationMatrix).length > 1 && (
          <CollapsibleSection title="Pearson Correlation" icon={<Layers className="w-5 h-5 text-gray-700 dark:text-gray-300" />} defaultOpen={false}>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr>
                    <th className="p-3 border-b border-r dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"></th>
                    {Object.keys(report.correlationMatrix).map(col => (
                      <th key={col} className="p-3 border-b border-r last:border-r-0 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 font-medium text-gray-600 dark:text-gray-400">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(report.correlationMatrix).map((col1, rIdx) => (
                    <tr key={col1}>
                      <td className="p-3 border-b border-r dark:border-gray-800 font-medium text-left bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                        {col1}
                      </td>
                      {Object.keys(report.correlationMatrix!).map((col2, cIdx) => {
                        const val = report.correlationMatrix![col1][col2];
                        const intensity = Math.abs(val);
                        const isPositive = val >= 0;
                        const bgRgb = isPositive ? `rgba(59, 130, 246, ${intensity * 0.9 + 0.1})` : `rgba(239, 68, 68, ${intensity * 0.9 + 0.1})`;
                        
                        return (
                          <td key={col2} className="p-3 border-b border-r last:border-r-0 border-white dark:border-[#111113] transition-opacity hover:opacity-80" style={{ backgroundColor: bgRgb, color: intensity > 0.4 ? 'white' : 'var(--tw-colors-gray-900)' }}>
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* Column Profiling Table */}
        <CollapsibleSection title="Column Profiling" icon={<Database className="w-5 h-5 text-gray-700 dark:text-gray-300" />} defaultOpen={true}>
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">{report.columns.length} Features analyzed</span>
            </div>
            <div className="overflow-auto max-h-[600px] rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm text-left relative">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#1A1A1E] sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Feature</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Type</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Missing</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Unique</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Insights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {report.columns.map((col, idx) => (
                    <tr key={idx} className="bg-white dark:bg-[#111113] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-[13px] text-gray-900 dark:text-gray-200">
                          {col.columnName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[11px] font-medium border ${
                          col.type === 'number' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' :
                          col.type === 'string' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400' :
                          col.type === 'date' ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400' :
                          'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                        }`}>
                          {col.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {col.missingPercentage > 0 ? (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                            <span className="font-medium">{col.missingPercentage.toFixed(1)}%</span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs">({col.missingCount})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 font-medium">0%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 font-medium">
                        {col.uniqueValues.toLocaleString()} 
                        {col.isConstant ? <span className="ml-2 text-[10px] uppercase font-semibold bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">Constant</span> : ''} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {col.type === 'number' && col.mean !== undefined && (
                          <span className="font-mono">μ: {col.mean.toFixed(2)}  σ: {col.stdDev?.toFixed(2)}</span>
                        )}
                        {col.type === 'number' && col.outlierPercentage && col.outlierPercentage > 0 ? (
                          <span className="ml-2 text-amber-600 dark:text-amber-500">
                            {col.outlierPercentage.toFixed(1)}% Outliers
                          </span>
                        ) : null}
                        {col.type === 'string' && col.averageLength && (
                          <span>Avg Length: {col.averageLength.toFixed(1)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>
        
        {/* Data Preview */}
        {dataset && dataset.length > 0 && (
          <CollapsibleSection title="Dataset Explorer" icon={<FileSpreadsheet className="w-5 h-5 text-gray-700 dark:text-gray-300" />} defaultOpen={true}>
            <DataTable data={dataset} columns={report.columns} />
          </CollapsibleSection>
        )}
      </div>

      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all z-50 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#09090B]"
          aria-label="Back to top"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
        </motion.button>
      )}
    </motion.div>
  );
}

function StatCard({ icon, label, value, highlight = false, tooltip = '' }: { icon: React.ReactNode, label: string, value: string | number, highlight?: boolean, tooltip?: string }) {
  return (
    <motion.div 
      title={tooltip}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`group flex flex-col p-5 rounded-xl border transition-all duration-300 hover:shadow-lg ${highlight ? 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-500/5 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.1)]' : 'bg-white dark:bg-[#111113] border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-500/30'}`}
    >
      <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 mb-3 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
        <div className="transition-transform group-hover:scale-110 group-hover:rotate-3">
          {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-auto">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white block"
        >
          {value}
        </motion.span>
      </div>
    </motion.div>
  );
}
