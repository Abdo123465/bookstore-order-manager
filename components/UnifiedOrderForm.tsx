import React, { useState, useEffect } from 'react';
import { Save, X, ClipboardList, Plus, Trash2, BookOpen, User, Info } from 'lucide-react';
import { createOrder } from '../services/order.service';
import { STORAGE_KEYS, getDraft, saveDraft, clearDraft } from '../services/storage';
import { loadReferenceData } from '../services/reference-cache';
import { captureError } from '../services/error-handler';
import { OrderStatus, Publisher, AcademicYear, PaymentMethod, AppSettings, Subject, Employee, BookItem, BookStatus, BookType } from '../types';
import { showToast } from './Toast';
import SearchableSelect from './SearchableSelect';

interface UnifiedOrderFormProps {
  onSuccess: () => void;
}

const statusTranslations: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'قيد الانتظار',
  [OrderStatus.Delivered]: 'تم التسليم',
  [OrderStatus.Cancelled]: 'تم الإلغاء'
};

const UnifiedOrderForm: React.FC<UnifiedOrderFormProps> = ({ onSuccess }) => {
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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deposit, setDeposit] = useState('');
  const [excessDeposit, setExcessDeposit] = useState('0');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
   const [error, setError] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [notes, setNotes] = useState('');
  const [bookItems, setBookItems] = useState<BookItem[]>([{ 
    publisherId: '', 
    type: 'عربي', 
    academicYearId: '', 
    subjectId: '', 
    quantity: 1,
    deposit: 100,
    status: BookStatus.Pending 
  }]);

  // Draft persistence
  useEffect(() => {
    const loadDraft = async () => {
      const draft = await getDraft('unified_order_form');
      if (draft) {
        setCustomerName(draft.customerName || '');
        setCustomerPhone(draft.customerPhone || '');
        setDeposit(draft.deposit || '');
        setEmployeeName(draft.employeeName || '');
        setReceivedDate(draft.receivedDate || new Date().toISOString().split('T')[0]);
        setNotes(draft.notes || '');
        if (draft.bookItems && Array.isArray(draft.bookItems)) {
          setBookItems(draft.bookItems);
        }
      }
    };
    loadDraft();
  }, []);

  // Total deposit = sum of per-book deposits + excess deposit (read-only field)
  useEffect(() => {
    const totalDeposit = bookItems.reduce((sum, item) => sum + (Number(item.deposit) || 0), 0) + (Number(excessDeposit) || 0);
    setDeposit(totalDeposit.toString());
  }, [bookItems, excessDeposit]);

  useEffect(() => {
    const draftData = {
      customerName, customerPhone, deposit, employeeName, 
      receivedDate, notes, bookItems
    };
    saveDraft('unified_order_form', draftData);
  }, [customerName, customerPhone, deposit, employeeName, receivedDate, notes, bookItems]);

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
        captureError(error, { source: 'UnifiedOrderForm', action: 'loadData' });
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (receivedDate && settings.deliveryIntervalDays) {
      const date = new Date(receivedDate);
      date.setDate(date.getDate() + settings.deliveryIntervalDays);
      setExpectedDeliveryDate(date.toISOString().split('T')[0]);
    }
  }, [receivedDate, settings.deliveryIntervalDays]);

  const handleClear = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDeposit('');
    setExcessDeposit('0');
    setInvoiceNumber('');
    setEmployeeName('');
    setPaymentMethodId('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setExpectedDeliveryDate('');
    setError('');
    setNotes('');
    setBookItems([{ 
      publisherId: '', 
      type: bookTypes[0]?.name || 'عربي', 
      academicYearId: '', 
      subjectId: '', 
      quantity: 1,
      deposit: settings.depositPerBook,
      status: BookStatus.Pending
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    // Filter out incomplete book items
    const validItems = bookItems.filter(item => item.publisherId && item.subjectId && item.academicYearId);

    if (
      !customerPhone.trim() ||
      validItems.length === 0 ||
      !paymentMethodId ||
      !employeeName ||
      !deposit
    ) {
      setError('يرجى تعبئة جميع الحقول وإضافة كتاب واحد على الأقل.');
      showToast('يرجى تعبئة جميع الحقول وإضافة كتاب واحد على الأقل.', 'error');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(parseFloat(deposit))) {
      setError('العربون يجب أن يكون رقمًا.');
      showToast('العربون يجب أن يكون رقمًا صحيحًا.', 'error');
      setIsSubmitting(false);
      return;
    }

    if (!invoiceNumber.trim()) {
      setError('رقم الفاتورة مطلوب.');
      showToast('رقم الفاتورة مطلوب.', 'error');
      setIsSubmitting(false);
      return;
    }

    // Use the first valid item as the primary book info for the Order
    const firstItem = validItems[0];
    const primarySubject = subjects.find(s => s.id === firstItem.subjectId)?.name || 'غير محدد';

    const paidDeposit = parseFloat(deposit);

    try {
      await createOrder(
        customerName.trim() || 'غير محدد',
        customerPhone.trim(),
        firstItem.publisherId,
        firstItem.academicYearId || '',
        primarySubject,
        firstItem.quantity,
        paidDeposit,
        paymentMethodId,
        receivedDate,
        expectedDeliveryDate,
        employeeName.trim() || undefined,
        firstItem.type,
        notes.trim() || undefined,
        validItems,
        Number(excessDeposit) || 0,
        invoiceNumber.trim() || undefined
      );
      
      handleClear();
      await clearDraft('unified_order_form');
      showToast('تم إنشاء الطلب بنجاح!');
      onSuccess();
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء إنشاء الطلب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <ClipboardList className="h-5 w-5 ml-2 text-indigo-600" />
          إضافة طلب جديد
        </h3>
        {error && <span className="text-sm text-red-500 font-medium animate-pulse">{error}</span>}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
          {/* Left Column: Customer & Payment */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-indigo-600" />
                بيانات العميل والموظف
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="الاسم الكامل (اختياري)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
                <input
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition ${error && !customerPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              <select
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white ${error && !employeeName ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              >
                <option value="">اختر الموظف...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                <ClipboardList className="h-4 w-4 text-indigo-600" />
                تفاصيل الدفع والمواعيد
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-xs">جنيه</span>
                  <input
                    type="number"
                    placeholder="إجمالي العربون *"
                    value={deposit}
                    readOnly
                    step="0.01"
                    className={`w-full pl-12 pr-4 py-2 border rounded-lg bg-gray-100 text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition ${error && !deposit ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  />
                </div>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white ${error && !paymentMethodId ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                >
                  <option value="">طريقة الدفع *</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-xs">جنيه</span>
                  <input
                    type="number"
                    placeholder="العربون الإضافي"
                    value={excessDeposit}
                    onChange={(e) => setExcessDeposit(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
                <input
                  type="text"
                  placeholder="رقم الفاتورة"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition ${error && !invoiceNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 mr-1">تاريخ الحجز</label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 mr-1">تاريخ التسليم المتوقع</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-indigo-600" />
                ملاحظات إضافية
              </h4>
              <textarea
                placeholder="أضف ملاحظات أو تفاصيل إضافية (اختياري)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Right Column: Book Items Section */}
          <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200 flex flex-col h-full shadow-md">
            <div className="flex flex-col items-center justify-center mb-6 text-center">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg mb-3 transform -rotate-3 group-hover:rotate-0 transition-transform duration-300">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-extrabold text-indigo-900">
                الكتب المطلوبة
              </h4>
              <p className="text-sm text-indigo-600 mt-1 font-medium">أضف الكتب التي يرغب العميل في حجزها</p>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-1 max-h-[550px] custom-scrollbar">
              {bookItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-300 border-2 border-dashed border-indigo-200 rounded-2xl bg-white/50">
                  <Plus className="h-12 w-12 mb-2 opacity-20" />
                  <p className="font-bold">لا توجد كتب مضافة</p>
                  <p className="text-xs">اضغط على الزر أدناه لإضافة أول كتاب</p>
                </div>
              ) : (
                bookItems.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative group transition-all hover:shadow-md hover:border-indigo-300 animate-in fade-in slide-in-from-right-4 duration-300 ease-out"
                  >
                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                      {index + 1}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <SearchableSelect
                        label="دار النشر *"
                        placeholder="اختر الناشر..."
                        options={publishers}
                        value={item.publisherId}
                        onChange={(val) => {
                          const newItems = [...bookItems];
                          newItems[index].publisherId = val;
                          setBookItems(newItems);
                        }}
                      />
                      <SearchableSelect
                        label="الصف الدراسي *"
                        placeholder="اختر الصف..."
                        options={years}
                        value={item.academicYearId}
                        onChange={(val) => {
                          const newItems = [...bookItems];
                          newItems[index].academicYearId = val;
                          setBookItems(newItems);
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 mr-1">النوع *</label>
                          <select
                            value={item.type}
                            onChange={(e) => {
                              const newItems = [...bookItems];
                              newItems[index].type = e.target.value;
                              setBookItems(newItems);
                            }}
                            className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium transition h-[38px]"
                          >
                            {bookTypes.map(bt => (
                              <option key={bt.id} value={bt.name}>{bt.name}</option>
                            ))}
                          </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 mr-1 text-center block">عربون الكتاب</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.deposit ?? ''}
                          onChange={(e) => {
                            const newItems = [...bookItems];
                            newItems[index].deposit = parseFloat(e.target.value) || 0;
                            setBookItems(newItems);
                          }}
                          className="w-full px-2 py-2 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-center font-black text-indigo-600 bg-white transition"
                        />
                      </div>
                      <div className="col-span-4">
                        <SearchableSelect
                          label="المادة *"
                          placeholder="اختر المادة..."
                          options={subjects}
                          value={item.subjectId}
                          onChange={(val) => {
                            const newItems = [...bookItems];
                            newItems[index].subjectId = val;
                            setBookItems(newItems);
                          }}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 mr-1 text-center block">الكمية</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...bookItems];
                            newItems[index].quantity = parseInt(e.target.value) || 1;
                            setBookItems(newItems);
                          }}
                          className="w-full px-2 py-2 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-center font-black text-indigo-600 bg-white transition"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = bookItems.filter((_, i) => i !== index);
                            setBookItems(newItems);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="حذف هذا الكتاب"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setBookItems([...bookItems, { publisherId: '', type: bookTypes[0]?.name || 'عربي', academicYearId: '', subjectId: '', quantity: 1, deposit: settings.depositPerBook }])}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-white text-indigo-600 border-2 border-indigo-200 text-lg font-black rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300 shadow-sm active:scale-95 group"
              >
                <div className="bg-indigo-100 p-2 rounded-xl group-hover:bg-indigo-500 transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                إضافة كتاب جديد للقائمة
              </button>
              <p className="text-[11px] text-indigo-400 mt-3 text-center font-medium">سيتم تسجيل جميع الكتب المضافة أعلاه في الطلب الحالي</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex items-center justify-center px-12 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-lg hover:shadow-xl font-bold text-lg group ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Save className="h-6 w-6 ml-3 group-hover:scale-110 transition" />
            {isSubmitting ? 'جاري الحفظ...' : 'تأكيد وإنشاء طلب الحجز'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UnifiedOrderForm;
