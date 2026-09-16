# نظام إدارة حجز الكتب (Bookstore Order Manager)

نظام متكامل لإدارة حجوزات الكتب، مبني باستخدام React، Electron، و SQLite.

## المميزات
- إدارة طلبات الكتب (إضافة، تعديل، حذف).
- تتبع حالة الطلبات (قيد الانتظار، تم التسليم، تم الإلغاء).
- إدارة العملاء، دور النشر، والسنوات الدراسية.
- تقارير PDF احترافية.
- قاعدة بيانات محلية (SQLite) تضمن سرعة الأداء وسهولة النقل.
- نظام محمول (Portable) يعمل بدون تثبيت.

## متطلبات التشغيل
- نظام تشغيل Windows.
- تثبيت [Node.js](https://nodejs.org/) (إصدار 18 أو أحدث).

## خطوات التشغيل لأول مرة (للمطورين)
1. قم بفك ضغط الملف.
2. افتح مجلد المشروع في واجهة الأوامر (Terminal/CMD).
3. قم بتثبيت المكتبات المطلوبة:
   ```bash
   npm install
   ```
4. لتشغيل البرنامج في وضع التطوير:
   ```bash
   npm run electron:dev
   ```

## بناء نسخة التشغيل النهائية (Executable)
لإنشاء نسخة تعمل كبرنامج مستقل (Portable) لا يحتاج إلى Node.js:
```bash
npm run build:portable
```
ستجد النسخة النهائية في مجلد `dist-patch-final-v22`.

## ملاحظات هامة
- يتم حفظ قاعدة البيانات تلقائياً في مجلد `database` بجانب ملف التشغيل في النسخة النهائية.
- تم إصلاح مشكلة تعديل الطلب (SqliteError).
- تم إزالة نظام الإيصالات الفردية بناءً على الطلب.

---

# Bookstore Order Management System

A comprehensive system for managing book orders, built with React, Electron, and SQLite.

## Features
- Order management (Add, Edit, Delete).
- Order status tracking (Pending, In Progress, Delivered, Cancelled).
- Management of customers, publishers, and academic years.
- Professional PDF reporting.
- Local SQLite database for performance and portability.
- Portable app support.

## Prerequisites
- Windows OS.
- [Node.js](https://nodejs.org/) installed (v18 or higher).

## Getting Started (Development)
1. Extract the project files.
2. Open the project folder in your terminal.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the app in development mode:
   ```bash
   npm run electron:dev
   ```
   This script starts Vite, waits for `http://localhost:3000`, and then launches Electron automatically.

## Building the Production App
To create a standalone portable executable:
```bash
npm run build:portable
```
The output will be in the `dist-patch-final-v22` folder.

## Important Notes
- The database is automatically stored in a `database` folder next to the executable in production.
- Development mode uses `npm run electron:dev`; you do not need to start Vite in a second terminal.
- Fixed the order edit issue (SqliteError).
- Removed the individual receipt system as requested.
