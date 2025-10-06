import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Wrench, Users, Car, Package, Calendar, FileText, LogOut, Home, Settings,
  User as UserIcon, Shield, Palette, Lock
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

/** Väike teema-toggli helper ilma eraldi hookita */
function useThemeClass() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return { dark, setDark };
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { dark, setDark } = useThemeClass();
  const [settingsOpen, setSettingsOpen] = useState(true);

  const handleSignOut = async () => {
    signOut();
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

  const visibleMenuItems = menuItems.filter(item => !item.admin || user?.role === 'admin');

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-lg border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Brand */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <Wrench className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">AutoService Pro</h1>
          </div>
        </div>

        {/* Main nav */}
        <nav className="mt-4 flex-1 overflow-auto">
          <div className="px-3">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={[
                    "w-full flex items-center px-3 py-3 text-left rounded-lg mb-1 transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-500"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom: Settings */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          {/* User summary */}
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
          </div>

          {/* Settings collapsible */}
          <div className="px-3 pb-4">
            <button
              onClick={() => setSettingsOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                         text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="inline-flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{settingsOpen ? 'Hide' : 'Show'}</span>
            </button>

            {settingsOpen && (
              <div className="mt-2 space-y-1">
                {/* User management (self) */}
                <button
                  onClick={() => onPageChange('settings-profile')}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Edit your name & email"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  User profile
                </button>

                <button
                  onClick={() => onPageChange('settings-password')}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Change your password"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change password
                </button>

                {/* Admin-only area */}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => onPageChange('admin-users')}
                      className="w-full flex items-center px-3 py-2 rounded-lg text-sm
                                 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="Manage users"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Users
                    </button>

                    <button
                      onClick={() => onPageChange('admin-roles')}
                      className="w-full flex items-center px-3 py-2 rounded-lg text-sm
                                 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="Roles & permissions"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Roles & permissions
                    </button>
                  </>
                )}

                {/* Theme switch (works immediately) */}
                <div className="mt-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Palette className="h-4 w-4" /> Theme
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDark(false)}
                        className={`px-2 py-1 text-xs rounded border
                                   ${!dark
                                     ? 'bg-white dark:bg-gray-700 border-blue-500 text-blue-600 dark:text-blue-300'
                                     : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                   }`}
                      >
                        Light
                      </button>
                      <button
                        onClick={() => setDark(true)}
                        className={`px-2 py-1 text-xs rounded border
                                   ${dark
                                     ? 'bg-white dark:bg-gray-700 border-blue-500 text-blue-600 dark:text-blue-300'
                                     : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                   }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="w-full mt-2 flex items-center justify-between px-3 py-2 rounded-lg text-sm
                             text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
