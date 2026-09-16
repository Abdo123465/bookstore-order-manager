import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, X, RefreshCw } from 'lucide-react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
  action?: ToastAction;
}

type ShowToastOptions = {
  message: string;
  type?: 'success' | 'error';
  action?: ToastAction;
};

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
};

export const showActionToast = (options: ShowToastOptions) => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: options }));
};

const DISMISS_MS = {
  success: 3000,
  error: 6000,
};

export const ToastContainer: React.FC = () => {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleToast = (e: Event) => {
      const { message, type, action } = (e as CustomEvent).detail as ToastState;
      if (timer) clearTimeout(timer);
      setToast({ message, type, action });
      timer = setTimeout(() => setToast(null), DISMISS_MS[type] || 3000);
    };

    window.addEventListener('app-toast', handleToast);
    return () => {
      window.removeEventListener('app-toast', handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all transform translate-y-0 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {toast.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
      <span className="font-medium text-sm flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); setToast(null); }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-white/20 hover:bg-white/30 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          {toast.action.label}
        </button>
      )}
      <button onClick={() => setToast(null)} className="p-0.5 hover:opacity-80 shrink-0"><X className="h-4 w-4" /></button>
    </div>
  );
};
