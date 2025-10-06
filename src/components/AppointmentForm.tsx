import React, { useMemo, useState } from "react";
import { normalizePlate } from '../lib/api';

export default function AppointmentForm({
  vehicles = [],             // [{id, plate, license_plate, customer_id, customer_name, make, model, year}]
  customers = [],            // [{id, name, ...}]
  initial,                   // { plate:'', date:'', time:'', description:'', customer_id?:'', make?:'', model?:'', year?:'' }
  onSubmit,                  // (payload) => Promise<void> | void
  onCancel,
}) {
  const [form, setForm] = useState(initial || { plate:'', date:'', time:'', description:'', customer_id:'', make:'', model:'', year:'' });
  const [createIfMissing, setCreateIfMissing] = useState(true);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q) return vehicles.slice(0,30);
    const s = q.toLowerCase();
    return vehicles.filter(v => {
      const p = (v.plate ?? v.license_plate ?? '').toLowerCase();
      const cname = (v.customer_name ?? v.customer?.name ?? '').toLowerCase();
      return p.includes(s) || cname.includes(s);
    }).slice(0,30);
  }, [q, vehicles]);

  function pickPlate(plate){
    setForm(f => ({ ...f, plate: normalizePlate(plate) }));
  }

  async function submit(e){
    e.preventDefault();
    await onSubmit?.({ ...form, plate: normalizePlate(form.plate), __createIfMissing: createIfMissing });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Autonumber */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Autonumber *</label>
        <input
          placeholder="nt 123ABC"
          value={form.plate}
          onChange={(e)=>setForm(f=>({...f, plate: normalizePlate(e.target.value)}))}
          required
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          list="plates"
        />
        <input
          placeholder="Otsi kliendi/numbriga…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          className="mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="max-h-40 overflow-auto mt-2 border rounded">
          {filtered.map(v=>(
            <button
              key={v.id}
              type="button"
              onClick={()=>pickPlate(v.plate ?? v.license_plate)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm font-medium">{v.plate ?? v.license_plate}</div>
              <div className="text-xs text-gray-600">
                {(v.customer_name ?? v.customer?.name) || '—'} · {v.year} {v.make} {v.model}
              </div>
            </button>
          ))}
          {filtered.length===0 && <div className="text-sm text-gray-500 p-2">Ei leitud</div>}
        </div>
      </div>

      {/* Klient (vajalik, kui autot luuakse lennult) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Klient</label>
        <select
          value={form.customer_id || ''}
          onChange={(e)=>setForm(f=>({...f, customer_id: e.target.value || ''}))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">— vali klient —</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Kui autot ei leita, kasutatakse seda klienti uue sõiduki loomiseks.</p>
      </div>

      {/* Valik: loo auto, kui ei leidu */}
      <div className="flex items-center gap-2">
        <input id="createIfMissing" type="checkbox" checked={createIfMissing} onChange={e=>setCreateIfMissing(e.target.checked)} />
        <label htmlFor="createIfMissing" className="text-sm">Loo auto, kui ei leidu</label>
      </div>

      {/* (Valikuline) auto detailid, kui lood uut */}
      <div className="grid grid-cols-3 gap-3">
        <input
          placeholder="Make"
          value={form.make||''}
          onChange={e=>setForm(f=>({...f, make: e.target.value}))}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          placeholder="Model"
          value={form.model||''}
          onChange={e=>setForm(f=>({...f, model: e.target.value}))}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          placeholder="Year"
          type="number"
          min="1900" max="2100"
          value={form.year||''}
          onChange={e=>setForm(f=>({...f, year: e.target.value}))}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Kuupäev/kellaaeg */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kuupäev *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e)=>setForm(f=>({...f, date: e.target.value}))}
            required
            min={new Date().toISOString().slice(0,10)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kellaaeg *</label>
          <input
            type="time"
            value={form.time}
            onChange={(e)=>setForm(f=>({...f, time: e.target.value}))}
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Kirjeldus */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e)=>setForm(f=>({...f, description: e.target.value}))}
          rows={3}
          placeholder="Töö sisu…"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          Save
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </form>
  );
}
