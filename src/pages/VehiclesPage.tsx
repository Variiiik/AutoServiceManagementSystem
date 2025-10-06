import React, { useEffect, useMemo, useState } from 'react';
import { vehiclesAPI, customersAPI, normalizePlate } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle, Customer } from '../types';
import {
  Plus, Search, Pencil as Edit3, Trash2, Car,
  LayoutGrid, List as ListIcon, X
} from 'lucide-react';
import toast from 'react-hot-toast';

/** Sinakas klaaskaart (sama esteetika mis Customers/Dashboard) */
const BlueCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <div className="p-[1px] rounded-2xl bg-gradient-to-b from-blue-400/40 via-blue-500/20 to-blue-600/10 dark:from-blue-300/25 dark:via-blue-400/15 dark:to-blue-500/10">
    <div className={`rounded-2xl bg-white/90 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur ring-1 ring-slate-200/80 dark:ring-slate-700/70 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 ${className}`}>
      {children}
    </div>
  </div>
);

export const VehiclesPage: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<{
    customer_id: string;
    make: string;
    model: string;
    year: string;
    license_plate: string;
    vin: string;
  }>({
    customer_id: '',
    make: '',
    model: '',
    year: '',
    license_plate: '',
    vin: ''
  });

  // default "list" + mäletab valikut
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('vehicleViewMode') as 'list' | 'cards') || 'list';
  });
  useEffect(() => { localStorage.setItem('vehicleViewMode', viewMode); }, [viewMode]);

  useEffect(() => { fetchData(); }, []);
  async function fetchData() {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([vehiclesAPI.getAll(), customersAPI.getAll()]);
      setVehicles(vRes.data || []);
      setCustomers(cRes.data || []);
    } catch (e) {
      console.error('Error fetching data:', e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Jäta UUID stringiks; ära parseInt’i tee
      const payload = {
        customer_id: formData.customer_id || null,
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: formData.year ? parseInt(formData.year, 10) : null,
        license_plate: normalizePlate(formData.license_plate || ''),
        vin: formData.vin?.trim() || null,
      };

      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle.id, payload);
        toast.success('Vehicle updated successfully');
      } else {
        await vehiclesAPI.create(payload);
        toast.success('Vehicle created successfully');
      }

      setShowModal(false);
      setEditingVehicle(null);
      setFormData({ customer_id: '', make: '', model: '', year: '', license_plate: '', vin: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error((error as Error)?.message || 'Failed to save vehicle');
    }
  }

  function handleEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setFormData({
      customer_id: String(vehicle.customer_id || ''), // UUID string
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year ? String(vehicle.year) : '',
      license_plate: vehicle.license_plate || '',
      vin: vehicle.vin || ''
    });
    setShowModal(true);
  }

  async function handleDelete(vehicle: Vehicle) {
    const label = `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim();
    if (!window.confirm(`Are you sure you want to delete ${label}?`)) return;
    try {
      await vehiclesAPI.delete(vehicle.id);
      toast.success('Vehicle deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v =>
      (v.make || '').toLowerCase().includes(q) ||
      (v.model || '').toLowerCase().includes(q) ||
      (v.license_plate || '').toLowerCase().includes(q) ||
      (v.vin || '').toLowerCase().includes(q) ||
      (v.customer_name || '').toLowerCase().includes(q)
    );
  }, [vehicles, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehicles</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'cards' : 'list')}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300"
            title="Toggle view"
          >
            {viewMode === 'list' ? <LayoutGrid className="h-5 w-5" /> : <ListIcon className="h-5 w-5" />}
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => { setShowModal(true); setEditingVehicle(null); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Vehicle</span>
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
            placeholder="Search by make, model, plate, VIN, owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </BlueCard>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No vehicles found</div>
      ) : viewMode === 'list' ? (
        <BlueCard>
          <div className="overflow-x-auto rounded-2xl">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Vehicle</th>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Owner</th>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">License</th>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">VIN</th>
                  <th className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">Added</th>
                  {user?.role === 'admin' && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {(v.year ? `${v.year} ` : '') + (v.make || '') + ' ' + (v.model || '')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v.license_plate || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v.vin || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEdit(v)} className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(v)} className="text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlueCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((vehicle) => (
            <BlueCard key={vehicle.id}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <Car className="h-6 w-6 text-blue-600 dark:text-blue-300 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model}
                    </h3>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(vehicle)} className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(vehicle)} className="text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Owner: </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{vehicle.customer_name || '—'}</span>
                  </div>
                  {vehicle.license_plate && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">License: </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{vehicle.license_plate}</span>
                    </div>
                  )}
                  {vehicle.vin && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">VIN: </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">{vehicle.vin}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Added {vehicle.created_at ? new Date(vehicle.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </BlueCard>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <BlueCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <button
                    onClick={() => { setShowModal(false); setEditingVehicle(null); }}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer *</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Make *</label>
                      <input
                        type="text"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model *</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Plate</label>
                    <input
                      type="text"
                      value={formData.license_plate}
                      onChange={(e) => setFormData({ ...formData, license_plate: normalizePlate(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VIN</label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20">
                      {editingVehicle ? 'Update' : 'Add'} Vehicle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingVehicle(null);
                        setFormData({ customer_id: '', make: '', model: '', year: '', license_plate: '', vin: '' });
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
};
