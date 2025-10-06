import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/vehicles': 'Vehicles',
  '/work-orders': 'Work Orders',
  '/inventory': 'Inventory',
  '/appointments': 'Appointments',
  '/billing': 'Billing & Invoices',
  '/settings': 'Settings',
};

export const Header: React.FC = () => {
  const location = useLocation();
  const currentPageName = pageNames[location.pathname] || 'AutoService Pro';

  return (
    <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* Left: Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currentPageName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Right: Search + Notifications */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         placeholder-gray-400 dark:placeholder-gray-500
                         transition-colors duration-300"
            />
          </div>

          {/* Notifications */}
          <button
            className="p-2 rounded-lg relative transition-colors
                       text-gray-500 hover:text-gray-700 hover:bg-gray-100
                       dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
};
