import React, { useEffect, useMemo, useState } from "react";
import { appointmentsAPI, vehiclesAPI, customersAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Calendar as CalIcon, List, Trash2, Edit3, Upload } from "lucide-react";
import toast from "react-hot-toast";
import CalendarView from "../components/CalendarView";
import AppointmentForm from "../components/AppointmentForm";
import { normalizePlate } from '../lib/api';

function combineLocal(dateYYYYMMDD, timeHHMM) {
  const [y,m,d] = dateYYYYMMDD.split("-").map(Number);
  const [hh,mm] = timeHHMM.split(":").map(Number);
  const dt = new Date(y, m-1, d, hh, mm, 0);
  return dt.toISOString();
}

export const AppointmentsPage = () => {
  const { user } = useAuth();
  const [view, setView] = useState("calendar"); // 'calendar' | 'list'
  const [appointments, setAppointments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [presetDate, setPresetDate] = useState(""); // yyyy-mm-dd
  const [presetTime, setPresetTime] = useState("09:00");

  const [monthCursor, setMonthCursor] = useState(()=> new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(()=>{ loadAll(); }, []);
  async function loadAll(){
    try{
      setLoading(true);
      const [a,v,c] = await Promise.all([appointmentsAPI.getAll(), vehiclesAPI.getAll(), customersAPI.getAll()]);
      setAppointments(a.data || []);
      setVehicles(v.data || []);
      setCustomers(c.data || []);
    }catch(e){
      console.error(e); toast.error("Failed to load data");
    }finally{
      setLoading(false);
    }
  }

  function handleQuickAdd(dateIsoYYYYMMDD, timeHHMM){
    setPresetDate(dateIsoYYYYMMDD);
    setPresetTime(timeHHMM);
    setEditTarget(null);
    setModalOpen(true);
  }

  async function ensureVehicleExists(form){
    const wanted = normalizePlate(form.plate);
    // 1) front-cache
    let v = vehicles.find(x => normalizePlate(x.plate ?? x.license_plate) === wanted);
    if (v) return v;

    // 2) backend otsing (kui olemas libis)
    try {
      if (vehiclesAPI.findByPlate) {
        const r = await vehiclesAPI.findByPlate(wanted);
        if (r?.data) {
          v = r.data;
          setVehicles(prev => [v, ...prev]);
          return v;
        }
      }
    } catch(_) {}

    // 3) loo auto (kui lubatud ja klient valitud)
    if (form.__createIfMissing) {
      if (!form.customer_id) throw new Error("Vali klient, et uut autot luua.");
      const payload = {
        plate: wanted,
        customer_id: form.customer_id,
        make: form.make || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year,10) : null,
      };
      const created = await vehiclesAPI.create(payload);
      v = created.data || created;
      setVehicles(prev => [v, ...prev]);
      return v;
    }

    throw new Error("Sellise autonumbriga sõidukit ei leitud");
  }

  async function saveNew(form){
    try{
      const v = await ensureVehicleExists(form);
      const composedTitle = [
        (v.customer_name || form.customer_id_name || ''), // kui sul on valikust nimi
        [v.license_plate, v.make, v.model, v.year].filter(Boolean).join(' ')
        ].filter(Boolean).join(': ').trim() || 'Service appointment';

      const payload = {
        vehicle_id: v.id,
        customer_id: v.customer_id || form.customer_id || null,
        appointment_date: combineLocal(form.date, form.time),
        duration: "2 hours",
        description: form.description || "",
        status: "scheduled",
        title: composedTitle,
      };
      await appointmentsAPI.create(payload);
      toast.success("Appointment created");
      setModalOpen(false);
      setEditTarget(null);
      setPresetDate("");
      await loadAll();
    }catch(e){ console.error(e); toast.error(e.message || "Save failed"); }
  }

  async function saveEdit(form){
    try{
      const v = await ensureVehicleExists(form);
      const composedTitle = [
        (v.customer_name || ''),
        [v.license_plate, v.make, v.model, v.year].filter(Boolean).join(' ')
        ].filter(Boolean).join(': ').trim() || 'Service appointment';

      const payload = {
        vehicle_id: v.id,
        customer_id: v.customer_id || form.customer_id || null,
        appointment_date: combineLocal(form.date, form.time),
        description: form.description || "",
        title: composedTitle,
      };
      await appointmentsAPI.update(editTarget.id, payload);
      toast.success("Appointment updated");
      setModalOpen(false);
      setEditTarget(null);
      await loadAll();
    }catch(e){ console.error(e); toast.error(e.message || "Update failed"); }
  }

  function openNew(){
    setPresetDate("");
    setPresetTime("09:00");
    setEditTarget(null);
    setModalOpen(true);
  }

  function editApt(a){
    const d = new Date(a.appointment_date);
    const pad = (n)=>String(n).padStart(2,"0");
    setEditTarget(a);
    setPresetDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
    setPresetTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setModalOpen(true);
  }

  async function delApt(a){
    if (!window.confirm("Kustutan broneeringu?")) return;
    try{
      await appointmentsAPI.delete(a.id);
      toast.success("Deleted");
      await loadAll();
    }catch(e){ console.error(e); toast.error("Delete failed"); }
  }

  const listSorted = useMemo(()=> {
    return [...appointments].sort((a,b)=> new Date(a.appointment_date) - new Date(b.appointment_date));
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + view switch */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-lg border ${view==='calendar'?'bg-gray-100':''}`}
            onClick={()=>setView("calendar")}
            title="Calendar view"
          >
            <CalIcon className="w-4 h-4" />
          </button>
          <button
            className={`px-3 py-2 rounded-lg border ${view==='list'?'bg-gray-100':''}`}
            onClick={()=>setView("list")}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          {user?.role === "admin" && (
            <button
              onClick={openNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          )}
          <a
            href={`${import.meta.env.VITE_API_BASE || "http://localhost:3001"}/api/appointments/ics`}
            className="px-3 py-2 rounded-lg border flex items-center gap-2"
            title="Export all as .ics (Outlook)"
          >
            <Upload className="w-4 h-4" /> Export .ics
          </a>
        </div>
      </div>

      {/* Calendar */}
      {view === "calendar" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded border" onClick={()=>setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth()-1, 1))}>Prev</button>
            <div className="font-semibold">
              {monthCursor.toLocaleString(undefined, { month:'long', year:'numeric' })}
            </div>
            <button className="px-3 py-1 rounded border" onClick={()=>setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth()+1, 1))}>Next</button>
            <button className="px-3 py-1 rounded border ml-auto" onClick={()=>{ setMonthCursor(new Date()); setSelectedDate(new Date()); }}>Today</button>
          </div>

          <CalendarView
            value={monthCursor}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            appointments={appointments}
            onQuickAdd={handleQuickAdd}
            onEventClick={editApt}
          />
        </div>
      )}

      {/* List */}
      {view === "list" && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer & Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  {user?.role === "admin" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listSorted.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(a.appointment_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(a.appointment_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{a.customer_name}</div>
                      <div className="text-sm text-gray-500">{a.year} {a.make} {a.model} · {a.plate ?? a.license_plate ?? ""}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {a.description || "No description"}
                      </div>
                    </td>
                    {user?.role === "admin" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-900" onClick={()=>editApt(a)}>
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900" onClick={()=>delApt(a)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <a
                            className="text-gray-700 hover:text-gray-900"
                            href={`${import.meta.env.VITE_API_BASE || "http://localhost:3001"}/api/appointments/${a.id}/ics`}
                            title="Download .ics"
                          >
                            .ics
                          </a>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listSorted.length===0 && (
            <div className="text-center py-12 text-gray-500">No appointments</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editTarget ? "Edit Appointment" : "New Appointment"}</h2>
            <AppointmentForm
              vehicles={vehicles}
              customers={customers}
              initial={{
                plate: editTarget?.license_plate || "",   // IMPORTANT
                date: presetDate || "",
                time: presetTime || "09:00",
                description: editTarget?.description || "",
                customer_id: editTarget?.customer_id || "", // jääb samaks
              }}
              onSubmit={(data)=> editTarget ? saveEdit(data) : saveNew(data)}
              onCancel={()=>{ setModalOpen(false); setEditTarget(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
