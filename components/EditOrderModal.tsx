import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Hash, CreditCard, Clock, User, BookOpen, Trash2, Plus, Info, CheckCircle, AlertCircle, Clock3, Ban, ClipboardList } from 'lucide-react';
import { OrderWithDetails, OrderStatus, Publisher, AcademicYear, Subject, Employee, PaymentMethod, AppSettings, BookItem, BookStatus, BookType } from '../types';
import { updateOrder } from '../services/order.service';
import { STORAGE_KEYS } from '../services/storage';
import { loadReferenceData } from '../services/reference-cache';
import { captureError } from '../services/error-handler';
import { showToast } from './Toast';
import SearchableSelect from './SearchableSelect';

interface EditOrderModalProps {
  order: OrderWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusConfig = {
  [BookStatus.Pending]: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: Clock3, label: 'قيد الانتظار' },
  [BookStatus.Delivered]: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, label: 'تم التسليم' },
  [BookStatus.Cancelled]: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: Ban, label: 'تم الإلغاء' },
};

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, isOpen, onClose, onUpdate }) => {
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
    employeeCapacity: 10
  });

  const [bookItems, setBookItems] = useState<BookItem[]>([]);
  const [legacyMode, setLegacyMode] = useState(false);
  const [excessDeposit, setExcessDeposit] = useState('0');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [employeeName, setEmployeeName] = useState(order.employeeName || '');
  const [paymentMethodId, setPaymentMethodId] = useState(order.paymentMethodId);
  const [receivedDate, setReceivedDate] = useState(order.receivedDate);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(order.expectedDeliveryDate);
  const [notes, setNotes] = useState(order.notes || '');

  useEffect(() => {
    if (isOpen) {
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

          // Reset fields to current order values when opened
          const orderItems = order.items || [{
            publisherId: order.publisherId,
            academicYearId: order.academicYearId,
            subjectId: data.subjects.find(sub => sub.name === order.subject)?.id || '',
            quantity: order.quantity,
            type: order.bookType || data.bookTypes[0]?.name || 'عربي',
            status: BookStatus.Pending
          }];
          const isLegacy = orderItems.some(item => item.deposit === undefined || item.deposit === null);
          setBookItems(orderItems);
          setLegacyMode(isLegacy);
          setExcessDeposit(isLegacy ? '0' : String(order.excess_deposit || 0));
          setInvoiceNumber(order.invoiceNumber || '');
          setEmployeeName(order.employeeName || '');
          setPaymentMethodId(order.paymentMethodId);
          setReceivedDate(order.receivedDate);
          setExpectedDeliveryDate(order.expectedDeliveryDate);
          setNotes(order.notes || '');
        } catch (error) {
          captureError(error, { source: 'EditOrderModal', action: 'loadData' });
        }
      };

      loadData();
    }
  }, [isOpen, order]);

  useEffect(() => {
    if (receivedDate && settings.deliveryIntervalDays) {
      const date = new Date(receivedDate);
      date.setDate(date.getDate() + settings.deliveryIntervalDays);
      setExpectedDeliveryDate(date.toISOString().split('T')[0]);
    }
  }, [receivedDate, settings.deliveryIntervalDays]);

  const totalDeposit = legacyMode
    ? Number(order.deposit)
    : bookItems.reduce((sum, item) => sum + (Number(item.deposit) || 0), 0) + (Number(excessDeposit) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out incomplete book items
    const validItems = bookItems.filter(item => item.publisherId && item.subjectId && item.academicYearId);
    
    if (validItems.length === 0) {
      showToast('يجب إضافة كتاب واحد على الأقل مكتمل البيانات', 'error');
      return;
    }

    if (!invoiceNumber.trim()) {
      showToast('رقم الفاتورة مطلوب.', 'error');
      return;
    }

    try {
      // Use the first valid item for main order fields (compatibility)
      const firstItem = validItems[0];
      const primarySubject = subjects.find(s => s.id === firstItem.subjectId)?.name || 'غير محدد';
      
      await updateOrder(order.id, {
        publisherId: firstItem.publisherId,
        academicYearId: firstItem.academicYearId || '',
        subject: primarySubject,
        quantity: firstItem.quantity,
        deposit: totalDeposit,
        employeeName,
        bookType: firstItem.type,
        paymentMethodId,
        receivedDate,
        expectedDeliveryDate,
        notes: notes.trim() || undefined,
        items: validItems,
        invoiceNumber: invoiceNumber.trim() || undefined,
        ...(legacyMode ? {} : { excess_deposit: Number(excessDeposit) || 0 })
      });

      showToast('تم تحديث بيانات الطلب بنجاح');
      onUpdate();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء التحديث', 'error');
    }
  };

  const totals = {
    total: bookItems.length,
    delivered: bookItems.filter(i => i.status === BookStatus.Delivered).length,
    pending: bookItems.filter(i => i.status === BookStatus.Pending).length,
    cancelled: bookItems.filter(i => i.status === BookStatus.Cancelled).length,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-indigo-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">تعديل الطلب #{order.id}</h2>
              <p className="text-sm text-gray-500">العميل: {order.customerName} | {order.customerPhone}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-indigo-50 border border-indigo-100">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">إجمالي الكتب</p>
              <p className="text-lg font-black text-indigo-900 leading-none">{totals.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-xl bg-green-50 border border-green-100">
            <div className="bg-green-600 text-white p-1.5 rounded-lg">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">تم التسليم</p>
              <p className="text-lg font-black text-green-900 leading-none">{totals.delivered}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 border border-gray-100">
            <div className="bg-gray-600 text-white p-1.5 rounded-lg">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">قيد الانتظار</p>
              <p className="text-lg font-black text-gray-900 leading-none">{totals.pending}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-xl bg-red-50 border border-red-100">
            <div className="bg-red-600 text-white p-1.5 rounded-lg">
              <Ban className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">تم الإلغاء</p>
              <p className="text-lg font-black text-red-900 leading-none">{totals.cancelled}</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Basic Info Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    بيانات الطلب
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-500 mr-1">الموظف المسئول</label>
                    <select
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm bg-white"
                      required
                    >
                      <option value="">اختر الموظف...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500 mr-1">إجمالي العربون</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400 text-xs">جنيه</span>
                        <input
                          type="number"
                          step="0.01"
                          value={String(totalDeposit)}
                          readOnly
                          className="w-full pr-4 pl-12 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500 mr-1">العربون الإضافي</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400 text-xs">جنيه</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={excessDeposit}
                          onChange={(e) => {
                            setExcessDeposit(e.target.value);
                            setLegacyMode(false);
                          }}
                          className="w-full pr-4 pl-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {legacyMode && (
                    <p className="text-[11px] text-orange-600 font-medium">
                      طلب قديم بدون توزيع عربون على الكتب — اكتب عربون الكتب يدويًا لتفعيل الحساب التلقائي.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500 mr-1">رقم الفاتورة</label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="رقم الفاتورة"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500 mr-1">طريقة الدفع</label>
                      <select
                        value={paymentMethodId}
                        onChange={(e) => setPaymentMethodId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm bg-white"
                        required
                      >
                        <option value="">اختر الطريقة...</option>
                        {paymentMethods.map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500 mr-1">تاريخ الحجز</label>
                      <input
                        type="date"
                        value={receivedDate}
                        onChange={(e) => setReceivedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500 mr-1">التسليم المتوقع</label>
                      <input
                        type="date"
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-500 mr-1">ملاحظات</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                      placeholder="أضف ملاحظات إضافية..."
                    />
                  </div>
                </div>
              </div>

              {/* Books List Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    الكتب المطلوبة وتعديل حالاتها
                  </h4>
                  <button
                    type="button"
                    onClick={() => setBookItems([...bookItems, { publisherId: '', type: bookTypes[0]?.name || 'عربي', academicYearId: '', subjectId: '', quantity: 1, deposit: settings.depositPerBook, status: BookStatus.Pending }])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-xs font-bold border border-indigo-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة كتاب
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                  {bookItems.map((item, index) => {
                    const config = statusConfig[item.status || BookStatus.Pending];
                    const Icon = config.icon;
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-xl border-2 transition-all ${config.border} ${config.bg} relative group`}
                      >
                        <div className="absolute -top-2 -right-2 bg-white border border-gray-200 text-gray-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                          {index + 1}
                        </div>

                        <div className="grid grid-cols-12 gap-4 items-start">
                          <div className="col-span-11 space-y-4">
                            {/* Row 1: Publisher, Grade & Book Deposit */}
                            <div className="grid grid-cols-3 gap-3">
                              <SearchableSelect
                                label="دار النشر"
                                options={publishers}
                                value={item.publisherId}
                                onChange={(val) => {
                                  const newItems = [...bookItems];
                                  newItems[index].publisherId = val;
                                  setBookItems(newItems);
                                }}
                                placeholder="اختر الناشر..."
                              />
                              <SearchableSelect
                                label="الصف الدراسي"
                                options={years}
                                value={item.academicYearId || ''}
                                onChange={(val) => {
                                  const newItems = [...bookItems];
                                  newItems[index].academicYearId = val;
                                  setBookItems(newItems);
                                }}
                                placeholder="اختر الصف..."
                              />
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 mr-1">عربون الكتاب</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.deposit ?? ''}
                                  onChange={(e) => {
                                    const newItems = [...bookItems];
                                    newItems[index].deposit = parseFloat(e.target.value) || 0;
                                    setBookItems(newItems);
                                    setLegacyMode(false);
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold bg-white h-[38px]"
                                />
                              </div>
                            </div>

                            {/* Row 2: Subject, Type, Qty, Status */}
                            <div className="grid grid-cols-12 gap-3 items-end">
                              <div className="col-span-4">
                                <SearchableSelect
                                  label="المادة"
                                  options={subjects}
                                  value={item.subjectId}
                                  onChange={(val) => {
                                    const newItems = [...bookItems];
                                    newItems[index].subjectId = val;
                                    setBookItems(newItems);
                                  }}
                                  placeholder="اختر المادة..."
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 mr-1">النوع</label>
                                <select
                                  value={item.type}
                                  onChange={(e) => {
                                    const newItems = [...bookItems];
                                    newItems[index].type = e.target.value;
                                    setBookItems(newItems);
                                  }}
                                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium h-[38px]"
                                >
                                  {bookTypes.map(bt => (
                                    <option key={bt.id} value={bt.name}>{bt.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 text-center">الكمية</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...bookItems];
                                    newItems[index].quantity = parseInt(e.target.value) || 1;
                                    setBookItems(newItems);
                                  }}
                                  className="w-full px-1 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold h-[38px]"
                                />
                              </div>
                              <div className="col-span-5">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 mr-1">حالة الكتاب</label>
                                <div className="relative">
                                  <Icon className={`absolute right-3 top-2.5 h-4 w-4 ${config.color}`} />
                                  <select
                                    value={item.status || BookStatus.Pending}
                                    onChange={(e) => {
                                      const newItems = [...bookItems];
                                      newItems[index].status = e.target.value as BookStatus;
                                      setBookItems(newItems);
                                    }}
                                    className={`w-full pr-10 pl-4 py-2 border-2 rounded-xl text-sm font-black focus:ring-2 outline-none transition-all cursor-pointer ${config.border} ${config.color} bg-white h-[42px] appearance-none shadow-sm hover:shadow-md`}
                                  >
                                    <option value={BookStatus.Pending}>⏳ قيد الانتظار</option>
                                    <option value={BookStatus.Delivered}>✅ تم التسليم</option>
                                    <option value={BookStatus.Cancelled}>❌ تم الإلغاء</option>
                                  </select>
                                  <div className="absolute left-3 top-3 pointer-events-none">
                                    <Clock className="h-4 w-4 opacity-30" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-1 flex justify-center pt-8">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = bookItems.filter((_, i) => i !== index);
                                setBookItems(newItems);
                              }}
                              className="p-2 text-red-300 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                              title="حذف الكتاب"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        
                        {item.status === BookStatus.Cancelled && (
                          <div className="absolute inset-0 bg-red-50/20 pointer-events-none rounded-xl flex items-center justify-center overflow-hidden">
                             <div className="w-full h-[2px] bg-red-200/50 transform -rotate-3"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                إلغاء التغييرات
              </button>
              <button
                type="submit"
                className="px-12 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <Save className="h-5 w-5" />
                حفظ كل التعديلات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
