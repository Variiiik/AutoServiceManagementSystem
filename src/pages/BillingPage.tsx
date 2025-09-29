import React, { useState, useEffect } from 'react';
import { workOrdersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { WorkOrder, WorkOrderPart } from '../types';
import { FileText, Download, Eye, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [orderParts, setOrderParts] = useState<WorkOrderPart[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const response = await workOrdersAPI.getAll();
      // Filter for completed orders only
      const completedOrders = response.data.filter((order: WorkOrder) => order.status === 'completed');
      setWorkOrders(completedOrders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderParts = async (orderId: number) => {
    try {
      const response = await workOrdersAPI.getParts(orderId);
      setOrderParts(response.data);
    } catch (error) {
      console.error('Error fetching order parts:', error);
      toast.error('Failed to load order parts');
    }
  };

  const handleViewInvoice = async (order: WorkOrder) => {
    setSelectedOrder(order);
    await fetchOrderParts(order.id);
    setShowInvoiceModal(true);
  };

  const generateInvoiceHTML = (order: WorkOrder, parts: WorkOrderPart[]) => {
    const partsTotal = parts.reduce((sum, part) => sum + (part.quantity_used * part.unit_price), 0);
    const laborTotal = order.labor_hours * order.labor_rate;
    const subtotal = partsTotal + laborTotal;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #2563EB; padding-bottom: 20px; }
            .company-info h1 { color: #2563EB; margin: 0; }
            .invoice-info { text-align: right; }
            .invoice-info h2 { color: #2563EB; margin: 0 0 10px 0; }
            .customer-info { margin-bottom: 30px; }
            .customer-info h3 { margin-bottom: 10px; color: #374151; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f9fafb; font-weight: 600; }
            .totals { text-align: right; margin-top: 20px; }
            .totals table { width: 300px; margin-left: auto; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>AutoService Pro</h1>
              <p>Professional Auto Service & Repair</p>
              <p>123 Service Street<br>Auto City, AC 12345<br>Phone: (555) 123-4567</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> INV-${order.id.toString().padStart(6, '0')}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
          </div>

          <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${order.customer_name}</strong><br>
            ${order.customer_email || ''}<br>
            ${order.customer_phone || ''}</p>
          </div>

          <div class="vehicle-info">
            <h3>Vehicle Information:</h3>
            <p><strong>${order.year || ''} ${order.make} ${order.model}</strong><br>
            License Plate: ${order.license_plate || 'N/A'}</p>
          </div>

          <h3>Services Provided:</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.labor_hours > 0 ? `
                <tr>
                  <td>${order.title} - Labor</td>
                  <td>${order.labor_hours} hours</td>
                  <td>$${order.labor_rate.toFixed(2)}/hour</td>
                  <td>$${laborTotal.toFixed(2)}</td>
                </tr>
              ` : ''}
              ${parts.map(part => `
                <tr>
                  <td>${part.name || 'Part'}</td>
                  <td>${part.quantity_used}</td>
                  <td>$${part.unit_price.toFixed(2)}</td>
                  <td>$${(part.quantity_used * part.unit_price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>$${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax (8%):</td>
                <td>$${tax.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td>$${total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for choosing AutoService Pro!<br>
            Payment is due within 30 days of invoice date.</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadInvoice = () => {
    if (!selectedOrder) return;
    
    const html = generateInvoiceHTML(selectedOrder, orderParts);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${selectedOrder.id.toString().padStart(6, '0')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded successfully');
  };

  const totalRevenue = workOrders.reduce((sum, order) => sum + order.total_amount, 0);

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
        <h1 className="text-3xl font-bold text-gray-900">Billing & Invoices</h1>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">From {workOrders.length} completed work orders</p>
          </div>
        </div>
      </div>

      {/* Completed Work Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Completed Work Orders</h2>
          <p className="text-sm text-gray-600">Generate invoices for completed services</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.title}</div>
                      <div className="text-sm text-gray-500">#{order.id.toString().padStart(6, '0')}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                      <div className="text-sm text-gray-500">{order.customer_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.year} {order.make} {order.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.updated_at || '').toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">
                      ${order.total_amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewInvoice(order)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Invoice</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {workOrders.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No completed work orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            Complete some work orders to generate invoices.
          </p>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Invoice Preview</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDownloadInvoice}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Invoice Preview */}
              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-blue-600">AutoService Pro</h1>
                    <p className="text-gray-600">Professional Auto Service & Repair</p>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>123 Service Street</p>
                      <p>Auto City, AC 12345</p>
                      <p>Phone: (555) 123-4567</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-blue-600">INVOICE</h2>
                    <p className="text-sm"><strong>Invoice #:</strong> INV-{selectedOrder.id.toString().padStart(6, '0')}</p>
                    <p className="text-sm"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    <p className="text-sm"><strong>Due Date:</strong> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold mb-2">Bill To:</h3>
                    <div className="text-sm">
                      <p><strong>{selectedOrder.customer_name}</strong></p>
                      {selectedOrder.customer_email && <p>{selectedOrder.customer_email}</p>}
                      {selectedOrder.customer_phone && <p>{selectedOrder.customer_phone}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Vehicle Information:</h3>
                    <div className="text-sm">
                      <p><strong>{selectedOrder.year} {selectedOrder.make} {selectedOrder.model}</strong></p>
                      <p>License Plate: {selectedOrder.license_plate || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-4">Services Provided:</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Quantity</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Rate</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.labor_hours > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">{selectedOrder.title} - Labor</td>
                          <td className="border border-gray-300 px-4 py-2">{selectedOrder.labor_hours} hours</td>
                          <td className="border border-gray-300 px-4 py-2">${selectedOrder.labor_rate.toFixed(2)}/hour</td>
                          <td className="border border-gray-300 px-4 py-2">${(selectedOrder.labor_hours * selectedOrder.labor_rate).toFixed(2)}</td>
                        </tr>
                      )}
                      {orderParts.map((part) => (
                        <tr key={part.id}>
                          <td className="border border-gray-300 px-4 py-2">{part.name || 'Part'}</td>
                          <td className="border border-gray-300 px-4 py-2">{part.quantity_used}</td>
                          <td className="border border-gray-300 px-4 py-2">${part.unit_price.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2">${(part.quantity_used * part.unit_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span>Subtotal:</span>
                      <span>${selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Tax (8%):</span>
                      <span>${(selectedOrder.total_amount * 0.08).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300">
                      <span>Total:</span>
                      <span>${(selectedOrder.total_amount * 1.08).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-600">
                  <p>Thank you for choosing AutoService Pro!</p>
                  <p>Payment is due within 30 days of invoice date.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};