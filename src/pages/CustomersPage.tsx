import React, { useState, useEffect, useMemo } from 'react';
import { customersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Customer } from '../types';
import {
  Plus, Search, Pencil as Edit3, Trash2, Phone, Mail, MapPin, X,
  LayoutGrid, List
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- UI BlueCard ---
const BlueCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <div className="p-[1px] rounded-2xl bg-gradient-to-b from-blue-400/40 via-blue-500/20 to-blue-600/10 dark:from-blue-300/25 dark:via-blue-400/15 dark:to-blue-500/10">
    <div
      className={`rounded-2xl bg-white/90 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur ring-1 ring-slate-200/80 dark:ring-slate-700/70 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </div>
  </div>
);

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    return (localStorage.getItem('customerViewMode') as 'cards' | 'list') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('customerViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersAPI.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, formData);
        toast.success('Customer updated successfully');
      } else {
        await customersAPI.create(formData);
        toast.success('Customer created successfully');
      }
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
      fetchCustomers();
    } catch {
      toast.error('Failed to save customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}?`)) return;
    try {
      await customersAPI.delete(customer.id);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch {
      toast.error('Delete failed');
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300"
            title="Toggle view"
          >
            {viewMode === 'cards' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => { setEditingCustomer(null); setFormData({ name: '', phone: '', email: '', address: '' }); setShowModal(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <BlueCard>
        <div className="relative max-w-xl p-4">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, phone, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </BlueCard>

      {/* Content */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No customers found</div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((c) => (
            <BlueCard key={c.id}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(c)} className="text-blue-500 hover:text-blue-700">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(c)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {c.phone && <div className="flex items-center text-gray-700 dark:text-gray-300"><Phone className="h-4 w-4 mr-2 text-blue-500" />{c.phone}</div>}
                  {c.email && <div className="flex items-center text-gray-700 dark:text-gray-300"><Mail className="h-4 w-4 mr-2 text-blue-500" />{c.email}</div>}
                  {c.address && <div className="flex items-center text-gray-700 dark:text-gray-300"><MapPin className="h-4 w-4 mr-2 text-blue-500" />{c.address}</div>}
                </div>
                <p className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  Added {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </BlueCard>
          ))}
        </div>
      ) : (
        <BlueCard>
          <div className="overflow-x-auto rounded-2xl">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Phone</th>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Address</th>
                  {user?.role === 'admin' && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.address || '—'}</td>
                    {user?.role === 'admin' && (
                      <td className="px-4 py-3 text-right flex gap-2 justify-end">
                        <button onClick={() => handleEdit(c)} className="text-blue-500 hover:text-blue-700"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(c)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlueCard>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <BlueCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </h2>
                  <button
                    onClick={() => { setShowModal(false); setEditingCustomer(null); }}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <textarea
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20">
                      {editingCustomer ? 'Update' : 'Add'} Customer
                    </button>
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700">
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
};
