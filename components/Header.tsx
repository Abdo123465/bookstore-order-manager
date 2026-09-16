import React from 'react';
import { BookOpen, Database, Shield } from 'lucide-react';

interface HeaderProps {
  onToggleLogs: () => void;
  showLogs: boolean;
  onAdminClick: () => void;
  isAdminMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleLogs, showLogs, onAdminClick, isAdminMode }) => {
  return (
    <header className="bg-red-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <BookOpen className="h-6 w-6 text-red-200" />
          <h1 className="text-xl font-bold tracking-tight">نظام إدارة المكتبة</h1>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          <button 
            onClick={onAdminClick}
            className={`flex items-center space-x-2 space-x-reverse px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isAdminMode ? 'bg-red-900 text-white ring-1 ring-red-300' : 'hover:bg-red-600 text-red-100'}`}
          >
            <Shield className="h-4 w-4" />
            <span>{isAdminMode ? 'خروج من الإدارة' : 'لوحة الإدارة'}</span>
          </button>
          <button 
            onClick={onToggleLogs}
            className={`hidden sm:flex items-center space-x-2 space-x-reverse px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showLogs ? 'bg-red-800 text-red-100' : 'hover:bg-red-600 text-red-100'}`}
          >
            <Database className="h-4 w-4" />
            <span>{showLogs ? 'إخفاء السجلات' : 'السجلات'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
