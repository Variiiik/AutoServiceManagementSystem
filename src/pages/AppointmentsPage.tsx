import React, { useEffect, useMemo, useState } from "react";
import { appointmentsAPI, vehiclesAPI, customersAPI, normalizePlate } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Calendar as CalIcon, List, Trash2, Edit3, Upload } from "lucide-react";
import toast from "react-hot-toast";
import CalendarView from "../components/CalendarView";
import AppointmentForm from "../components/AppointmentForm";

/** Lokaalne datetime string ilma UTC nihketa (vältimaks “päev varem” probleemi). */
function combineLocal(dateYYYYMMDD: string, timeHHMM: string) {
  return `${dateYYYYMMDD}T${timeHHMM}:00`;
}

/** Võtab plate väärtuse mõlemast võimalikust väljast ja normaliseerib. */
const getPlate = (v: any) => normalizePlate(v?.plate ?? v?.license_plate ?? "");

/** Ehita nähtav pealkiri kliendi nimest + autost. */
function makeTitle(v: any, customerName?: string) {
  const car = [getPlate(v), v.make, v.model, v.year].filter(Boolean).join(" ");
  return [customerName ?? v.customer_name ?? "", car].filter(Boolean).join(": ").trim() || "Service appointment";
}

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();

  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  // Kiirlisamise eelseaded
  const [presetDate, setPresetDate] = useState(""); // yyyy-mm-dd
  const [presetTime, setPresetTime] = useState("09:00");

  // Kalender
  const [monthCursor, setMonthCursor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [a, v, c] = await Promise.all([
        appointmentsAPI.getAll(),
        vehiclesAPI.getAll(),
        customersAPI.getAll(),
      ]);
      setAppointments(a.data || []);
      setVehicles(v.data || []);
      setCustomers(c.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  /** Leia olemasolev sõiduk või loo uus (kui lubatud). */
  async function ensureVehicleExists(form: any) {
    const wanted = normalizePlate(form.plate);

    // 1) front-cache
    let v = vehicles.find((x) => getPlate(x) === wanted);
    if (v) return v;

    // 2) backend findByPlate kui olemas
    try {
      if ((vehiclesAPI as any).findByPlate) {
        const r = await (vehiclesAPI as any).findByPlate(wanted);
        if (r?.data) {
          v = r.data;
          setVehicles((prev) => [v, ...prev]);
          return v;
        }
      }
    } catch (_) {
      /* ignore */
    }

    // 3) loo auto kui lubatud
    if (form.__createIfMissing) {
      if (!form.customer_id) throw new Error("Vali klient, et uut autot luua.");
      // NB! kasuta sinu andmebaasi skeemiga kooskõlas olevat veergu (license_plate/plate)
      const payload = {
        license_plate: wanted,
        customer_id: form.customer_id,
        make: form.make || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year, 10) : null,
      };
      const created = await vehiclesAPI.create(payload);
      v = created.data || created;
      setVehicles((prev) => [v, ...prev]);
      return v;
    }

    throw new Error("Sellise autonumbriga sõidukit ei leitud");
  }

  function handleQuickAdd(dateIsoYYYYMMDD: string, timeHHMM: string) {
    setPresetDate(dateIsoYYYYMMDD);
    setPresetTime(timeHHMM);
    setEditTarget(null);
    setModalOpen(true);
  }

  async function saveNew(form: any) {
    try {
      const v = await ensureVehicleExists(form);

      const payload = {
        vehicle_id: v.id,
        customer_id: v.customer_id || form.customer_id || null,
        appointment_date: combineLocal(form.date, form.time),
        duration: "2 hours",
        description: form.description || "",
        status: "scheduled",
        title: makeTitle(v, form.customer_id_name),
      };

      await appointmentsAPI.create(payload);
      toast.success("Appointment created");
      setModalOpen(false);
      setEditTarget(null);
      setPresetDate("");
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Save failed");
    }
  }

  async function saveEdit(form: any) {
    try {
      const v = await ensureVehicleExists(form);

      const payload = {
        vehicle_id: v.id,
        customer_id: v.customer_id || form.customer_id || null,
        appointment_date: combineLocal(form.date, form.time),
        description: form.description || "",
        title: makeTitle(v, form.customer_id_name),
      };

      await appointmentsAPI.update(editTarget.id, payload);
      toast.success("Appointment updated");
      setModalOpen(false);
      setEditTarget(null);
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Update failed");
    }
  }

  function openNew() {
    setPresetDate("");
    setPresetTime("09:00");
    setEditTarget(null);
    setModalOpen(true);
  }

  function editApt(a: any) {
    const d = new Date(a.appointment_date);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditTarget(a);
    setPresetDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setPresetTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setModalOpen(true);
  }

  async function delApt(a: any) {
    if (!window.confirm("Kustutan broneeringu?")) return;
    try {
      await appointmentsAPI.delete(a.id);
      toast.success("Deleted");
      await loadAll();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  }

  const listSorted = useMemo(() => {
    return [...appointments].sort(
      (a: any, b: any) => +new Date(a.appointment_date) - +new Date(b.appointment_date)
    );
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-lg border dark:border-gray-700 dark:text-gray-100 ${
              view === "calendar" ? "bg-gray-100 dark:bg-gray-800/50" : ""
            }`}
            onClick={() => setView("calendar")}
            title="Calendar view"
          >
            <CalIcon className="w-4 h-4" />
          </button>
          <button
            className={`px-3 py-2 rounded-lg border dark:border-gray-700 dark:text-gray-100 ${
              view === "list" ? "bg-gray-100 dark:bg-gray-800/50" : ""
            }`}
            onClick={() => setView("list")}
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
            href={`${import.meta.env.VITE_API_BASE || "https://asm.k-v.ee"}/api/appointments/ics`}
            className="px-3 py-2 rounded-lg border flex items-center gap-2 dark:border-gray-700 dark:text-gray-100"
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
            <button
              className="px-3 py-1 rounded border dark:border-gray-700 dark:text-gray-100"
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
              }
            >
              Prev
            </button>
            <div className="font-semibold dark:text-gray-100">
              {monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
            </div>
            <button
              className="px-3 py-1 rounded border dark:border-gray-700 dark:text-gray-100"
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
              }
            >
              Next
            </button>
            <button
              className="px-3 py-1 rounded border ml-auto dark:border-gray-700 dark:text-gray-100"
              onClick={() => {
                const now = new Date();
                setMonthCursor(now);
                setSelectedDate(now);
              }}
            >
              Today
            </button>
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
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Customer & Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Description
                  </th>
                  {user?.role === "admin" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                {listSorted.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(a.appointment_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(a.appointment_date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {a.customer_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {[a.year, a.make, a.model].filter(Boolean).join(" ")} ·{" "}
                        {normalizePlate((a as any).plate ?? (a as any).license_plate ?? "")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                        {a.description || "No description"}
                      </div>
                    </td>
                    {user?.role === "admin" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                            onClick={() => editApt(a)}
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 dark:text-red-300 dark:hover:text-red-200"
                            onClick={() => delApt(a)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <a
                            className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                            href={`${
                              import.meta.env.VITE_API_BASE || "https://asm.k-v.ee"
                            }/api/appointments/${a.id}/ics`}
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
          {listSorted.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No appointments</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto border dark:border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {editTarget ? "Edit Appointment" : "New Appointment"}
            </h2>
            <AppointmentForm
              vehicles={vehicles}
              customers={customers}
              initial={{
                // eeltäida plate editis (kui server tagastab license_plate)
                plate: editTarget?.license_plate ?? editTarget?.plate ?? "",
                date: presetDate || "",
                time: presetTime || "09:00",
                description: editTarget?.description || "",
                customer_id: editTarget?.customer_id || "",
                __createIfMissing: true, // luba vajadusel uus auto luua
              }}
              onSubmit={(data: any) => (editTarget ? saveEdit(data) : saveNew(data))}
              onCancel={() => {
                setModalOpen(false);
                setEditTarget(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
