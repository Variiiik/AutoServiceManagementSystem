/*
  # Auto Service Management System Database Schema

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `email` (text)
      - `address` (text)
      - `created_at` (timestamp)
    
    - `vehicles`
      - `id` (uuid, primary key) 
      - `customer_id` (uuid, foreign key)
      - `make` (text)
      - `model` (text)
      - `year` (integer)
      - `license_plate` (text)
      - `vin` (text)
      - `created_at` (timestamp)
    
    - `work_orders`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key)
      - `customer_id` (uuid, foreign key)
      - `assigned_mechanic` (uuid, foreign key to auth.users)
      - `title` (text)
      - `description` (text)
      - `status` (enum: pending, in_progress, completed)
      - `labor_hours` (numeric)
      - `labor_rate` (numeric)
      - `total_amount` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `inventory_items`
      - `id` (uuid, primary key)
      - `name` (text)
      - `sku` (text, unique)
      - `stock_quantity` (integer)
      - `min_stock_level` (integer)
      - `price` (numeric)
      - `created_at` (timestamp)
    
    - `work_order_parts`
      - `id` (uuid, primary key)
      - `work_order_id` (uuid, foreign key)
      - `inventory_item_id` (uuid, foreign key)
      - `quantity_used` (integer)
      - `unit_price` (numeric)
    
    - `appointments`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `vehicle_id` (uuid, foreign key)
      - `assigned_mechanic` (uuid, foreign key to auth.users)
      - `appointment_date` (timestamp)
      - `duration` (interval)
      - `description` (text)
      - `status` (enum: scheduled, confirmed, completed, cancelled)
      - `created_at` (timestamp)
    
    - `user_profiles`
      - `id` (uuid, primary key, foreign key to auth.users)
      - `full_name` (text)
      - `role` (enum: admin, mechanic)
      - `phone` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
*/

-- Create enum types
CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');
CREATE TYPE user_role AS ENUM ('admin', 'mechanic');

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  license_plate text,
  vin text,
  created_at timestamptz DEFAULT now()
);

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'mechanic',
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_mechanic uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  status work_order_status DEFAULT 'pending',
  labor_hours numeric(5,2) DEFAULT 0,
  labor_rate numeric(8,2) DEFAULT 75.00,
  total_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 5,
  price numeric(8,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create work order parts table
CREATE TABLE IF NOT EXISTS work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_used integer NOT NULL,
  unit_price numeric(8,2) NOT NULL
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_mechanic uuid REFERENCES auth.users(id),
  appointment_date timestamptz NOT NULL,
  duration interval DEFAULT '2 hours',
  description text,
  status appointment_status DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Customers: All authenticated users can read, only admins can write
CREATE POLICY "Anyone can read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert customers" ON customers FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update customers" ON customers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete customers" ON customers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Vehicles: All authenticated users can read, only admins can write
CREATE POLICY "Anyone can read vehicles" ON vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert vehicles" ON vehicles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update vehicles" ON vehicles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete vehicles" ON vehicles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- User profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Work orders: All can read, mechanics can update assigned orders, admins can do everything
CREATE POLICY "Anyone can read work orders" ON work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert work orders" ON work_orders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Mechanics can update assigned work orders" ON work_orders FOR UPDATE TO authenticated
  USING (assigned_mechanic = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete work orders" ON work_orders FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Inventory: All can read, only admins can write
CREATE POLICY "Anyone can read inventory" ON inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert inventory" ON inventory_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update inventory" ON inventory_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete inventory" ON inventory_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Work order parts: All can read, mechanics can insert for assigned orders, admins can do everything
CREATE POLICY "Anyone can read work order parts" ON work_order_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mechanics can insert parts for assigned orders" ON work_order_parts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM work_orders WHERE id = work_order_id AND assigned_mechanic = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update work order parts" ON work_order_parts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete work order parts" ON work_order_parts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Appointments: All can read, only admins can write
CREATE POLICY "Anyone can read appointments" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert appointments" ON appointments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update appointments" ON appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete appointments" ON appointments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

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
CREATE OR REPLACE FUNCTION update_work_order_total(work_order_uuid uuid)
RETURNS void AS $$
DECLARE
  parts_total numeric(10,2);
  labor_total numeric(10,2);
  total numeric(10,2);
BEGIN
  -- Calculate parts total
  SELECT COALESCE(SUM(quantity_used * unit_price), 0)
  INTO parts_total
  FROM work_order_parts
  WHERE work_order_id = work_order_uuid;
  
  -- Calculate labor total
  SELECT COALESCE(labor_hours * labor_rate, 0)
  INTO labor_total
  FROM work_orders
  WHERE id = work_order_uuid;
  
  -- Update total amount
  total := parts_total + labor_total;
  
  UPDATE work_orders
  SET total_amount = total, updated_at = now()
  WHERE id = work_order_uuid;
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
  ('Tire (205/55R16)', 'T-010', 8, 2, 95.00);