import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../lib/api';
import { InventoryItem } from '../types';
import { Plus, Search, Pencil as Edit3, Trash2, Package, AlertTriangle } from 'lucide-react';

function formatEUR(value: number | string | undefined) {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(n)) return '0.00 EUR';
  return `${n.toFixed(2)} EUR`;
}

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    stock_quantity: '',
    min_stock_level: '',
    price: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await inventoryAPI.getAll();
      // backist juba tuleb is_low_stock; kui ei tule, arvutame ise
      const itemsWithLowStock = response.data.map((item: any) => ({
        ...item,
        is_low_stock:
          typeof item.is_low_stock === 'boolean'
            ? item.is_low_stock
            : Number(item.stock_quantity) <= Number(item.min_stock_level),
      }));
      setItems(itemsWithLowStock);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const itemData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity, 10) : 0,
        min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level, 10) : 5,
        price: formData.price ? parseFloat(formData.price) : 0
      };

      if (editingItem) {
        await inventoryAPI.update(String((editingItem as any).id), itemData);
      } else {
        await inventoryAPI.create(itemData);
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        name: '',
        sku: '',
        stock_quantity: '',
        min_stock_level: '',
        price: ''
      });
      fetchInventory();
    } catch (error) {
      console.error('Error saving inventory item:', error);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      stock_quantity: String(item.stock_quantity ?? ''),
      min_stock_level: String(item.min_stock_level ?? ''),
      price: String(item.price ?? '')
    });
    setShowModal(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        await inventoryAPI.delete(String((item as any).id));
        fetchInventory();
      } catch (error) {
        console.error('Error deleting inventory item:', error);
      }
    }
  };

  // ⬇️ OLULINE: ära tee parseInt(id) – jäta stringiks (UUID)!
  const updateStock = async (itemId: string | number, newQuantity: number) => {
    try {
      await inventoryAPI.updateStock(String(itemId), newQuantity);
      fetchInventory();
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = items.filter((item: any) => item.is_low_stock);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
        <button
          onClick={() => { setShowModal(true); setEditingItem(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Low Stock Alert — {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} need restocking
            </h3>
          </div>
          <div className="mt-2">
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              {lowStockItems.slice(0, 3).map(item => (
                <span key={(item as any).id} className="mr-4">
                  {item.name} ({item.stock_quantity} left)
                </span>
              ))}
              {lowStockItems.length > 3 && <span>and {lowStockItems.length - 3} more...</span>}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden dark:bg-slate-900 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredItems.map((item) => (
                <tr
                  key={(item as any).id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 ${item.is_low_stock ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className={`h-5 w-5 mr-3 ${item.is_low_stock ? 'text-yellow-500' : 'text-gray-400'}`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                        {item.is_low_stock && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-300">Low stock!</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateStock((item as any).id, Math.max(0, Number(item.stock_quantity) - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        aria-label="Decrease stock"
                      >
                        -
                      </button>
                      <span className={`text-sm font-medium ${item.is_low_stock ? 'text-yellow-600 dark:text-yellow-300' : 'text-gray-900 dark:text-gray-100'}`}>
                        {item.stock_quantity}
                      </span>
                      <button
                        onClick={() => updateStock((item as any).id, Number(item.stock_quantity) + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                        aria-label="Increase stock"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.min_stock_level}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatEUR(item.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-900 dark:text-red-300 dark:hover:text-red-200"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    No inventory items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {editingItem ? 'Edit Inventory Item' : 'Add New Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      sku: '',
                      stock_quantity: '',
                      min_stock_level: '',
                      price: ''
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
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
}
