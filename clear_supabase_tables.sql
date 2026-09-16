-- ================================================================
-- CLEAR ALL DATA FROM SUPABASE TABLES
-- ================================================================
-- نفذ هذا الكود في Supabase SQL Editor قبل رفع البيانات الجديدة
-- Run this in Supabase SQL Editor before uploading new data
-- ================================================================

-- Delete all orders first (has foreign key to customers)
TRUNCATE TABLE orders CASCADE;

-- Delete all customers
TRUNCATE TABLE customers CASCADE;

-- Delete all reference tables
TRUNCATE TABLE publishers CASCADE;
TRUNCATE TABLE academic_years CASCADE;
TRUNCATE TABLE subjects CASCADE;
TRUNCATE TABLE payment_methods CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE settings CASCADE;

-- Show success message
SELECT 'All tables cleared successfully' as result;
