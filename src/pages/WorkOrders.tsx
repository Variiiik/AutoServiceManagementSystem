import React, { useEffect, useMemo, useState } from 'react';
import { workOrdersAPI, vehiclesAPI, inventoryAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { WorkOrder, Vehicle, User, WorkOrderPart, InventoryItem } from '../types';
import {
  Plus, Search, Pencil as Edit3, Trash2, Eye,
  Clock, CheckCircle, AlertCircle, X, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';

/** Sinakas klaas-stiilis kaart (sama mis Customers/Vehicles) */
const BlueCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <div className="p-[1px] rounded-2xl bg-gradient-to-b from-blue-400/40 via-blue-500/20 to-blue-600/10 dark:from-blue-300/25 dark:via-blue-400/15 dark:to-blue-500/10">
    <div className={`rounded-2xl bg-white/90 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur ring-1 ring-slate-200/80 dark:ring-slate-700/70 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 ${className}`}>
      {children}
    </div>
  </div>
);

export function WorkOrders() {
  const { user } = useAuth();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orderParts, setOrderParts] = useState<WorkOrderPart[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddPartModal, setShowAddPartModal] = useState(false);

  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>('1');
  const [editUnitPrice, setEditUnitPrice] = useState<string>('');
  const [editCostPrice, setEditCostPrice] = useState<string>(''); // oma hind (valikuline)

  const [formData, setFormData] = useState({
    vehicle_id: '',
    title: '',
    description: '',
    assigned_to: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    labor_hours: '',
    labor_rate: '75.00'
  });

  const [addPartForm, setAddPartForm] = useState({
    is_custom: false,
    inventory_item_id: '',
    custom_name: '',
    custom_sku: '',
    quantity_used: '1',
    unit_price: '',
    cost_price: '' // optional
  });

  useEffect(() => { fetchData(); }, []);
  async function fetchData() {
    try {
      setLoading(true);
      const [ordersRes, vehiclesRes, inventoryRes] = await Promise.all([
        workOrdersAPI.getAll(),
        vehiclesAPI.getAll(),
        inventoryAPI.getAll()
      ]);
      setWorkOrders(ordersRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setInventory(inventoryRes.data || []);
      // mechanics võiks tulla usersAPI-st; praegu tühi nimekiri
      setMechanics([]);
    } catch (e) {
      console.error('Error fetching data:', e);
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderParts(orderId: string) {
    try {
      const res = await workOrdersAPI.getParts(orderId as any);
      setOrderParts(res.data || []);
    } catch (e) {
      console.error('Error fetching order parts:', e);
      toast.error('Failed to load order parts');
    }
  }

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return workOrders.filter(order => {
      const matchesSearch =
        order.title.toLowerCase().includes(q) ||
        (order.customer_name || '').toLowerCase().includes(q) ||
        (order.make || '').toLowerCase().includes(q) ||
        (order.model || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesRole = user?.role === 'admin' || order.assigned_mechanic === (user as any)?.id;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [workOrders, searchTerm, statusFilter, user]);

  function canEditOrder(order: WorkOrder) {
    return user?.role === 'admin' || order.assigned_mechanic === (user as any)?.id;
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  }

  function getStatusClasses(status: string) {
    switch (status) {
      case 'pending': return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30 ring-1 ring-yellow-200/60 dark:ring-yellow-800/60';
      case 'in_progress': return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 ring-1 ring-blue-200/60 dark:ring-blue-800/60';
      case 'completed': return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30 ring-1 ring-green-200/60 dark:ring-green-800/60';
      default: return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 ring-1 ring-gray-200/60 dark:ring-gray-700/60';
    }
  }

  // CREATE/UPDATE
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.vehicle_id) { toast.error('Select a vehicle'); return; }
    if (!formData.title.trim()) { toast.error('Title is required'); return; }

    try {
      const payload = {
        vehicle_id: String(formData.vehicle_id),
        customer_id: String(vehicles.find(v => String(v.id) === String(formData.vehicle_id))?.customer_id || ''),
        title: formData.title.trim(),
        description: formData.description || null,
        assigned_to: formData.assigned_to || null,   // UUID või null
        labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : 0,
        labor_rate: formData.labor_rate ? parseFloat(formData.labor_rate) : 0,
        status: formData.status || 'pending',
      };

      if (editingOrder) {
        await workOrdersAPI.update(String(editingOrder.id), payload);
        toast.success('Work order updated');
      } else {
        await workOrdersAPI.create(payload);
        toast.success('Work order created');
      }

      setShowModal(false);
      setEditingOrder(null);
      fetchData();
    } catch (e: any) {
      console.error('Error saving work order:', e);
      const msg = e?.response?.data?.errors?.[0]?.msg || e?.response?.data?.error || 'Failed to save work order';
      toast.error(msg);
    }
  }

  function handleEdit(order: WorkOrder) {
    setEditingOrder(order);
    setFormData({
      vehicle_id: String(order.vehicle_id ?? ''),
      title: order.title,
      description: order.description || '',
      assigned_to: String((order as any).assigned_to ?? order.assigned_mechanic ?? ''),
      status: order.status as any,
      labor_hours: (order.labor_hours ?? 0).toString(),
      labor_rate: (order.labor_rate ?? 0).toString()
    });
    setShowModal(true);
  }

  function handleViewDetails(order: WorkOrder) {
    setSelectedOrder(order);
    fetchOrderParts(order.id as any);
    setShowDetailsModal(true);
  }

  async function handleDelete(order: WorkOrder) {
    if (!window.confirm(`Delete work order "${order.title}"?`)) return;
    try {
      await workOrdersAPI.delete(order.id as any);
      toast.success('Work order deleted');
      fetchData();
    } catch (e) {
      console.error('Error deleting work order:', e);
      toast.error('Delete failed');
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: 'pending' | 'in_progress' | 'completed') {
    try {
      await workOrdersAPI.update((orderId as any), { status: newStatus });
      fetchData();
    } catch (e) {
      console.error('Error updating status:', e);
      toast.error('Status update failed');
    }
  }

  // ADD PART (support inventory/custom + cost price)
  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const selectedItem = inventory.find(i => String(i.id) === addPartForm.inventory_item_id);

      const payload = {
        is_custom: addPartForm.is_custom,
        inventory_item_id: addPartForm.is_custom ? null : (addPartForm.inventory_item_id || null),
        custom_name: addPartForm.is_custom ? (addPartForm.custom_name || '') : null,
        custom_sku: addPartForm.is_custom ? (addPartForm.custom_sku || null) : null,
        quantity_used: parseFloat(addPartForm.quantity_used || '0'),
        unit_price: parseFloat(
          addPartForm.unit_price ||
          (selectedItem?.price != null ? String(selectedItem.price) : '0')
        ),
        cost_price: addPartForm.cost_price ? parseFloat(addPartForm.cost_price) : null
      };

      if (!payload.is_custom && !payload.inventory_item_id) {
        toast.error('Select inventory item or switch to custom');
        return;
      }
      if (payload.is_custom && !payload.custom_name) {
        toast.error('Custom name is required');
        return;
      }

      await workOrdersAPI.addPart(String(selectedOrder.id), payload);
      toast.success('Part added');

      setShowAddPartModal(false);
      setAddPartForm({
        is_custom: false,
        inventory_item_id: '',
        custom_name: '',
        custom_sku: '',
        quantity_used: '1',
        unit_price: '',
        cost_price: ''
      });

      await fetchOrderParts(String(selectedOrder.id));
      await fetchData();
    } catch (e) {
      console.error('Error adding part:', e);
      toast.error('Failed to add part');
    }
  }

  async function savePartEdit(part: WorkOrderPart) {
  if (!selectedOrder || !editingPartId) return;
  try {
    const payload: any = {};
    if (editQty !== '') payload.quantity_used = parseInt(editQty, 10);
    if (editUnitPrice !== '') payload.unit_price = parseFloat(editUnitPrice);
    if (editCostPrice !== '') payload.cost_price = parseFloat(editCostPrice);

    await workOrdersAPI.updatePart(String(selectedOrder.id), String(part.id), payload);
    toast.success('Part updated');
    setEditingPartId(null);
    await fetchOrderParts(String(selectedOrder.id));
    await fetchData();
  } catch (e) {
    console.error(e);
    toast.error('Failed to update part');
  }
}

async function deletePart(part: WorkOrderPart) {
  if (!selectedOrder) return;
  if (!window.confirm('Delete this part?')) return;
  try {
    await workOrdersAPI.deletePart(String(selectedOrder.id), String(part.id));
    toast.success('Part deleted');
    await fetchOrderParts(String(selectedOrder.id));
    await fetchData();
  } catch (e) {
    console.error(e);
    toast.error('Failed to delete part');
  }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Väike kokkuvõtte riba
  const totalCount = filteredOrders.length;
  const pendingCount = filteredOrders.filter(o => o.status === 'pending').length;
  const inProgressCount = filteredOrders.filter(o => o.status === 'in_progress').length;
  const completedCount = filteredOrders.filter(o => o.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work Orders</h1>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => { setShowModal(true); setEditingOrder(null); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Work Order</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <BlueCard>
        <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by title, customer, vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-48"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-2 md:ml-auto">
            <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 ring-1 ring-gray-200/60 dark:ring-gray-700/60">Total {totalCount}</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30 ring-1 ring-yellow-200/60 dark:ring-yellow-800/60">Pending {pendingCount}</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 ring-1 ring-blue-200/60 dark:ring-blue-800/60">In progress {inProgressCount}</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30 ring-1 ring-green-200/60 dark:ring-green-800/60">Completed {completedCount}</span>
          </div>
        </div>
      </BlueCard>

      {/* Table */}
      <BlueCard>
        <div className="overflow-x-auto rounded-2xl">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Work Order</th>
                <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Customer & Vehicle</th>
                <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Assigned</th>
                <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id as any} className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{order.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 dark:text-gray-100">{order.customer_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(order.year ? `${order.year} ` : '') + (order.make || '') + ' ' + (order.model || '')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status.replace('_', ' ')}</span>
                    </div>
                    {canEditOrder(order) && (
                      <div className="mt-2">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id as any, e.target.value as any)}
                          className="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {order.mechanic_name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {typeof order.total_amount === 'number' ? `${order.total_amount.toFixed(2)} EUR` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="p-2 rounded-lg text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEditOrder(order) && (
                        <button
                          onClick={() => handleEdit(order)}
                          className="p-2 rounded-lg text-yellow-600 dark:text-yellow-300 hover:text-yellow-700 dark:hover:text-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                          title="Edit order"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(order)}
                          className="p-2 rounded-lg text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No work orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </BlueCard>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <BlueCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingOrder ? 'Edit Work Order' : 'Create Work Order'}
                  </h2>
                  <button
                    onClick={() => { setShowModal(false); setEditingOrder(null); }}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle *</label>
                    <select
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id as any} value={String(v.id)}>
                          {v.customer_name} — {(v.year ? `${v.year} ` : '') + (v.make || '') + ' ' + (v.model || '')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Mechanic</label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a mechanic</option>
                      {mechanics.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {(m as any).full_name || (m as any).fullName || m.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Labor Hours</label>
                      <input
                        type="number" step="0.5" min="0"
                        value={formData.labor_hours}
                        onChange={(e) => setFormData({ ...formData, labor_hours: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Labor Rate (EUR)</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={formData.labor_rate}
                        onChange={(e) => setFormData({ ...formData, labor_rate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20">
                      {editingOrder ? 'Update' : 'Create'} Work Order
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingOrder(null);
                        setFormData({
                          vehicle_id: '',
                          title: '',
                          description: '',
                          assigned_to: '',
                          status: 'pending',
                          labor_hours: '',
                          labor_rate: '75.00'
                        });
                      }}
                      className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </BlueCard>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <BlueCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Work Order Details</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {(selectedOrder.year ? `${selectedOrder.year} ` : '') + (selectedOrder.make || '') + ' ' + (selectedOrder.model || '')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedOrder.description || 'No description'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(selectedOrder.status)}`}>
                        {getStatusIcon(selectedOrder.status)}
                        <span className="capitalize">{selectedOrder.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Mechanic</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedOrder.mechanic_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Totals</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                        {typeof selectedOrder.total_amount === 'number' ? `${selectedOrder.total_amount.toFixed(2)} EUR` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Parts */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parts Used</h3>
                    {orderParts.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No parts added</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100">Part</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100">Qty</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100">Unit Price</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100">Total</th>
                            </tr>
                          </thead>
                            <tbody>
                              {orderParts.map((p) => {
                                const isEditing = editingPartId === String(p.id);
                                return (
                                  <tr key={String(p.id)} className="border-b border-gray-200 dark:border-gray-800">
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                      {(p as any).name || (p as any).custom_name || 'Part'}
                                      {(p as any).custom_sku ? <span className="ml-2 text-xs text-gray-500">({(p as any).custom_sku})</span> : null}
                                    </td>

                                    {/* Qty */}
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          min="1"
                                          value={editQty}
                                          onChange={(e) => setEditQty(e.target.value)}
                                          className="w-20 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                        />
                                      ) : (
                                        p.quantity_used
                                      )}
                                    </td>

                                    {/* Unit price */}
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={editUnitPrice}
                                          onChange={(e) => setEditUnitPrice(e.target.value)}
                                          className="w-24 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                        />
                                      ) : (
                                        `${Number(p.unit_price).toFixed(2)} EUR`
                                      )}
                                    </td>

                                    {/* Total */}
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                      {(p.quantity_used * Number(p.unit_price)).toFixed(2)} EUR
                                    </td>

                                    {/* Actions + (valikuline) oma hind */}
                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                      {isEditing ? (
                                        <div className="flex items-center gap-2 justify-end">
                                          {/* (valikuline) oma hind sisestus */}
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="Cost"
                                            value={editCostPrice}
                                            onChange={(e) => setEditCostPrice(e.target.value)}
                                            className="w-24 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                            title="Own cost (optional)"
                                          />
                                          <button
                                            onClick={() => savePartEdit(p)}
                                            className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingPartId(null)}
                                            className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 justify-end">
                                          {canEditOrder(selectedOrder!) && selectedOrder!.status !== 'completed' && (
                                            <>
                                              <button
                                                onClick={() => {
                                                  setEditingPartId(String(p.id));
                                                  setEditQty(String(p.quantity_used));
                                                  setEditUnitPrice(String(p.unit_price));
                                                  setEditCostPrice((p as any).cost_price != null ? String((p as any).cost_price) : '');
                                                }}
                                                className="px-3 py-1 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-sm"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={() => deletePart(p)}
                                                className="px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 text-sm"
                                              >
                                                Delete
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                        </table>
                      </div>
                    )}

                    {canEditOrder(selectedOrder) && selectedOrder.status !== 'completed' && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowAddPartModal(true)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm inline-flex items-center gap-1 shadow shadow-green-500/20"
                        >
                          <Plus className="h-4 w-4" /> Add Part
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </BlueCard>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddPartModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <BlueCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Part to Work Order</h2>
                  <button
                    onClick={() => {
                      setShowAddPartModal(false);
                      setAddPartForm({
                        is_custom: false,
                        inventory_item_id: '',
                        custom_name: '',
                        custom_sku: '',
                        quantity_used: '1',
                        unit_price: '',
                        cost_price: ''
                      });
                    }}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleAddPart} className="space-y-4">
                  {/* Custom toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      id="is_custom"
                      type="checkbox"
                      checked={addPartForm.is_custom}
                      onChange={(e) =>
                        setAddPartForm(f => ({
                          ...f,
                          is_custom: e.target.checked,
                          // reset teisele režiimile minnes
                          inventory_item_id: '',
                          unit_price: '',
                          custom_name: '',
                          custom_sku: ''
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="is_custom" className="text-sm text-gray-700 dark:text-gray-300">
                      Custom part
                    </label>
                  </div>

                  {/* inventory / custom fields */}
                  {!addPartForm.is_custom ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Part *
                      </label>
                      <select
                        value={addPartForm.inventory_item_id}
                        onChange={(e) => {
                          const v = e.target.value;
                          const sel = inventory.find(i => String(i.id) === v);
                          setAddPartForm(f => ({
                            ...f,
                            inventory_item_id: v,
                            unit_price: sel?.price != null ? String(sel.price) : f.unit_price
                          }));
                        }}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a part</option>
                        {inventory.filter(i => (i as any).stock_quantity > 0).map(item => (
                          <option key={String(item.id)} value={String(item.id)}>
                            {item.name} — {(item.price ?? 0).toFixed(2)} EUR ({(item as any).stock_quantity} in stock)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Custom name *
                        </label>
                        <input
                          type="text"
                          value={addPartForm.custom_name}
                          onChange={(e)=> setAddPartForm(f => ({ ...f, custom_name: e.target.value }))}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Special bracket"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Custom SKU
                        </label>
                        <input
                          type="text"
                          value={addPartForm.custom_sku}
                          onChange={(e)=> setAddPartForm(f => ({ ...f, custom_sku: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. BRKT-001"
                        />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number" min="0.01" step="0.01"
                        value={addPartForm.quantity_used}
                        onChange={(e) => setAddPartForm({ ...addPartForm, quantity_used: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Client price (unit) *
                      </label>
                      <input
                        type="number" step="0.01" min="0"
                        value={addPartForm.unit_price}
                        onChange={(e) => setAddPartForm({ ...addPartForm, unit_price: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 39.90"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cost price (unit)
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      value={addPartForm.cost_price}
                      onChange={(e) => setAddPartForm({ ...addPartForm, cost_price: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="optional"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 shadow-md shadow-green-500/20">
                      Add Part
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPartModal(false);
                        setAddPartForm({
                          is_custom: false,
                          inventory_item_id: '',
                          custom_name: '',
                          custom_sku: '',
                          quantity_used: '1',
                          unit_price: '',
                          cost_price: ''
                        });
                      }}
                      className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </BlueCard>
          </div>
        </div>
      )}
    </div>
  );
}
