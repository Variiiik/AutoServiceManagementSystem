/*
  # Add assigned_mechanic columns

  1. New Columns
    - Add `assigned_mechanic` to `work_orders` table
    - Add `assigned_mechanic` to `appointments` table
    - Both columns reference `users(id)` table

  2. Updates
    - Update existing records to assign to default mechanic
*/

-- Add assigned_mechanic column to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS assigned_mechanic INTEGER REFERENCES users(id);

-- Add assigned_mechanic column to appointments table  
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS assigned_mechanic INTEGER REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_mechanic ON work_orders(assigned_mechanic);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_mechanic ON appointments(assigned_mechanic);

-- Update existing work orders to assign to first mechanic
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