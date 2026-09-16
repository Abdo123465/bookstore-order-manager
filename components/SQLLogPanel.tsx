import React, { useEffect, useState, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { getSQLLogs } from '../services/storage';
import { SQLLog } from '../types';

interface SQLLogPanelProps {
  isVisible: boolean;
}

const SQLLogPanel: React.FC<SQLLogPanelProps> = ({ isVisible }) => {
  const [logs, setLogs] = useState<SQLLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshLogs = async () => {
    const data = await getSQLLogs();
    setLogs(data);
  };

  useEffect(() => {
    refreshLogs();
    const handleLogUpdate = () => refreshLogs();
    window.addEventListener('sql-log-updated', handleLogUpdate);
    return () => window.removeEventListener('sql-log-updated', handleLogUpdate);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-300 h-64 shadow-2xl z-40 flex flex-col transition-transform transform translate-y-0 border-t border-gray-700 font-mono text-sm" dir="ltr">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-green-400" />
            <span className="font-semibold text-gray-200">سجل عمليات SQLite (محاكاة)</span>
        </div>
        <span className="text-xs text-gray-500">{logs.length} مدخلات</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 ? (
           <div className="text-gray-600 italic">لا توجد عمليات مسجلة بعد.</div>
        ) : (
            logs.map((log) => (
                <div key={log.id} className="flex gap-4 group hover:bg-gray-800/50 p-1 rounded">
                    <span className="text-gray-500 whitespace-nowrap text-xs">{log.timestamp}</span>
                    <span className="text-green-300 break-all">{log.query}</span>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default SQLLogPanel;