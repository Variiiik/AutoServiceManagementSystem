import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Car, 
  Wrench, 
  Package, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(res => res.data),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => dashboardAPI.getRecentOrders().then(res => res.data),
    retry: 1,
    onError: (error) => {
      console.error('Error fetching recent orders:', error);
    }
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => dashboardAPI.getTodayAppointments().then(res => res.data),
    retry: 1,
    onError: (error) => {
      console.error('Error fetching today appointments:', error);
    }
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => dashboardAPI.getLowStock().then(res => res.data),
    retry: 1,
    onError: (error) => {
      console.error('Error fetching low stock items:', error);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.fullName}!
        </h1>
        <p className="text-blue-100">
          Here's what's happening in your auto service shop today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Car className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vehicles</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalVehicles || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Wrench className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {(stats?.pendingOrders || 0) + (stats?.inProgressOrders || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.todayAppointments || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Work Orders Overview & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Orders Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Work Orders</h3>
            <Wrench className="h-5 w-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="font-semibold text-yellow-600">{stats?.pendingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-sm text-gray-600">In Progress</span>
              </div>
              <span className="font-semibold text-blue-600">{stats?.inProgressOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <span className="font-semibold text-green-600">{stats?.completedOrders || 0}</span>
            </div>
          </div>
        </div>

        {/* Inventory Alert */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Status</h3>
            <Package className="h-5 w-5 text-gray-500" />
          </div>
          {(stats?.lowStockItems || 0) > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center text-red-600">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{stats?.lowStockItems} items low in stock</span>
              </div>
              {lowStockItems?.slice(0, 3).map((item: any) => (
                <div key={item.id} className="text-sm text-gray-600">
                  {item.name} - {item.stock_quantity} left
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">All items in stock</span>
            </div>
          )}
        </div>

        {/* Performance */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
            <TrendingUp className="h-5 w-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="font-semibold">
                {stats && (stats.completedOrders + stats.inProgressOrders + stats.pendingOrders) > 0
                  ? Math.round((stats.completedOrders / (stats.completedOrders + stats.inProgressOrders + stats.pendingOrders)) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active Orders</span>
              <span className="font-semibold">{stats?.inProgressOrders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Today's Schedule</span>
              <span className="font-semibold">{stats?.todayAppointments || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Work Orders</h3>
          </div>
          <div className="p-6">
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{order.title}</p>
                      <p className="text-sm text-gray-600">
                        {order.customer_name} - {order.make} {order.model}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent work orders</p>
            )}
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
          </div>
          <div className="p-6">
            {todayAppointments && todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.slice(0, 5).map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {new Date(appointment.appointment_date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appointment.customer_name} - {appointment.make} {appointment.model}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No appointments today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};