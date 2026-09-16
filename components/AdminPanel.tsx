import React, { useState } from 'react';
import { Shield, ArrowRight, Users, Package, BarChart3, Settings } from 'lucide-react';
import OrderList from './OrderList';
import CustomerList from './CustomerList';
import Reports from './Reports';
import SettingsPanel from './SettingsPanel';

interface AdminPanelProps {
  orders: any[];
  onRefreshData: () => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ orders, onRefreshData, onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'reports' | 'settings'>('orders');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('كلمة المرور غير صحيحة (تلميح: admin)');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
        <div className="bg-white p-8 rounded-xl shadow-2xl border border-yellow-200 w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">الدخول للمسؤولين</h2>
          <p className="text-gray-600 mb-8">يرجى إدخال كلمة المرور للمتابعة إلى لوحة الإدارة.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (loginError) setLoginError('');
              }}
              className="w-full px-5 py-3 border border-yellow-300 rounded-xl focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all text-center text-lg"
              placeholder="كلمة المرور"
              autoFocus
            />
            {loginError && <p className="text-sm text-red-600 text-right">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/30 transition-all active:scale-[0.98]"
            >
              فتح القفل
            </button>
          </form>
          <button
            onClick={onBack}
            className="mt-6 text-sm text-gray-500 hover:text-yellow-600 font-medium transition-colors"
          >
            العودة للوحة التحكم الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in bg-yellow-50 rounded-2xl p-4 sm:p-8 border border-yellow-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center text-yellow-700 hover:text-yellow-800 font-bold bg-yellow-100 px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للرئيسية
        </button>
        <div className="flex space-x-2 space-x-reverse bg-white/80 backdrop-blur-sm p-1.5 rounded-xl border border-yellow-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'}`}
          >
            <Package className="h-4 w-4 ml-2" />
            إدارة الطلبات
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'customers' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'}`}
          >
            <Users className="h-4 w-4 ml-2" />
            إدارة العملاء
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'}`}
          >
            <BarChart3 className="h-4 w-4 ml-2" />
            التقارير
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'}`}
          >
            <Settings className="h-4 w-4 ml-2" />
            الإعدادات
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 overflow-hidden min-h-[60vh]">
        {activeTab === 'orders' && <OrderList orders={orders} onUpdate={onRefreshData} isAdmin={true} />}
        {activeTab === 'customers' && <CustomerList onRefreshData={onRefreshData} />}
        {activeTab === 'reports' && <Reports orders={orders} />}
        {activeTab === 'settings' && <SettingsPanel onRefreshData={onRefreshData} />}
      </div>
    </div>
  );
};

export default AdminPanel;
