import React, { useEffect, useMemo, useState } from 'react';
import { workOrdersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { WorkOrder, WorkOrderPart } from '../types';
import { FileText, Download, Eye, Euro, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';


/** € formatter (et-EE) */
const fmtEUR = (n: number) =>
  new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

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
      setLoading(true);
      const response = await workOrdersAPI.getAll();
      const completedOrders: WorkOrder[] = (response.data || []).filter(
        (o: WorkOrder) => o.status === 'completed'
      );
      setWorkOrders(completedOrders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderParts = async (orderId: any) => {
    try {
      // backendi implementatsioon võib oodata UUID/stringi — ära parseInt’i
      const response = await workOrdersAPI.getParts(orderId as any);
      setOrderParts(response.data || []);
    } catch (error) {
      console.error('Error fetching order parts:', error);
      toast.error('Failed to load order parts');
    }
  };

  const handleViewInvoice = async (order: WorkOrder) => {
    setSelectedOrder(order);
    await fetchOrderParts(order.id as any);
    setShowInvoiceModal(true);
  };

  /** HTML arve – tumerežiim + print valge taust; kasutame EUR */
  const generateInvoiceHTML = (order: WorkOrder, parts: WorkOrderPart[]) => {
    const partsTotal = parts.reduce((sum, p) => sum + (Number(p.quantity_used) * Number(p.unit_price)), 0);
    const laborTotal = Number(order.labor_hours || 0) * Number(order.labor_rate || 0);
    const subtotal = partsTotal + laborTotal;

    // NB! Kui käibemaks erineb, muuda siin
    const vatRate = 0.20; // 20% KM näiteks
    const vat = subtotal * vatRate;
    const total = subtotal + vat;

    const eur = (n: number) =>
      new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

    const safe = (v?: string | number) => (v == null ? '' : String(v));

    // Kui id on string/uuid, lõikame esimesed 8 märki, kui number, padime
    const invoiceId =
      typeof order.id === 'string'
        ? order.id.slice(0, 8).toUpperCase()
        : String(order.id).padStart(6, '0');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Invoice - ${safe(order.title)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; background: #ffffff; }
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
            .totals table { width: 360px; margin-left: auto; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; }

            @media (prefers-color-scheme: dark) {
              body { background: #0b1220; color: #e5e7eb; }
              .header { border-bottom-color: #3b82f6; }
              .company-info h1 { color: #60a5fa; }
              .invoice-info h2 { color: #60a5fa; }
              th { background-color: #111827; color: #e5e7eb; }
              table, th, td { border-color: #374151; }
              .footer { color: #9ca3af; }
            }
            @media print {
              body { background: #ffffff !important; color: #111827 !important; }
              th { background: #f9fafb !important; color: #111827 !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>AutoService Pro</h1>
              <p>Professional Auto Service & Repair</p>
              <p>123 Service Street<br/>Auto City, AC 12345<br/>Phone: (555) 123-4567</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> ${invoiceId}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
            </div>
          </div>

          <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${safe(order.customer_name)}</strong><br/>
            ${safe(order.customer_email)}<br/>
            ${safe(order.customer_phone)}</p>
          </div>

          <div class="vehicle-info" style="margin-bottom:20px;">
            <h3>Vehicle Information:</h3>
            <p><strong>${safe(order.year)} ${safe(order.make)} ${safe(order.model)}</strong><br/>
            License Plate: ${safe(order.license_plate) || 'N/A'}</p>
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
              ${
                Number(order.labor_hours) > 0
                  ? `
                <tr>
                  <td>${safe(order.title)} - Labor</td>
                  <td>${Number(order.labor_hours)} h</td>
                  <td>${eur(Number(order.labor_rate))}/h</td>
                  <td>${eur(laborTotal)}</td>
                </tr>`
                  : ''
              }
              ${parts
                .map(
                  (part) => `
                <tr>
                  <td>${safe(part.name) || 'Part'}</td>
                  <td>${Number(part.quantity_used)}</td>
                  <td>${eur(Number(part.unit_price))}</td>
                  <td>${eur(Number(part.quantity_used) * Number(part.unit_price))}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>${eur(subtotal)}</td>
              </tr>
              <tr>
                <td>VAT (${(vatRate * 100).toFixed(0)}%):</td>
                <td>${eur(vat)}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td>${eur(total)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for choosing AutoService Pro!<br/>
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

    const idStr =
      typeof selectedOrder.id === 'string'
        ? selectedOrder.id.slice(0, 8).toUpperCase()
        : String(selectedOrder.id).padStart(6, '0');

    a.href = url;
    a.download = `invoice-${idStr}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded');
  };

  const totalRevenue = useMemo(
    () => (workOrders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    [workOrders]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Billing & Invoices</h1>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
            <Euro className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Revenue</h3>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{fmtEUR(totalRevenue)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              From {workOrders.length} completed work orders
            </p>
          </div>
        </div>
      </div>

      {/* Completed Work Orders */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Completed Work Orders</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Generate invoices for completed services</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Work Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Completed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {workOrders.map((order) => {
                const idStr =
                  typeof order.id === 'string'
                    ? order.id.slice(0, 8).toUpperCase()
                    : String(order.id).padStart(6, '0');

                return (
                  <tr key={idStr} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">#{idStr}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {order.customer_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{order.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {order.year} {order.make} {order.model}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {order.updated_at ? new Date(order.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtEUR(Number(order.total_amount || 0))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewInvoice(order)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 inline-flex items-center gap-1
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Invoice</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {workOrders.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No completed work orders</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Complete some work orders to generate invoices.
          </p>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto m-4 border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Invoice Preview</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadInvoice}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-gray-900"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Invoice Preview (lihtne kokkuvõte samade väärtustega) */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-blue-500 dark:text-blue-400">AutoService Pro</h1>
                    <p className="text-gray-600 dark:text-gray-300">Professional Auto Service & Repair</p>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <p>123 Service Street</p>
                      <p>Auto City, AC 12345</p>
                      <p>Phone: (555) 123-4567</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-blue-500 dark:text-blue-400">INVOICE</h2>
                    <p className="text-sm">
                      <strong>Invoice #:</strong>{' '}
                      {typeof selectedOrder.id === 'string'
                        ? selectedOrder.id.slice(0, 8).toUpperCase()
                        : String(selectedOrder.id).padStart(6, '0')}
                    </p>
                    <p className="text-sm">
                      <strong>Date:</strong> {new Date().toLocaleDateString()}
                    </p>
                    <p className="text-sm">
                      <strong>Due Date:</strong>{' '}
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
                      <p>
                        <strong>
                          {selectedOrder.year} {selectedOrder.make} {selectedOrder.model}
                        </strong>
                      </p>
                      <p>License Plate: {selectedOrder.license_plate || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-4">Services Provided:</h3>
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-800">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-800 px-4 py-2 text-left">Description</th>
                        <th className="border border-gray-300 dark:border-gray-800 px-4 py-2 text-left">Quantity</th>
                        <th className="border border-gray-300 dark:border-gray-800 px-4 py-2 text-left">Rate</th>
                        <th className="border border-gray-300 dark:border-gray-800 px-4 py-2 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Number(selectedOrder.labor_hours) > 0 && (
                        <tr>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {selectedOrder.title} - Labor
                          </td>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {Number(selectedOrder.labor_hours)} h
                          </td>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {fmtEUR(Number(selectedOrder.labor_rate))}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {fmtEUR(Number(selectedOrder.labor_hours) * Number(selectedOrder.labor_rate))}
                          </td>
                        </tr>
                      )}
                      {orderParts.map((part) => (
                        <tr key={String(part.id)}>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {part.name || 'Part'}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {Number(part.quantity_used)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {fmtEUR(Number(part.unit_price))}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-800 px-4 py-2">
                            {fmtEUR(Number(part.quantity_used) * Number(part.unit_price))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Kokkuvõte – NB! siinne “Subtotal/Total” võtab backendist tulnud total_amounti,
                    vajadusel arvuta siingi uuesti samal moel nagu HTML-is tegi */}
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span>Subtotal:</span>
                      <span>{fmtEUR(Number(selectedOrder.total_amount || 0))}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>VAT (20%):</span>
                      <span>{fmtEUR(Number(selectedOrder.total_amount || 0) * 0.20)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300 dark:border-gray-800">
                      <span>Total:</span>
                      <span>{fmtEUR(Number(selectedOrder.total_amount || 0) * 1.20)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
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
