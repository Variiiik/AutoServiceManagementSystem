// src/types/index.ts

// ---------- Core entities (UUID-based) ----------
export interface Customer {
  id: string;                 // UUID
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;                 // UUID
  customer_id: string;        // UUID
  make: string;
  model: string;
  year?: number;
  license_plate?: string;
  vin?: string;
  created_at?: string;
  updated_at?: string;

  // joined fields
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

export interface User {
  id: string;                 // UUID (sinu skeemis users.id on UUID)
  email: string;
  full_name?: string;
  fullName?: string;
  role: 'admin' | 'mechanic';
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

// ---------- Work Orders ----------
export interface WorkOrder {
  id: string;                 // UUID
  vehicle_id: string;         // UUID
  customer_id: string;        // UUID
  assigned_to?: string | null; // UUID (users.id) või null
  title: string;
  description?: string;

  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  // tööaja/labori väljad (skeemis olemas)
  labor_hours: number;        // NUMERIC → number frontis
  labor_rate: number;         // NUMERIC → number frontis
  estimated_hours?: number;
  actual_hours?: number;

  estimated_completion?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;

  // arvutatud/joinditud väljad
  total_amount: number;       // backend arvutab SELECT-is
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  mechanic_name?: string;     // users.full_name
}

// ---------- Inventory ----------
export interface InventoryItem {
  // Kui inventory.id on INT → number; kui UUID → muuda stringiks.
  id: number | string;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock_level: number;
  price: number;              // NUMERIC → number
  created_at?: string;
  updated_at?: string;
  is_low_stock?: boolean;
}

export interface WorkOrderPart {
  id: string;                 // UUID
  work_order_id: string;      // UUID
  inventory_item_id?: string | number | null; // vastavalt sinu inventory ID tüübile
  is_custom?: boolean;
  custom_name?: string | null;
  custom_sku?: string | null;
  quantity_used: number;
  unit_price: number;         // kliendihind
  cost_price?: number | null; // omahind (optional)
  name?: string;              // SELECT COALESCE(...)
  sku?: string;               // SELECT COALESCE(...)
  created_at?: string;
}

// ---------- Appointments ----------
export interface Appointment {
  id: string;                 // UUID
  customer_id: string;        // UUID
  vehicle_id: string;         // UUID
  assigned_to?: string | null; // UUID (users.id) või null

  appointment_date: string;   // ISO kuupäev string
  duration: string;

  description?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

  created_at?: string;
  updated_at?: string;

  // joined fields
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  mechanic_name?: string;

  // vahendobjektid (kui kuskil kasutad)
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  vehicle?: {
    make: string;
    model: string;
    year?: number;
    license_plate?: string;
    vin?: string;
  };
}

// ---------- Dashboard ----------
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
