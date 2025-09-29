-- Seed Data for AutoService Pro

-- Insert default admin user (password: admin123)
-- Hash generated with: bcrypt.hash('admin123', 10)
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
  ('admin@autoservice.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', '(555) 123-4567'),
  ('mechanic@autoservice.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Smith', 'mechanic', '(555) 234-5678')
ON CONFLICT (email) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (name, phone, email, address) VALUES
  ('John Doe', '(555) 123-4567', 'john.doe@email.com', '123 Main St, Anytown, ST 12345'),
  ('Jane Smith', '(555) 234-5678', 'jane.smith@email.com', '456 Oak Ave, Somewhere, ST 23456'),
  ('Bob Johnson', '(555) 345-6789', 'bob.johnson@email.com', '789 Pine Rd, Elsewhere, ST 34567'),
  ('Alice Brown', '(555) 456-7890', 'alice.brown@email.com', '321 Elm St, Nowhere, ST 45678'),
  ('Charlie Wilson', '(555) 567-8901', 'charlie.wilson@email.com', '654 Maple Dr, Anywhere, ST 56789');

-- Insert sample vehicles
INSERT INTO vehicles (customer_id, make, model, year, license_plate, vin) VALUES
  (1, 'Toyota', 'Camry', 2020, 'ABC123', '1HGBH41JXMN109186'),
  (1, 'Honda', 'Civic', 2018, 'DEF456', '2HGFC2F59HH123456'),
  (2, 'Ford', 'F-150', 2021, 'GHI789', '1FTFW1ET5DFC12345'),
  (3, 'Chevrolet', 'Malibu', 2019, 'JKL012', '1G1ZD5ST0KF123456'),
  (4, 'Nissan', 'Altima', 2022, 'MNO345', '1N4AL3AP8NC123456'),
  (5, 'BMW', '320i', 2020, 'PQR678', 'WBA8E1C50LK123456');

-- Insert inventory items
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
  ('Tire (205/55R16)', 'T-010', 8, 2, 95.00),
  ('Motor Oil (5W-30)', 'MO-011', 30, 8, 28.99),
  ('Cabin Air Filter', 'CAF-012', 12, 3, 19.99),
  ('Serpentine Belt', 'SB-013', 6, 2, 35.50),
  ('Radiator Hose', 'RH-014', 4, 1, 42.00),
  ('Fuel Filter', 'FF-015', 8, 2, 22.75);

-- Insert sample work orders
INSERT INTO work_orders (vehicle_id, customer_id, assigned_mechanic, title, description, status, labor_hours, labor_rate) VALUES
  (1, 1, 2, 'Oil Change Service', 'Regular oil change and filter replacement', 'completed', 1.0, 75.00),
  (2, 1, 2, 'Brake Inspection', 'Check brake pads and rotors', 'in_progress', 2.0, 75.00),
  (3, 2, 2, 'Transmission Service', 'Transmission fluid change and inspection', 'pending', 3.0, 75.00),
  (4, 3, 2, 'Battery Replacement', 'Replace old battery with new one', 'completed', 0.5, 75.00),
  (5, 4, 2, 'Tire Rotation', 'Rotate tires and check alignment', 'completed', 1.5, 75.00),
  (6, 5, 2, 'Engine Diagnostic', 'Check engine light diagnostic', 'in_progress', 2.5, 75.00);

-- Insert work order parts
INSERT INTO work_order_parts (work_order_id, inventory_item_id, quantity_used, unit_price) VALUES
  (1, 1, 1, 12.99), -- Oil filter for oil change
  (1, 11, 1, 28.99), -- Motor oil for oil change
  (4, 8, 1, 125.00), -- Battery replacement
  (5, 10, 4, 95.00); -- Tires for rotation

-- Insert sample appointments
INSERT INTO appointments (customer_id, vehicle_id, assigned_mechanic, appointment_date, duration, description, status) VALUES
  (1, 1, 2, CURRENT_DATE + INTERVAL '1 day' + INTERVAL '9 hours', '2 hours', 'Scheduled maintenance check', 'scheduled'),
  (2, 3, 2, CURRENT_DATE + INTERVAL '2 days' + INTERVAL '10 hours', '3 hours', 'Transmission service appointment', 'confirmed'),
  (3, 4, 2, CURRENT_DATE + INTERVAL '3 days' + INTERVAL '14 hours', '1 hour', 'Quick oil change', 'scheduled'),
  (4, 5, 2, CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours', '2 hours', 'Brake inspection', 'confirmed'),
  (5, 6, 2, CURRENT_DATE + INTERVAL '4 days' + INTERVAL '11 hours', '4 hours', 'Engine diagnostic and repair', 'scheduled');

-- Update work order totals (trigger will calculate automatically)
SELECT update_work_order_total(id) FROM work_orders;