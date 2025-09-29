import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Wrench, Users, Car, Package, Calendar, FileText, LogOut, Home } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, admin: false },
    { id: 'customers', label: 'Customers', icon: Users, admin: true },
    { id: 'vehicles', label: 'Vehicles', icon: Car, admin: true },
    { id: 'work-orders', label: 'Work Orders', icon: Wrench, admin: false },
    { id: 'inventory', label: 'Inventory', icon: Package, admin: true },
    { id: 'appointments', label: 'Appointments', icon: Calendar, admin: true },
    { id: 'billing', label: 'Billing', icon: FileText, admin: true },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    !item.admin || profile?.role === 'admin'
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2">
            <Wrench className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">AutoService Pro</h1>
          </div>
        </div>
        
        <nav className="mt-6">
          <div className="px-3">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center px-3 py-3 text-left rounded-lg mb-1 transition-colors ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}