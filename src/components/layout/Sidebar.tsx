import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Wrench, 
  Home, 
  Users, 
  Car, 
  Package, 
  Calendar, 
  FileText,
  LogOut 
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard', adminOnly: false },
  { id: 'customers', label: 'Customers', icon: Users, path: '/customers', adminOnly: true },
  { id: 'vehicles', label: 'Vehicles', icon: Car, path: '/vehicles', adminOnly: true },
  { id: 'work-orders', label: 'Work Orders', icon: Wrench, path: '/work-orders', adminOnly: false },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', adminOnly: true },
  { id: 'appointments', label: 'Appointments', icon: Calendar, path: '/appointments', adminOnly: true },
  { id: 'billing', label: 'Billing', icon: FileText, path: '/billing', adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const visibleMenuItems = menuItems.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AutoService</h1>
            <p className="text-sm text-gray-500">Pro</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
      
      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.fullName}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};