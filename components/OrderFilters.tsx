import React from 'react';
import { Search, Filter } from 'lucide-react';
import { OrderStatus } from '../types';

interface OrderFiltersProps {
  searchTerm: string;
  filterStatus: OrderStatus | 'All';
  onSearchChange: (value: string) => void;
  onFilterChange: (value: OrderStatus | 'All') => void;
}

const statusTranslations: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'قيد الانتظار',
  [OrderStatus.Delivered]: 'تم التسليم',
  [OrderStatus.Cancelled]: 'تم الإلغاء',
};

const OrderFilters: React.FC<OrderFiltersProps> = ({
  searchTerm,
  filterStatus,
  onSearchChange,
  onFilterChange,
}) => (
  <>
    <div className="relative w-full lg:w-96">
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        className="pr-10 pl-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
        placeholder="بحث باسم العميل، الهاتف، المادة، أو الناشر..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
    <div className="flex items-center space-x-2 space-x-reverse w-full lg:w-auto justify-end">
      <Filter className="h-4 w-4 text-gray-500" />
      <select
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
        value={filterStatus}
        onChange={(e) =>
          onFilterChange(e.target.value as OrderStatus | 'All')
        }
      >
        <option value="All">كل الحالات</option>
        {Object.values(OrderStatus).map((s) => (
          <option key={s} value={s}>
            {statusTranslations[s]}
          </option>
        ))}
      </select>
    </div>
  </>
);

export default OrderFilters;
