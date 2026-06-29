-- Salesmen for POS
CREATE TABLE IF NOT EXISTS salesmen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier / party names for restock
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS salesman_id UUID REFERENCES salesmen(id);
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS salesman_name TEXT;

ALTER TABLE restock_logs ADD COLUMN IF NOT EXISTS party_name TEXT;

CREATE INDEX IF NOT EXISTS idx_pos_sales_salesman ON pos_sales(salesman_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
