-- Fix All Database Issues for PostgreSQL
-- This migration will fix all the database structure problems

-- First, check and add missing columns
DO $$
BEGIN
  -- Add assigned_mechanic column to work_orders if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'assigned_mechanic'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN assigned_mechanic INTEGER REFERENCES users(id);
    CREATE INDEX idx_work_orders_assigned_mechanic ON work_orders(assigned_mechanic);
    RAISE NOTICE 'Added assigned_mechanic column to work_orders';
  END IF;

  -- Add assigned_mechanic column to appointments if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'assigned_mechanic'
  ) THEN
    ALTER TABLE appointments ADD COLUMN assigned_mechanic INTEGER REFERENCES users(id);
    CREATE INDEX idx_appointments_assigned_mechanic ON appointments(assigned_mechanic);
    RAISE NOTICE 'Added assigned_mechanic column to appointments';
  END IF;
END $$;

-- Update existing records to assign them to the first mechanic
DO $$
DECLARE
  mechanic_id INTEGER;
BEGIN
  -- Get the first mechanic user ID
  SELECT id INTO mechanic_id FROM users WHERE role = 'mechanic' LIMIT 1;
  
  IF mechanic_id IS NOT NULL THEN
    -- Update existing work orders
    UPDATE work_orders 
    SET assigned_mechanic = mechanic_id 
    WHERE assigned_mechanic IS NULL;
    
    -- Update existing appointments
    UPDATE appointments 
    SET assigned_mechanic = mechanic_id 
    WHERE assigned_mechanic IS NULL;
    
    RAISE NOTICE 'Updated records with mechanic ID: %', mechanic_id;
  ELSE
    RAISE NOTICE 'No mechanic found to assign to existing records';
  END IF;
END $$;

-- Ensure all tables have proper structure
-- Fix any data type inconsistencies

-- Make sure inventory table name is correct
DO $$
BEGIN
  -- Check if inventory_items table exists, if not rename inventory
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
      ALTER TABLE inventory RENAME TO inventory_items;
      RAISE NOTICE 'Renamed inventory table to inventory_items';
    END IF;
  END IF;
END $$;

-- Update work order totals for all existing orders
SELECT update_work_order_total(id) FROM work_orders WHERE id IS NOT NULL;

RAISE NOTICE 'Database structure fixes completed successfully';