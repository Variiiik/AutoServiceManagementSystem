export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: number;
  customer_id: number;
  make: string;
  model: string;
  year?: number;
  license_plate?: string;
  vin?: string;
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'mechanic';
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkOrder {
  id: number;
  vehicle_id: number;
  customer_id: number;
  assigned_mechanic?: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  labor_hours: number;
  labor_rate: number;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  mechanic_name?: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock_level: number;
  price: number;
  created_at?: string;
  updated_at?: string;
  is_low_stock?: boolean;
}

export interface WorkOrderPart {
  id: number;
  work_order_id: number;
  inventory_item_id: number;
  quantity_used: number;
  unit_price: number;
  name?: string;
  sku?: string;
  created_at?: string;
}

export interface Appointment {
  id: number;
  customer_id: number;
  vehicle_id: number;
  assigned_mechanic?: number;
  appointment_date: string;
  duration: string;
  description?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  mechanic_name?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalVehicles: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalInventoryItems: number;
  lowStockItems: number;
  todayAppointments: number;
  totalAppointments: number;
}