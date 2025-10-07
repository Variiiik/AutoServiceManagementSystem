import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, Eye, EyeOff, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'mechanic' as 'admin' | 'mechanic',
    phone: ''
  });

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br from-blue-50 via-white to-gray-50
        dark:from-gray-950 dark:via-gray-900 dark:to-gray-900
        flex items-center justify-center p-4
        transition-colors
      "
    >
      <div className="max-w-md w-full">
        <div
          className="
            bg-white dark:bg-gray-900
            rounded-2xl shadow-xl
            border border-gray-100 dark:border-gray-800
            p-8 transition-colors
          "
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Wrench className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AutoService Pro</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

        
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="
                    w-full px-4 py-3 rounded-lg
                    border border-gray-300 dark:border-gray-700
                    bg-white dark:bg-gray-800
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-colors
                  "
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="
                  w-full px-4 py-3 rounded-lg
                  border border-gray-300 dark:border-gray-700
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  transition-colors
                "
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="
                    w-full px-4 py-3 pr-12 rounded-lg
                    border border-gray-300 dark:border-gray-700
                    bg-white dark:bg-gray-800
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-colors
                  "
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2
                    text-gray-500 hover:text-gray-700
                    dark:text-gray-400 dark:hover:text-gray-200
                  "
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="
                      w-full px-4 py-3 rounded-lg
                      border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-800
                      text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      transition-colors
                    "
                  >
                    <option value="mechanic">Mechanic</option>
                    <option value="admin">Admin/Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="
                      w-full px-4 py-3 rounded-lg
                      border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-800
                      text-gray-900 dark:text-gray-100
                      placeholder:text-gray-400 dark:placeholder:text-gray-500
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      transition-colors
                    "
                    placeholder="Enter your phone number"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full bg-blue-600 hover:bg-blue-700
                text-white py-3 px-4 rounded-lg
                focus:ring-2 focus:ring-blue-500
                focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors font-medium
                flex items-center justify-center
              "
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {isLogin
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
