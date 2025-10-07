import React, { useEffect, useMemo, useState } from 'react';
import { workOrdersAPI } from '../lib/api';
import { WorkOrder, WorkOrderPart } from '../types';
import { FileText, Download, Eye, DollarSign, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

/** ---- Seaded ---- */
const VAT_RATE = 0.22; // Eesti KM (muuda vajadusel)
const EUR = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' });

/** Turvaline ID -> string */
function idStr(id: string | number) {
  return String(id ?? '');
}

/** Summa kalkulatsioon antud tellimuse ja osade põhjal */
function calcTotals(order: WorkOrder, parts: WorkOrderPart[]) {
  const partsTotal = parts.reduce((sum, p) => sum + (Number(p.quantity_used) * Number(p.unit_price)), 0);
  const laborTotal = (Number(order.labor_hours) || 0) * (Number(order.labor_rate) || 0);
  const subtotal = partsTotal + laborTotal;
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  return { partsTotal, laborTotal, subtotal, vat, total };
}

/** HTML arve (alla laadimiseks) */
function generateInvoiceHTML(order: WorkOrder, parts: WorkOrderPart[]) {
  const { partsTotal, laborTotal, subtotal, vat, total } = calcTotals(order, parts);

  const safeCustomerName =
    (order as any)?.customer?.name || order.customer_name || 'Customer';
  const safeCustomerEmail =
    (order as any)?.customer?.email || order.customer_email || '';
  const safeCustomerPhone =
    (order as any)?.customer?.phone || order.customer_phone || '';
  const safeCustomerAddress =
    (order as any)?.customer?.address || '';

  const v = (order as any)?.vehicle || {};
  const vYear = v.year ?? order.year ?? '';
  const vMake = v.make ?? order.make ?? '';
  const vModel = v.model ?? order.model ?? '';
  const vPlate = v.license_plate ?? order.license_plate ?? '';
  const vVin = v.vin ?? '';

  const laborRow = (Number(order.labor_hours) || 0) > 0
    ? `
      <tr>
        <td>${order.title} - Labor</td>
        <td>${order.labor_hours} hours</td>
        <td>${EUR.format(Number(order.labor_rate) || 0)}/hour</td>
        <td>${EUR.format(laborTotal)}</td>
      </tr>
    `
    : '';

  const partsRows = parts.map(p => `
      <tr>
        <td>${p.name || 'Part'}${p.sku ? ` (${p.sku})` : ''}</td>
        <td>${p.quantity_used}</td>
        <td>${EUR.format(Number(p.unit_price) || 0)}</td>
        <td>${EUR.format((Number(p.quantity_used) || 0) * (Number(p.unit_price) || 0))}</td>
      </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
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
    .totals table { width: 320px; margin-left: auto; }
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
      <p><strong>Invoice #:</strong> INV-${idStr(order.id).slice(0, 8).toUpperCase()}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Due Date:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
    </div>
  </div>

  <div class="customer-info">
    <h3>Bill To:</h3>
    <p><strong>${safeCustomerName}</strong><br>
    ${safeCustomerEmail}<br>
    ${safeCustomerPhone}<br>
    ${safeCustomerAddress}</p>
  </div>

  <div class="vehicle-info">
    <h3>Vehicle Information:</h3>
    <p><strong>${vYear} ${vMake} ${vModel}</strong><br>
    License Plate: ${vPlate || 'N/A'}<br>
    VIN: ${vVin || 'N/A'}</p>
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
      ${laborRow}
      ${partsRows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal:</td>
        <td>${EUR.format(subtotal)}</td>
      </tr>
      <tr>
        <td>VAT (${Math.round(VAT_RATE*100)}%):</td>
        <td>${EUR.format(vat)}</td>
      </tr>
      <tr class="total-row">
        <td>Total:</td>
        <td>${EUR.format(total)}</td>
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
}

export function Billing() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [orderParts, setOrderParts] = useState<WorkOrderPart[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => { fetchWorkOrders(); }, []);

  async function fetchWorkOrders() {
    try {
      setLoading(true);
      const response = await workOrdersAPI.getAll();
      const completed = (response.data || []).filter((o: WorkOrder) => o.status === 'completed');
      setWorkOrders(completed);
    } catch (e) {
      console.error('Error fetching work orders:', e);
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderParts(orderId: string | number) {
    try {
      // ÄRA parseInt — ID võib olla UUID
      const response = await workOrdersAPI.getParts(idStr(orderId));
      setOrderParts(response.data || []);
    } catch (e) {
      console.error('Error fetching order parts:', e);
      toast.error('Failed to load parts');
    }
  }

  async function handleViewInvoice(order: WorkOrder) {
    setSelectedOrder(order);
    await fetchOrderParts(order.id as any);
    setShowInvoiceModal(true);
  }

  function handleDownloadInvoice() {
    if (!selectedOrder) return;
    const html = generateInvoiceHTML(selectedOrder, orderParts);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${idStr(selectedOrder.id).slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handlePrintInvoice() {
    if (!selectedOrder) return;
    const html = generateInvoiceHTML(selectedOrder, orderParts);
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    // väike viivitus, et sisu renderduda jõuaks
    printWin.focus();
    setTimeout(() => printWin.print(), 200);
  }

  // Kui total_amount väljal pole kindel tugi, arvuta kohapeal
  const rowsWithTotals = useMemo(() => {
    return workOrders.map((o) => {
      const partsForThis = (o as any).__partsCache ?? []; // kui sul on kuskil cache
      const totals =
        partsForThis.length > 0
          ? calcTotals(o, partsForThis)
          : { partsTotal: 0, laborTotal: (o.labor_hours || 0) * (o.labor_rate || 0), subtotal: (o.total_amount ?? 0), vat: (o.total_amount ?? 0) * VAT_RATE, total: (o.total_amount ?? 0) * (1 + VAT_RATE) };
      return { order: o, totals };
    });
  }, [workOrders]);

  const totalRevenue = useMemo(() => {
    // eelistame kohapeal arvutatud totalit; kui pole osi käes, kasuta order.total_amount
    // NB! See on ainult ülevaate kaart — täpne summa avaneb arvel.
    return workOrders.reduce((sum, o) => {
      const labor = (o.labor_hours || 0) * (o.labor_rate || 0);
      const base = (o.total_amount ?? labor); // fallback
      return sum + base;
    }, 0);
  }, [workOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
            <h3 className="text-lg font-semibold text-gray-900">Total Revenue (summary)</h3>
            <p className="text-3xl font-bold text-green-600">{EUR.format(totalRevenue)}</p>
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
                  Amount (ex VAT est.)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.map((order) => (
                <tr key={idStr(order.id)} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.title}</div>
                      <div className="text-sm text-gray-500">#{idStr(order.id).slice(0, 8).toUpperCase()}</div>
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
                      {(order.year ? `${order.year} ` : '')}{order.make} {order.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.updated_at ? new Date(order.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">
                      {EUR.format(order.total_amount ?? ((order.labor_hours || 0) * (order.labor_rate || 0)))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewInvoice(order)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 inline-flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
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
          <p className="mt-1 text-sm text-gray-500">Complete some work orders to generate invoices.</p>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Invoice Preview</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadInvoice}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 inline-flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handlePrintInvoice}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Preview body */}
            <div className="p-6">
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
                    <p className="text-sm">
                      <strong>Invoice #:</strong> INV-{idStr(selectedOrder.id).slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm">
                      <strong>Date:</strong> {new Date().toLocaleDateString()}
                    </p>
                    <p className="text-sm">
                      <strong>Due Date:</strong> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold mb-2">Bill To:</h3>
                    <div className="text-sm">
                      <p><strong>{selectedOrder.customer_name || 'Customer'}</strong></p>
                      {selectedOrder.customer_email && <p>{selectedOrder.customer_email}</p>}
                      {selectedOrder.customer_phone && <p>{selectedOrder.customer_phone}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Vehicle Information:</h3>
                    <div className="text-sm">
                      <p><strong>{[selectedOrder.year, selectedOrder.make, selectedOrder.model].filter(Boolean).join(' ')}</strong></p>
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
                      {(Number(selectedOrder.labor_hours) || 0) > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">{selectedOrder.title} - Labor</td>
                          <td className="border border-gray-300 px-4 py-2">{selectedOrder.labor_hours} hours</td>
                          <td className="border border-gray-300 px-4 py-2">{EUR.format(Number(selectedOrder.labor_rate) || 0)}/hour</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {EUR.format((Number(selectedOrder.labor_hours) || 0) * (Number(selectedOrder.labor_rate) || 0))}
                          </td>
                        </tr>
                      )}
                      {orderParts.map((part) => (
                        <tr key={idStr(part.id)}>
                          <td className="border border-gray-300 px-4 py-2">{part.name || 'Part'}</td>
                          <td className="border border-gray-300 px-4 py-2">{part.quantity_used}</td>
                          <td className="border border-gray-300 px-4 py-2">{EUR.format(Number(part.unit_price) || 0)}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {EUR.format((Number(part.quantity_used) || 0) * (Number(part.unit_price) || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Kokkuvõte */}
                <InvoiceTotals order={selectedOrder} parts={orderParts} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Kokkuvõtte kast (kasutab sama loogikat) */
function InvoiceTotals({ order, parts }: { order: WorkOrder; parts: WorkOrderPart[] }) {
  const { subtotal, vat, total } = calcTotals(order, parts);
  return (
    <div className="flex justify-end">
      <div className="w-64">
        <div className="flex justify-between py-2">
          <span>Subtotal:</span>
          <span>{EUR.format(subtotal)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span>VAT ({Math.round(VAT_RATE * 100)}%):</span>
          <span>{EUR.format(vat)}</span>
        </div>
        <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300">
          <span>Total:</span>
          <span>{EUR.format(total)}</span>
        </div>
      </div>
    </div>
  );
}
