import React, { useMemo } from 'react';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OrderStatus } from '../types';

interface DashboardProps {
  orders: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ orders }) => {
  const { pendingCount, deliveredCount, cancelledCount, totalRevenue } = useMemo(() => {
    let pending = 0, delivered = 0, cancelled = 0, revenue = 0;
    for (const o of orders) {
      if (o.status === OrderStatus.Pending) pending++;
      else if (o.status === OrderStatus.Delivered) delivered++;
      else if (o.status === OrderStatus.Cancelled) cancelled++;
      revenue += (Number(o.deposit) || 0);
    }
    return {
      pendingCount: pending,
      deliveredCount: delivered,
      cancelledCount: cancelled,
      totalRevenue: revenue,
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      {/* Stats Cards */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 space-x-reverse">
        <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">قيد الانتظار</p>
          <h4 className="text-2xl font-bold text-gray-900">{pendingCount}</h4>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 space-x-reverse">
        <div className="p-3 bg-green-100 rounded-lg text-green-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">تم التسليم</p>
          <h4 className="text-2xl font-bold text-gray-900">{deliveredCount}</h4>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 space-x-reverse">
        <div className="p-3 bg-red-100 rounded-lg text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">تم الإلغاء</p>
          <h4 className="text-2xl font-bold text-gray-900">{cancelledCount}</h4>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 space-x-reverse">
        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">إجمالي الإيراد</p>
          <h4 className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(2)} ج</h4>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;