import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Settings, CreditCard, Book, Calendar, Save, ClipboardList, Users, Search, Edit2, Check, X } from 'lucide-react';
import { STORAGE_KEYS, addReferenceItem, updateReferenceItem, deleteReferenceItem, saveAppSettings } from '../services/storage';
import { loadReferenceData } from '../services/reference-cache';
import { captureError } from '../services/error-handler';
import { Publisher, AcademicYear, PaymentMethod, AppSettings, Subject, Employee, BookType } from '../types';
import { showToast } from './Toast';
import ConfirmModal from './ConfirmModal';

interface SettingsPanelProps {
  onRefreshData?: () => void;
}

type PendingConfirmState = {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
} | null;

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onRefreshData }) => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bookTypes, setBookTypes] = useState<BookType[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    deliveryIntervalDays: 7,
    minQuantity: 1,
    maxQuantity: 10,
    depositPerBook: 100,
    employeeCapacity: 10,
  });

  const [newPublisher, setNewPublisher] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newEmployee, setNewEmployee] = useState('');
  const [newPayment, setNewPayment] = useState({ name: '', type: 'cash' as any });
  const [newBookType, setNewBookType] = useState('');

  const [searchPublisher, setSearchPublisher] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchPayment, setSearchPayment] = useState('');
  const [searchBookType, setSearchBookType] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editValueType, setEditValueType] = useState<any>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmState>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadReferenceData();
        setPublishers(data.publishers);
        setYears(data.academicYears);
        setSubjects(data.subjects);
        setEmployees(data.employees);
        setPaymentMethods(data.paymentMethods);
        setBookTypes(data.bookTypes);
        setSettings(data.settings);
      } catch (error) {
        captureError(error, { source: 'SettingsPanel', action: 'loadData' });
      }
    };

    loadData();
  }, []);

  const refreshSection = async (tableKey: string) => {
    const data = await loadReferenceData();
    switch (tableKey) {
      case STORAGE_KEYS.PUBLISHERS: setPublishers(data.publishers); break;
      case STORAGE_KEYS.ACADEMIC_YEARS: setYears(data.academicYears); break;
      case STORAGE_KEYS.SUBJECTS: setSubjects(data.subjects); break;
      case STORAGE_KEYS.EMPLOYEES: setEmployees(data.employees); break;
      case STORAGE_KEYS.PAYMENT_METHODS: setPaymentMethods(data.paymentMethods); break;
      case STORAGE_KEYS.BOOK_TYPES: setBookTypes(data.bookTypes); break;
    }
  };

  const handleAddPublisher = async () => {
    if (!newPublisher.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.PUBLISHERS, newPublisher);
      await refreshSection(STORAGE_KEYS.PUBLISHERS);
      setNewPublisher('');
    } catch (error) {
      console.error('Error adding publisher:', error);
    }
  };

  const handleRemovePublisher = (id: string) => {
    setPendingConfirm({
      title: 'تأكيد حذف الناشر',
      message: 'هل أنت متأكد من حذف هذا الناشر؟',
      confirmText: 'نعم، احذف الناشر',
      onConfirm: async () => {
        await deleteReferenceItem(STORAGE_KEYS.PUBLISHERS, id);
        await refreshSection(STORAGE_KEYS.PUBLISHERS);
      },
    });
  };

  const handleAddYear = async () => {
    if (!newYear.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.ACADEMIC_YEARS, newYear);
      await refreshSection(STORAGE_KEYS.ACADEMIC_YEARS);
      setNewYear('');
    } catch (error) {
      console.error('Error adding year:', error);
    }
  };

  const handleRemoveYear = (id: string) => {
    setPendingConfirm({
      title: 'تأكيد حذف السنة الدراسية',
      message: 'هل أنت متأكد من حذف هذه السنة الدراسية؟',
      confirmText: 'نعم، احذف السنة',
      onConfirm: async () => {
        await deleteReferenceItem(STORAGE_KEYS.ACADEMIC_YEARS, id);
        await refreshSection(STORAGE_KEYS.ACADEMIC_YEARS);
      },
    });
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.SUBJECTS, newSubject);
      await refreshSection(STORAGE_KEYS.SUBJECTS);
      setNewSubject('');
    } catch (error) {
      console.error('Error adding subject:', error);
    }
  };

  const handleRemoveSubject = (id: string) => {
    setPendingConfirm({
      title: 'تأكيد حذف المادة',
      message: 'هل أنت متأكد من حذف هذه المادة؟',
      confirmText: 'نعم، احذف المادة',
      onConfirm: async () => {
        await deleteReferenceItem(STORAGE_KEYS.SUBJECTS, id);
        await refreshSection(STORAGE_KEYS.SUBJECTS);
      },
    });
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.EMPLOYEES, newEmployee);
      await refreshSection(STORAGE_KEYS.EMPLOYEES);
      setNewEmployee('');
    } catch (error: any) {
      console.error('Error adding employee:', error);
      showToast(error?.message || 'حدث خطأ أثناء إضافة الموظف', 'error');
    }
  };

  const handleRemoveEmployee = (id: string) => {
    setPendingConfirm({
      title: 'تأكيد حذف الموظف',
      message: 'هل أنت متأكد من حذف هذا الموظف؟',
      confirmText: 'نعم، احذف الموظف',
      onConfirm: async () => {
        await deleteReferenceItem(STORAGE_KEYS.EMPLOYEES, id);
        await refreshSection(STORAGE_KEYS.EMPLOYEES);
      },
    });
  };

  const handleAddPayment = async () => {
    if (!newPayment.name.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.PAYMENT_METHODS, newPayment.name, { type: newPayment.type });
      await refreshSection(STORAGE_KEYS.PAYMENT_METHODS);
      setNewPayment({ name: '', type: 'cash' });
    } catch (error) {
      console.error('Error adding payment method:', error);
    }
  };

  const handleRemovePayment = (id: string) => {
    setPendingConfirm({
      title: 'تأكيد حذف طريقة الدفع',
      message: 'هل أنت متأكد من حذف طريقة الدفع هذه؟',
      confirmText: 'نعم، احذف الطريقة',
      onConfirm: async () => {
        await deleteReferenceItem(STORAGE_KEYS.PAYMENT_METHODS, id);
        await refreshSection(STORAGE_KEYS.PAYMENT_METHODS);
      },
    });
  };

  const handleAddBookType = async () => {
    if (!newBookType.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.BOOK_TYPES, newBookType);
      await refreshSection(STORAGE_KEYS.BOOK_TYPES);
      setNewBookType('');
    } catch (error) {
      console.error('Error adding book type:', error);
    }
  };

  const handleRemoveBookType = (id: string) => {
    setPendingConfirm({
      title: 'تأكيد حذف نوع الكتاب',
      message: 'هل أنت متأكد من حذف نوع الكتاب هذا؟',
      confirmText: 'نعم، احذف النوع',
      onConfirm: async () => {
        await deleteReferenceItem(STORAGE_KEYS.BOOK_TYPES, id);
        await refreshSection(STORAGE_KEYS.BOOK_TYPES);
      },
    });
  };

  const handleSaveSettings = async () => {
    if (settings.employeeCapacity < employees.length) {
      showToast(
        `لا يمكن تقليل سعة الموظفين إلى ${settings.employeeCapacity} لأن عدد الموظفين الحالي ${employees.length}. احذف موظفين أولاً.`,
        'error',
      );
      return;
    }

    try {
      await saveAppSettings(settings);
      showToast('تم حفظ الإعدادات بنجاح');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast(error?.message || 'حدث خطأ أثناء حفظ الإعدادات', 'error');
    }
  };

  const startEditing = (id: string, value: string, type?: any) => {
    setEditingId(id);
    setEditValue(value);
    setEditValueType(type || null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
    setEditValueType(null);
  };

  const handleUpdate = async (tableKey: string) => {
    if (!editValue.trim() || !editingId) return;
    try {
      await updateReferenceItem(tableKey, editingId, editValue, { type: editValueType });
      await refreshSection(tableKey);
      cancelEditing();
    } catch (error) {
      console.error('Error updating reference item:', error);
    }
  };

  const filterData = (data: any[], searchTerm: string) => {
    return data.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Book className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold">دور النشر</h3>
          </div>
          <div className="relative w-40">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchPublisher}
              onChange={(e) => setSearchPublisher(e.target.value)}
              className="w-full pr-7 pl-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse mb-4">
          <input
            type="text"
            value={newPublisher}
            onChange={(e) => setNewPublisher(e.target.value)}
            placeholder="اسم دار النشر"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button onClick={handleAddPublisher} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {filterData(publishers, searchPublisher).map((p) => (
            <li key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md group">
              {editingId === p.id ? (
                <div className="flex items-center flex-1 space-x-1 space-x-reverse">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(STORAGE_KEYS.PUBLISHERS)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{p.name}</span>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(p.id, p.name)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemovePublisher(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold">السنوات الدراسية</h3>
          </div>
          <div className="relative w-40">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              className="w-full pr-7 pl-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse mb-4">
          <input
            type="text"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            placeholder="مثال: الصف الأول الابتدائي"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button onClick={handleAddYear} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {filterData(years, searchYear).map((y) => (
            <li key={y.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md group">
              {editingId === y.id ? (
                <div className="flex items-center flex-1 space-x-1 space-x-reverse">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(STORAGE_KEYS.ACADEMIC_YEARS)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{y.name}</span>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(y.id, y.name)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveYear(y.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold">الموظفون</h3>
          </div>
          <div className="relative w-40">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="w-full pr-7 pl-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse mb-4">
          <input
            type="text"
            value={newEmployee}
            onChange={(e) => setNewEmployee(e.target.value)}
            placeholder="اسم الموظف"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button onClick={handleAddEmployee} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {filterData(employees, searchEmployee).map((e) => (
            <li key={e.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md group">
              {editingId === e.id ? (
                <div className="flex items-center flex-1 space-x-1 space-x-reverse">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(STORAGE_KEYS.EMPLOYEES)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm flex items-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 ml-2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                      {e.sortOrder}
                    </span>
                    {e.name}
                  </span>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(e.id, e.name)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveEmployee(e.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold">المواد</h3>
          </div>
          <div className="relative w-40">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="w-full pr-7 pl-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse mb-4">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="اسم المادة"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button onClick={handleAddSubject} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {filterData(subjects, searchSubject).map((subject) => (
            <li key={subject.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md group">
              {editingId === subject.id ? (
                <div className="flex items-center flex-1 space-x-1 space-x-reverse">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(STORAGE_KEYS.SUBJECTS)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{subject.name}</span>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(subject.id, subject.name)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveSubject(subject.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold">طرق الدفع</h3>
          </div>
          <div className="relative w-40">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchPayment}
              onChange={(e) => setSearchPayment(e.target.value)}
              className="w-full pr-7 pl-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex space-x-2 space-x-reverse">
            <input
              type="text"
              value={newPayment.name}
              onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
              placeholder="اسم الطريقة"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
            <select
              value={newPayment.type}
              onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
            >
              <option value="cash">نقدي</option>
              <option value="instapay">انستا باي</option>
              <option value="card">بطاقة</option>
            </select>
            <button onClick={handleAddPayment} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {filterData(paymentMethods, searchPayment).map((pm) => (
            <li key={pm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md group">
              {editingId === pm.id ? (
                <div className="flex flex-col flex-1 space-y-1">
                  <div className="flex items-center space-x-1 space-x-reverse">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none"
                      autoFocus
                    />
                    <select
                      value={editValueType}
                      onChange={(e) => setEditValueType(e.target.value as any)}
                      className="px-2 py-1 text-xs border border-indigo-300 rounded outline-none bg-white"
                    >
                      <option value="cash">نقدي</option>
                      <option value="instapay">انستا باي</option>
                      <option value="card">بطاقة</option>
                    </select>
                    <button onClick={() => handleUpdate(STORAGE_KEYS.PAYMENT_METHODS)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{pm.name}</span>
                    <span className="text-xs text-gray-500">
                      {pm.type === 'cash' ? 'نقدي' : pm.type === 'instapay' ? 'انستا باي' : 'بطاقة'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(pm.id, pm.name, pm.type)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemovePayment(pm.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Book className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold">أنواع الكتب</h3>
          </div>
          <div className="relative w-40">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchBookType}
              onChange={(e) => setSearchBookType(e.target.value)}
              className="w-full pr-7 pl-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse mb-4">
          <input
            type="text"
            value={newBookType}
            onChange={(e) => setNewBookType(e.target.value)}
            placeholder="اسم النوع (مثال: عربي)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button onClick={handleAddBookType} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {filterData(bookTypes, searchBookType).map((bt) => (
            <li key={bt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md group">
              {editingId === bt.id ? (
                <div className="flex items-center flex-1 space-x-1 space-x-reverse">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(STORAGE_KEYS.BOOK_TYPES)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{bt.name}</span>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(bt.id, bt.name)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveBookType(bt.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 space-x-reverse mb-4">
          <Settings className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-bold">إعدادات عامة</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المدة الافتراضية للتسليم (أيام)</label>
            <input
              type="number"
              value={settings.deliveryIntervalDays}
              onChange={(e) => setSettings({ ...settings, deliveryIntervalDays: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">قيمة العربون لكل كتاب (جنيه)</label>
            <input
              type="number"
              value={settings.depositPerBook}
              onChange={(e) => setSettings({ ...settings, depositPerBook: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للكمية</label>
              <input
                type="number"
                value={settings.minQuantity}
                onChange={(e) => setSettings({ ...settings, minQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للكمية</label>
              <input
                type="number"
                value={settings.maxQuantity}
                onChange={(e) => setSettings({ ...settings, maxQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              سعة الموظفين القصوى
              <span className="text-xs text-gray-500 mr-2">(العدد الحالي: {employees.length})</span>
            </label>
            <input
              type="number"
              min={employees.length}
              value={settings.employeeCapacity}
              onChange={(e) => setSettings({ ...settings, employeeCapacity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <button
            onClick={handleSaveSettings}
            className="w-full flex items-center justify-center space-x-2 space-x-reverse bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition font-medium"
          >
            <Save className="h-4 w-4" />
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!pendingConfirm}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || null}
        confirmText={pendingConfirm?.confirmText}
        cancelText="إلغاء"
        onCancel={() => setPendingConfirm(null)}
        onConfirm={async () => {
          const action = pendingConfirm?.onConfirm;
          setPendingConfirm(null);
          if (action) {
            await action();
          }
        }}
      />
    </div>
  );
};

export default SettingsPanel;
