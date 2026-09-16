import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import UnifiedOrderForm from './components/UnifiedOrderForm';
import OrderList from './components/OrderList';
import AdminPanel from './components/AdminPanel';
import SQLLogPanel from './components/SQLLogPanel';
import { ToastContainer } from './components/Toast';
import { ErrorBanner } from './components/ErrorBanner';
import { initDB } from './services/storage';
import { getOrdersWithCustomerDetails } from './services/order.service';
import { OrderWithDetails } from './types';
import { captureError } from './services/error-handler';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [showLogs, setShowLogs] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
  const [initError, setInitError] = useState('');

  const refreshData = useCallback(async () => {
    try {
      const data = await getOrdersWithCustomerDetails();
      setOrders(data);
    } catch (error) {
      captureError(error, { source: 'App', action: 'refreshData' });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await initDB();
        if (mounted) await refreshData();
      } catch (error) {
        captureError(error, { source: 'App', action: 'startup' });
        if (mounted) setInitError(error instanceof Error ? error.message : 'فشل تحميل التطبيق');
      }
    };
    init();
    return () => { mounted = false; };
  }, [refreshData]);

  const handleRetry = async () => {
    setInitError('');
    try {
      await initDB();
      await refreshData();
    } catch (error) {
      captureError(error, { source: 'App', action: 'startupRetry' });
      setInitError(error instanceof Error ? error.message : 'فشل تحميل التطبيق');
    }
  };

  const handleAdminToggle = () => {
    setView(v => v === 'admin' ? 'dashboard' : 'admin');
  };

  return (
    <div className={`min-h-screen ${showLogs ? 'pb-72' : 'pb-8'} transition-all duration-300`}>
      <Header 
        showLogs={showLogs} 
        onToggleLogs={() => setShowLogs(!showLogs)}
        onAdminClick={handleAdminToggle}
        isAdminMode={view === 'admin'}
      />

      {initError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <ErrorBanner message={initError} type="error" onRetry={handleRetry} onDismiss={() => setInitError('')} />
        </div>
      )}

      <ErrorBoundary source="App" key={view}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {view === 'admin' ? (
            <AdminPanel 
              orders={orders} 
              onRefreshData={refreshData} 
              onBack={() => setView('dashboard')} 
            />
          ) : (
            <div className="space-y-8 animate-fade-in">
              <Dashboard orders={orders} />

              <UnifiedOrderForm onSuccess={refreshData} />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">أحدث الطلبات</h2>
                  <button 
                    onClick={refreshData} 
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    تحديث البيانات
                  </button>
                </div>
                <OrderList orders={orders} onUpdate={refreshData} />
              </div>
            </div>
          )}
        </main>
      </ErrorBoundary>

      <SQLLogPanel isVisible={showLogs} />
      <ToastContainer />
    </div>
  );
}

export default App;