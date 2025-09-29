-- Auto Service Management System Database Schema

-- Create enum types
CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');
CREATE TYPE user_role AS ENUM ('admin', 'mechanic');

-- Create users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'mechanic',
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER,
  license_plate VARCHAR(20),
  vin VARCHAR(17),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  assigned_mechanic INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status work_order_status DEFAULT 'pending',
  labor_hours DECIMAL(5,2) DEFAULT 0,
  labor_rate DECIMAL(8,2) DEFAULT 75.00,
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  price DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work order parts table
CREATE TABLE IF NOT EXISTS work_order_parts (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_used INTEGER NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_mechanic INTEGER REFERENCES users(id),
  appointment_date TIMESTAMP NOT NULL,
  duration INTERVAL DEFAULT '2 hours',
  description TEXT,
  status appointment_status DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_mechanic ON work_orders(assigned_mechanic);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_order_parts_work_order_id ON work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_mechanic ON appointments(assigned_mechanic);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Create function to update work order total
CREATE OR REPLACE FUNCTION update_work_order_total(work_order_id_param INTEGER)
RETURNS void AS $$
DECLARE
  parts_total DECIMAL(10,2);
  labor_total DECIMAL(10,2);
  total DECIMAL(10,2);
BEGIN
  -- Calculate parts total
  SELECT COALESCE(SUM(quantity_used * unit_price), 0)
  INTO parts_total
  FROM work_order_parts
  WHERE work_order_id = work_order_id_param;
  
  -- Calculate labor total
  SELECT COALESCE(labor_hours * labor_rate, 0)
  INTO labor_total
  FROM work_orders
  WHERE id = work_order_id_param;
  
  -- Update total amount
  total := parts_total + labor_total;
  
  UPDATE work_orders
  SET total_amount = total, updated_at = CURRENT_TIMESTAMP
  WHERE id = work_order_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update work order total when parts are added/removed
CREATE OR REPLACE FUNCTION trigger_update_work_order_total()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_work_order_total(NEW.work_order_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_work_order_total(OLD.work_order_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_order_parts_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON work_order_parts
  FOR EACH ROW EXECUTE FUNCTION trigger_update_work_order_total();

-- Create trigger to update work order total when labor is updated
CREATE OR REPLACE FUNCTION trigger_update_work_order_labor_total()
RETURNS trigger AS $$
BEGIN
  IF (OLD.labor_hours IS DISTINCT FROM NEW.labor_hours) OR (OLD.labor_rate IS DISTINCT FROM NEW.labor_rate) THEN
    PERFORM update_work_order_total(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_order_labor_total_trigger
  AFTER UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_update_work_order_labor_total();

-- Insert sample data
INSERT INTO inventory_items (name, sku, stock_quantity, min_stock_level, price) VALUES
  ('Engine Oil Filter', 'EOF-001', 25, 5, 12.99),
  ('Air Filter', 'AF-002', 15, 3, 24.50),
  ('Brake Pads (Front)', 'BP-F-003', 8, 2, 89.99),
  ('Brake Pads (Rear)', 'BP-R-004', 6, 2, 79.99),
  ('Spark Plugs (Set of 4)', 'SP-005', 12, 4, 45.00),
  ('Transmission Fluid', 'TF-006', 20, 5, 18.75),
  ('Coolant', 'C-007', 18, 3, 15.99),
  ('Battery', 'BAT-008', 5, 1, 125.00),
  ('Wiper Blades (Pair)', 'WB-009', 10, 2, 32.50),
  ('Tire (205/55R16)', 'T-010', 8, 2, 95.00)
ON CONFLICT (sku) DO NOTHING;

-- Create default admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
  ('admin@autoservice.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', '(555) 123-4567')
ON CONFLICT (email) DO NOTHING;