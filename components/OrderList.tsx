import React, { useState, useRef, useMemo } from "react";
import { Download, FileText } from "lucide-react";
import { OrderStatus, OrderWithDetails } from "../types";
import { updateOrderStatus, deleteOrder } from "../services/order.service";
import OrderTable from "./OrderTable";
import OrderFilters from "./OrderFilters";
import { exportOrdersToExcel, exportOrdersToBatchPDF, exportManifestToExcel } from "../services/order-export";
import { exportReceiptPDF } from "../services/receipt-pdf";
import { exportProfessionalPDF } from "../services/order-pdf";
import { printReceipt } from "../services/receipt-print";
import BatchReport from "./templates/BatchReport";
import ProfessionalReport from "./templates/ProfessionalReport";
import ThermalReceipt from "./templates/ThermalReceipt";
import { showToast } from "./Toast";
import OrderDialogs from "./OrderDialogs";

interface OrderListProps {
  orders: OrderWithDetails[];
  onUpdate: () => void;
  isAdmin?: boolean;
}

const statusTranslations: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: "قيد الانتظار",
  [OrderStatus.Delivered]: "تم التسليم",
  [OrderStatus.Cancelled]: "تم الإلغاء",
};

const OrderList: React.FC<OrderListProps> = ({ orders, onUpdate, isAdmin }) => {
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "All">("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(
    null,
  );
  const [cancellingOrder, setCancellingOrder] =
    useState<OrderWithDetails | null>(null);
  const [reportingOrder, setReportingOrder] = useState<OrderWithDetails | null>(
    null,
  );
  const [printingReceiptOrder, setPrintingReceiptOrder] =
    useState<OrderWithDetails | null>(null);

  // Refs
  const reportRef = useRef<HTMLDivElement>(null);
  const professionalReportRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleExportProfessionalPDF = async (order: OrderWithDetails) => {
    setReportingOrder(order);

    setTimeout(async () => {
      if (!professionalReportRef.current) return;

      try {
        showToast("جاري إنشاء التقرير الرسمي...", "success");
        await exportProfessionalPDF(professionalReportRef.current, order.id, order.customerName);
        showToast("تم حفظ التقرير بنجاح.");
      } catch (error) {
        console.error("Professional PDF Error:", error);
        showToast("حدث خطأ أثناء إنشاء التقرير.", "error");
      } finally {
        setReportingOrder(null);
      }
    }, 500);
  };

  const handleExportReceiptPDF = async (order: OrderWithDetails) => {
    setPrintingReceiptOrder(order);

    setTimeout(async () => {
      if (!receiptRef.current) return;

      try {
        showToast("جاري تجهيز وصل الطباعة...", "success");
        await exportReceiptPDF(receiptRef.current, order.id, order.customerName);
        showToast("تم إنشاء الوصل بنجاح.");
      } catch (error) {
        console.error("Receipt PDF Error:", error);
        showToast("حدث خطأ أثناء إنشاء الوصل.", "error");
      } finally {
        setPrintingReceiptOrder(null);
      }
    }, 500);
  };

  const handleDirectPrintReceipt = async (order: OrderWithDetails) => {
    setPrintingReceiptOrder(order);

    setTimeout(async () => {
      if (!receiptRef.current) return;

      try {
        showToast("جاري تحضير الطباعة المباشرة...", "success");
        const result = await printReceipt(order);

        if (result.success) {
          showToast("تم إرسال أمر الطباعة بنجاح.");
        } else if (result.failureReason) {
          showToast(`فشلت الطباعة: ${result.failureReason}`, "error");
        }
      } catch (error) {
        console.error("Direct Print Error:", error);
        showToast("حدث خطأ أثناء الطباعة المباشرة.", "error");
      } finally {
        setPrintingReceiptOrder(null);
      }
    }, 500);
  };

  const handleExportManifest = () => {
    try {
      exportManifestToExcel(filteredOrders);
      showToast("تم تصدير تقرير المندوب بنجاح.", "success");
    } catch (error) {
      console.error("Manifest Excel Export Error:", error);
      showToast("حدث خطأ أثناء تصدير تقرير المندوب.", "error");
    }
  };

  const filteredOrders = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        filterStatus === "All" || order.status === filterStatus;
      
      const matchesMainFields =
        (order.customerName || "").toLowerCase().includes(searchLower) ||
        (order.customerPhone || "").includes(searchLower) ||
        (order.publisherName || "").toLowerCase().includes(searchLower) ||
        (order.subject || "").toLowerCase().includes(searchLower) ||
        (order.employeeName || "").toLowerCase().includes(searchLower);

      const matchesItems = (order.items || []).some(item => 
        (item.bookName || "").toLowerCase().includes(searchLower) ||
        (item.publisherName || "").toLowerCase().includes(searchLower) ||
        (item.grade || "").toLowerCase().includes(searchLower) ||
        (item.type || "").toLowerCase().includes(searchLower)
      );

      return matchesStatus && (matchesMainFields || matchesItems);
    });
  }, [orders, filterStatus, searchTerm]);

  const handleStatusChange = async (
    orderId: number,
    newStatus: OrderStatus,
  ) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      onUpdate();
      showToast(
        `تم تغيير حالة الطلب #${orderId} إلى ${statusTranslations[newStatus]}`,
      );
    } catch (error) {
      showToast("حدث خطأ أثناء تحديث حالة الطلب.", "error");
    }
  };

  const handleDelete = async (orderId: number) => {
    try {
      await deleteOrder(orderId);
      onUpdate();
      showToast(`تم حذف الطلب #${orderId} بنجاح.`);
      setCancellingOrder(null);
    } catch (error) {
      showToast("حدث خطأ أثناء حذف الطلب.", "error");
    }
  };

  const handleExportExcel = () => {
    try {
      exportOrdersToExcel(filteredOrders);
      showToast("تم تصدير التقرير المجمع بنجاح.");
    } catch (error) {
      console.error("Excel Export Error:", error);
      showToast("حدث خطأ أثناء تصدير Excel.", "error");
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      showToast("جاري إنشاء ملف PDF...", "success");
      await exportOrdersToBatchPDF(reportRef.current);
      showToast("تم حفظ ملف PDF بنجاح.");
    } catch (error) {
      console.error("PDF Export Error:", error);
      showToast("حدث خطأ أثناء إنشاء PDF.", "error");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-center bg-gray-50/50">
        <OrderFilters
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          onSearchChange={setSearchTerm}
          onFilterChange={setFilterStatus}
        />
        <div className="flex mr-2 space-x-1 space-x-reverse">
          <button
            onClick={handleExportExcel}
            className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
            title="تصدير Excel"
          >
            <Download className="h-4 w-4 lg:ml-2" />
            <span className="hidden lg:inline">اكسل</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
            title="تصدير PDF"
          >
            <FileText className="h-4 w-4 lg:ml-2" />
            <span className="hidden lg:inline">PDF</span>
          </button>
          <button
            onClick={handleExportManifest}
            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            title="تقرير المندوب"
          >
            <FileText className="h-4 w-4 lg:ml-2" />
            <span className="hidden lg:inline">تقرير المندوب</span>
          </button>
        </div>
      </div>

      <OrderTable
        orders={filteredOrders}
        totalOrdersCount={orders.length}
        isAdmin={isAdmin}
        onStatusChange={handleStatusChange}
        onEdit={(order) => setEditingOrder(order)}
        onProfessionalPDF={handleExportProfessionalPDF}
        onReceiptPDF={handleExportReceiptPDF}
        onDirectPrint={handleDirectPrintReceipt}
        onDelete={(order) => setCancellingOrder(order)}
      />

      <OrderDialogs
        editingOrder={editingOrder}
        deletingOrder={cancellingOrder}
        isAdmin={isAdmin}
        onCloseEdit={() => setEditingOrder(null)}
        onSave={onUpdate}
        onCancelDelete={() => setCancellingOrder(null)}
        onConfirmDelete={() => handleDelete(cancellingOrder!.id)}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
          width: "800px",
        }}
      >
        <BatchReport ref={reportRef} orders={filteredOrders} />
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
          width: "800px",
        }}
      >
        <ProfessionalReport ref={professionalReportRef} order={reportingOrder} />
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
          width: "300px",
        }}
      >
        <ThermalReceipt ref={receiptRef} order={printingReceiptOrder} />
      </div>

    </div>
  );
};

export default OrderList;
