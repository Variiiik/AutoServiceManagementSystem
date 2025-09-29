import React, { useState, useEffect } from 'react';
import { workOrdersAPI, vehiclesAPI, inventoryAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { WorkOrder, Vehicle, User, WorkOrderPart, InventoryItem } from '../types';
import { Plus, Search, Edit3, Trash2, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export function WorkOrders() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [orderParts, setOrderParts] = useState<WorkOrderPart[]>([]);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    title: '',
    description: '',
    assigned_mechanic: '',
    status: 'pending' as const,
    labor_hours: '',
    labor_rate: '75.00'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersResponse, vehiclesResponse, inventoryResponse] = await Promise.all([
        workOrdersAPI.getAll(),
        vehiclesAPI.getAll(),
        inventoryAPI.getAll()
      ]);

      setWorkOrders(ordersResponse.data);
      setVehicles(vehiclesResponse.data);
      setInventory(inventoryResponse.data);
      // For now, we'll use an empty array for mechanics - this would come from a users API
      setMechanics([]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderParts = async (orderId: string) => {
    try {
      const response = await workOrdersAPI.getParts(parseInt(orderId));
      setOrderParts(response.data);
    } catch (error) {
      console.error('Error fetching order parts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const orderData = {
        ...formData,
        customer_id: vehicles.find(v => v.id.toString() === formData.vehicle_id)?.customer_id,
        labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : 0,
        labor_rate: parseFloat(formData.labor_rate)
      };

      if (editingOrder) {
        await workOrdersAPI.update(editingOrder.id, orderData);
      } else {
        await workOrdersAPI.create(orderData);
      }
      
      setShowModal(false);
      setEditingOrder(null);
      setFormData({
        vehicle_id: '',
        title: '',
        description: '',
        assigned_mechanic: '',
        status: 'pending',
        labor_hours: '',
        labor_rate: '75.00'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving work order:', error);
    }
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setFormData({
      vehicle_id: order.vehicle_id,
      title: order.title,
      description: order.description || '',
      assigned_mechanic: order.assigned_mechanic || '',
      status: order.status,
      labor_hours: order.labor_hours.toString(),
      labor_rate: order.labor_rate.toString()
    });
    setShowModal(true);
  };

  const handleViewDetails = (order: WorkOrder) => {
    setSelectedOrder(order);
    fetchOrderParts(order.id);
    setShowDetailsModal(true);
  };

  const handleDelete = async (order: WorkOrder) => {
    if (window.confirm(`Are you sure you want to delete work order "${order.title}"?`)) {
      try {
        await workOrdersAPI.delete(order.id);
        fetchData();
      } catch (error) {
        console.error('Error deleting work order:', error);
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      await workOrdersAPI.update(parseInt(orderId), { status: newStatus });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const canEditOrder = (order: WorkOrder) => {
    return user?.role === 'admin' || order.assigned_mechanic === user?.id;
  };

  const filteredOrders = workOrders
    .filter(order => {
      const matchesSearch = 
        order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      const matchesRole = user?.role === 'admin' || order.assigned_mechanic === user?.id;
      
      return matchesSearch && matchesStatus && matchesRole;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Work Order</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Work Orders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer & Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.title}</div>
                      <div className="text-sm text-gray-500">
                        Created {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                      <div className="text-sm text-gray-500">
                        {order.year} {order.make} {order.model}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                        disabled={!canEditOrder(order)}
                        className={`text-sm rounded-full px-3 py-1 font-medium flex items-center border-0 ${getStatusColor(order.status)} ${
                          canEditOrder(order) ? 'cursor-pointer' : 'cursor-not-allowed'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.mechanic_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEditOrder(order) && (
                        <button
                          onClick={() => handleEdit(order)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(order)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No work orders found</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingOrder ? 'Edit Work Order' : 'Create Work Order'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle *
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.customer_name} - {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Mechanic
                </label>
                <select
                  value={formData.assigned_mechanic}
                  onChange={(e) => setFormData({ ...formData, assigned_mechanic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a mechanic</option>
                  {mechanics.map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.full_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Labor Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.labor_hours}
                    onChange={(e) => setFormData({ ...formData, labor_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Labor Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.labor_rate}
                    onChange={(e) => setFormData({ ...formData, labor_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
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
                      assigned_mechanic: '',
                      status: 'pending',
                      labor_hours: '',
                      labor_rate: '75.00'
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Work Order Details</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Customer</h3>
                  <p className="text-sm text-gray-900">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Vehicle</h3>
                  <p className="text-sm text-gray-900">
                    {selectedOrder.year} {selectedOrder.make} {selectedOrder.model}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700">Description</h3>
                <p className="text-sm text-gray-900">{selectedOrder.description || 'No description'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Status</h3>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Assigned Mechanic</h3>
                  <p className="text-sm text-gray-900">{selectedOrder.mechanic_name || 'Unassigned'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Labor Hours</h3>
                  <p className="text-sm text-gray-900">{selectedOrder.labor_hours}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Labor Rate</h3>
                  <p className="text-sm text-gray-900">${selectedOrder.labor_rate}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Total Amount</h3>
                  <p className="text-sm text-gray-900 font-semibold">${selectedOrder.total_amount.toFixed(2)}</p>
                </div>
              </div>
              
              {orderParts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Parts Used</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900">{part.name}</td>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orderParts.map((part) => (
                          <tr key={part.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{part.inventory_item?.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{part.quantity_used}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">${part.unit_price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">${(part.quantity_used * part.unit_price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}