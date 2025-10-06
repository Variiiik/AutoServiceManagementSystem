import React, { useEffect, useState } from 'react';
import { User, Lock, Users, Shield, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'users' | 'roles' | 'theme'>('profile');
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Settings</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <User className="h-4 w-4" /> User Info
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            activeTab === 'password'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Lock className="h-4 w-4" /> Password
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="h-4 w-4" /> Users
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                activeTab === 'roles'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Shield className="h-4 w-4" /> Roles
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            activeTab === 'theme'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Palette className="h-4 w-4" /> Theme
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6">
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">User Info</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Name: {user?.fullName}</p>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Email: {user?.email}</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit Info</button>
          </div>
        )}

        {activeTab === 'password' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Change Password</h2>
            <p className="text-gray-700 dark:text-gray-300">Form for changing password...</p>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">User Management</h2>
            <p className="text-gray-700 dark:text-gray-300">List and edit users here...</p>
          </div>
        )}

        {activeTab === 'roles' && isAdmin && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Roles & Permissions</h2>
            <p className="text-gray-700 dark:text-gray-300">Manage role permissions...</p>
          </div>
        )}

        {activeTab === 'theme' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Theme Settings</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDark(false)}
                className={`px-4 py-2 rounded-lg border ${!dark
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}
              >
                Light
              </button>
              <button
                onClick={() => setDark(true)}
                className={`px-4 py-2 rounded-lg border ${dark
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}
              >
                Dark
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
