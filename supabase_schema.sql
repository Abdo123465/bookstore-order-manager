-- ============================================
-- Supabase Database Schema for Tafaneen Library
-- ============================================

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publishers Table
CREATE TABLE IF NOT EXISTS publishers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL
);

-- Academic Years Table
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL
);

-- Book Types Table
CREATE TABLE IF NOT EXISTS book_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE
);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT
);

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  sort_order INTEGER
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  publisher_id TEXT,
  year_id TEXT,
  subject TEXT,
  quantity INTEGER,
  deposit REAL,
  payment_method_id TEXT,
  status TEXT DEFAULT 'Pending',
  received_date TEXT,
  expected_delivery_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  employee_name TEXT,
  book_type TEXT,
  notes TEXT,
  items JSONB DEFAULT '[]',
  excess_deposit REAL DEFAULT 0,
  invoice_number TEXT
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (for simplicity)
-- في المستقبل ممكن نضيف authentication ونقيد الصلاحيات
CREATE POLICY "Allow all operations" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON publishers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON academic_years FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON subjects FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON payment_methods FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON book_types FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON settings FOR ALL USING (true);

-- Employee order migration for existing databases
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ordered_employees AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE(sort_order, 999999), ctid) AS rn
  FROM employees
)
UPDATE employees e
SET sort_order = ordered_employees.rn
FROM ordered_employees
WHERE e.id = ordered_employees.id;

-- ============================================
-- Initial Data (Seed)
-- ============================================

-- Publishers
INSERT INTO publishers (id, name) VALUES 
  ('1', 'سلاح التلميذ'),
  ('2', 'المعاصر'),
  ('3', 'الأضواء'),
  ('4', 'الامتحان')
ON CONFLICT (id) DO NOTHING;

-- Academic Years
INSERT INTO academic_years (id, name) VALUES 
  ('1', 'الصف الأول الابتدائي'),
  ('2', 'الصف الثاني الابتدائي'),
  ('3', 'الصف الثالث الابتدائي'),
  ('4', 'الصف الرابع الابتدائي'),
  ('5', 'الصف الخامس الابتدائي'),
  ('6', 'الصف السادس الابتدائي'),
  ('7', 'الصف الأول الإعدادي'),
  ('8', 'الصف الثاني الإعدادي'),
  ('9', 'الصف الثالث الإعدادي')
ON CONFLICT (id) DO NOTHING;

-- Subjects
INSERT INTO subjects (id, name) VALUES 
  ('1', 'لغة عربية'),
  ('2', 'لغة إنجليزية'),
  ('3', 'رياضيات'),
  ('4', 'علوم'),
  ('5', 'دراسات اجتماعية'),
  ('6', 'حاسب آلي'),
  ('7', 'تربية دينية'),
  ('8', 'أخرى')
ON CONFLICT (id) DO NOTHING;

-- Book Types
INSERT INTO book_types (id, name) VALUES
  ('1', 'عربي'),
  ('2', 'لغات')
ON CONFLICT (id) DO NOTHING;

-- Payment Methods
INSERT INTO payment_methods (id, name, type) VALUES 
  ('1', 'فودافون كاش', 'cash'),
  ('2', 'انستا باي', 'instapay'),
  ('3', 'فيزا / ماستركارد', 'card'),
  ('4', 'نقدي', 'cash')
ON CONFLICT (id) DO NOTHING;
