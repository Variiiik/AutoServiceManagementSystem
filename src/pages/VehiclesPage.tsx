import React, { useState, useEffect } from 'react';
import { vehiclesAPI, customersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle, Customer } from '../types';
import { Plus, Search, CreditCard as Edit3, Trash2, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import { normalizePlate } from '../lib/api';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesResponse, customersResponse] = await Promise.all([
        vehiclesAPI.getAll(),
        customersAPI.getAll()
      ]);
      setVehicles(vehiclesResponse.data);
      setCustomers(customersResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ÄRA PARSEINTI UUID-d! Jäta customer_id stringiks.
      const vehicleData = {
        customer_id: formData.customer_id || null, // UUID string
        make: formData.make?.trim(),
        model: formData.model?.trim(),
        year: formData.year ? parseInt(formData.year, 10) : null,
        license_plate: normalizePlate(formData.license_plate || ''),
        vin: formData.vin?.trim() || null,
      };

      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle.id, vehicleData);
        toast.success('Vehicle updated successfully');
      } else {
        await vehiclesAPI.create(vehicleData);
        toast.success('Vehicle created successfully');
      }

      setShowModal(false);
      setEditingVehicle(null);
      setFormData({
        customer_id: '',
        make: '',
        model: '',
        year: '',
        license_plate: '',
        vin: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error((error as Error)?.message || 'Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      customer_id: String(vehicle.customer_id || ''), // UUID jääb stringiks
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year ? String(vehicle.year) : '',
      license_plate: vehicle.license_plate || '',
      vin: vehicle.vin || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    const vehicleLabel = `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim();
    if (window.confirm(`Are you sure you want to delete ${vehicleLabel}?`)) {
      try {
        await vehiclesAPI.delete(vehicle.id);
        toast.success('Vehicle deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        toast.error('Failed to delete vehicle');
      }
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    (vehicle.make || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.license_plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.vin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => { setShowModal(true); setEditingVehicle(null); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search vehicles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <Car className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
              </div>
              {user?.role === 'admin' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Owner: </span>
                <span className="text-sm text-gray-600">{vehicle.customer_name}</span>
              </div>
              {vehicle.license_plate && (
                <div>
                  <span className="text-sm font-medium text-gray-700">License: </span>
                  <span className="text-sm text-gray-600">{vehicle.license_plate}</span>
                </div>
              )}
              {vehicle.vin && (
                <div>
                  <span className="text-sm font-medium text-gray-700">VIN: </span>
                  <span className="text-sm text-gray-600 font-mono">{vehicle.vin}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Added {new Date(vehicle.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No vehicles found</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={String(customer.id)}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: normalizePlate(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VIN
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {editingVehicle ? 'Update' : 'Add'} Vehicle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingVehicle(null);
                    setFormData({
                      customer_id: '',
                      make: '',
                      model: '',
                      year: '',
                      license_plate: '',
                      vin: ''
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
    </div>
  );
};
