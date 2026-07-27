import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { ColumnQuality } from '../types';

interface DataTableProps {
  data: any[];
  columns: ColumnQuality[];
}

export default function DataTable({ data, columns }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedCell, setCopiedCell] = useState<{r: number, c: string} | null>(null);
  
  const rowsPerPage = 25;

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filteredData = useMemo(() => {
    if (!debouncedSearch) return data;
    const lowerSearch = debouncedSearch.toLowerCase();
    return data.filter(row => {
      return columns.some(c => String(row[c.columnName] ?? '').toLowerCase().includes(lowerSearch));
    });
  }, [data, debouncedSearch, columns]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  const currentData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page]);

  const copyCell = (value: any, rIndex: number, colName: string) => {
    navigator.clipboard.writeText(String(value ?? ''));
    setCopiedCell({r: rIndex, c: colName});
    setTimeout(() => setCopiedCell(null), 2000);
  };

  return (
    <div className="flex flex-col bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Dataset Explorer</h3>
        <div className="relative w-full sm:w-64">
          <label htmlFor="search-records" className="sr-only">Search records</label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input 
            id="search-records"
            type="text" 
            placeholder="Search records..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />
        </div>
      </div>
      
      <div className="overflow-auto max-h-[600px] flex-1">
        <table className="w-full text-sm text-left relative border-collapse">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#1A1A1E] sticky top-0 z-20">
            <tr>
              <th className="px-6 py-3 font-medium border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1E] sticky left-0 z-30 w-16 text-center">Row</th>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-3 font-medium whitespace-nowrap border-b border-gray-200 dark:border-gray-800">
                  {col.columnName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {currentData.map((row, rowIdx) => {
              const actualRowIndex = (page - 1) * rowsPerPage + rowIdx + 1;
              return (
                <tr key={rowIdx} className="bg-white dark:bg-[#111113] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-gray-400 bg-white dark:bg-[#111113] group-hover:bg-blue-50/50 dark:group-hover:bg-[#151b2b] sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800 text-center">
                    {actualRowIndex}
                  </td>
                  {columns.map((col, colIdx) => {
                    const val = row[col.columnName];
                    const isCopied = copiedCell?.r === rowIdx && copiedCell?.c === col.columnName;
                    
                    return (
                      <td key={colIdx} className="px-6 py-3 truncate max-w-[250px] text-gray-600 dark:text-gray-300 font-mono text-[13px] relative group/cell">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {val === null || val === undefined || val === '' ? (
                              <span className="text-gray-400 italic">null</span>
                            ) : val instanceof Date ? (
                              val.toISOString().split('T')[0]
                            ) : typeof val === 'number' ? (
                               <span className="text-blue-600 dark:text-blue-400">{val}</span>
                            ) : typeof val === 'boolean' ? (
                               <span className="text-purple-600 dark:text-purple-400">{String(val)}</span>
                            ) : (
                              String(val)
                            )}
                          </span>
                          <button 
                            onClick={() => copyCell(val, rowIdx, col.columnName)}
                            className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all absolute right-2 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Copy cell value"
                            aria-label={`Copy value for ${col.columnName}`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {currentData.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No records found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1E] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * rowsPerPage + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * rowsPerPage, filteredData.length)}</span> of <span className="font-medium text-gray-900 dark:text-white">{filteredData.length}</span> records
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
