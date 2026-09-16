import React, { useEffect, useState } from 'react';
import { User, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import { getAllCustomers, updateCustomer, deleteCustomer } from '../services/customer.service';
import { Customer } from '../types';
import { showToast } from './Toast';
import ConfirmModal from './ConfirmModal';

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const refresh = async () => {
    try {
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditPhone(c.phone);
  };

  const handleSave = async (id: number) => {
    if (!editName.trim() || !editPhone.trim()) {
      showToast('لا يمكن أن يكون الاسم ورقم الهاتف فارغين.', 'error');
      return;
    }
    try {
      await updateCustomer(id, editName, editPhone);
      setEditingId(null);
      showToast('تم تحديث بيانات العميل بنجاح.');
      await refresh();
    } catch (error) {
      showToast('حدث خطأ أثناء تحديث بيانات العميل.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id);
      showToast('تم حذف العميل.');
      await refresh();
    } catch (error) {
      showToast('حدث خطأ أثناء حذف العميل.', 'error');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <User className="h-5 w-5 ml-2 text-indigo-600" />
            إدارة العملاء
          </h3>
          <span className="text-xs text-gray-500">إجمالي: {filteredCustomers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">المعرف</th>
                <th className="px-6 py-4">الاسم</th>
                <th className="px-6 py-4">الهاتف</th>
                <th className="px-6 py-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">#{c.id}</td>
                  <td className="px-6 py-4">
                    {editingId === c.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-indigo-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{c.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === c.id ? (
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="border border-indigo-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    ) : (
                      <span className="text-gray-500">{c.phone}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === c.id ? (
                      <div className="flex space-x-2 space-x-reverse">
                        <button onClick={() => handleSave(c.id)} className="text-green-600 hover:text-green-800">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-3 space-x-reverse">
                        <button onClick={() => handleEdit(c)} className="text-indigo-600 hover:text-indigo-800">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-gray-500 text-center">
                    {searchTerm ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد عملاء.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="تأكيد حذف العميل"
        message={
          deleteTarget ? (
            <>
              <p>
                هل أنت متأكد من حذف العميل <span className="font-bold">{deleteTarget.name}</span>؟
              </p>
              <p className="mt-2 text-sm text-gray-500">
                لن يؤدي هذا إلى حذف طلباتهم السابقة.
              </p>
            </>
          ) : null
        }
        confirmText="نعم، احذف العميل"
        cancelText="تراجع"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const targetId = deleteTarget.id;
          setDeleteTarget(null);
          await handleDelete(targetId);
        }}
      />
    </div>
  );
};

export default CustomerList;
