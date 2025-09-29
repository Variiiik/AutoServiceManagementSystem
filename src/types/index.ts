export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year?: number;
  license_plate?: string;
  vin?: string;
  created_at: string;
  customer?: Customer;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'mechanic';
  phone?: string;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  vehicle_id: string;
  customer_id: string;
  assigned_mechanic?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  labor_hours: number;
  labor_rate: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  customer?: Customer;
  mechanic?: UserProfile;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock_level: number;
  price: number;
  created_at: string;
  is_low_stock?: boolean;
}

export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  inventory_item_id: string;
  quantity_used: number;
  unit_price: number;
  inventory_item?: InventoryItem;
}

export interface Appointment {
  id: string;
  customer_id: string;
  vehicle_id: string;
  assigned_mechanic?: string;
  appointment_date: string;
  duration: string;
  description?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  customer?: Customer;
  vehicle?: Vehicle;
  mechanic?: UserProfile;
}