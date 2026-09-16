import React from 'react';
import { AlertTriangle, AlertCircle, Info, X, RefreshCw } from 'lucide-react';

export type BannerType = 'error' | 'warning' | 'info';

interface ErrorBannerProps {
  message: string;
  type?: BannerType;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  className?: string;
}

const typeStyles: Record<BannerType, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  },
};

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  type = 'error',
  onRetry,
  onDismiss,
  retryLabel = 'إعادة المحاولة',
  className = '',
}) => {
  const style = typeStyles[type];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${style.bg} ${style.border} ${className}`}>
      {style.icon}
      <p className={`flex-1 text-sm font-medium ${style.text}`}>{message}</p>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {retryLabel}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-md hover:bg-black/5 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};
