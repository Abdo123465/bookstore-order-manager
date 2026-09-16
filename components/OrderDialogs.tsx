import React from 'react';
import { AlertCircle } from 'lucide-react';
import { OrderWithDetails } from '../types';
import EditOrderModal from './EditOrderModal';

interface OrderDialogsProps {
  editingOrder: OrderWithDetails | null;
  deletingOrder: OrderWithDetails | null;
  isAdmin: boolean;
  onCloseEdit: () => void;
  onSave: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

const OrderDialogs: React.FC<OrderDialogsProps> = ({
  editingOrder,
  deletingOrder,
  isAdmin,
  onCloseEdit,
  onSave,
  onCancelDelete,
  onConfirmDelete,
}) => (
  <>
    {editingOrder && (
      <EditOrderModal
        order={editingOrder}
        isOpen={!!editingOrder}
        onClose={onCloseEdit}
        onUpdate={onSave}
      />
    )}

    {deletingOrder && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-4 mb-4 text-red-600">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">تأكيد إلغاء الطلب</h3>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
            <p className="text-gray-700 leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء طلب الحجز رقم{' '}
              <span className="font-bold">#{deletingOrder.id}</span>؟
            </p>
            <div className="mt-3 text-sm text-gray-500">
              <p>العميل: {deletingOrder.customerName}</p>
              <p>المادة: {deletingOrder.subject}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancelDelete}
              className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
            >
              تراجع
            </button>
            <button
              onClick={onConfirmDelete}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all active:scale-95"
            >
              نعم، قم بالإلغاء
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default OrderDialogs;
