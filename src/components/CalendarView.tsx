import React, { useMemo } from "react";
import { Calendar as CalIcon } from "lucide-react";

/* ---- värvikaart staatustele ---- */
const STATUS = {
  scheduled:  { chip: "bg-blue-100 text-blue-800",   ring: "ring-blue-500",    dot: "bg-blue-500" },
  confirmed:  { chip: "bg-emerald-100 text-emerald-800", ring: "ring-emerald-500", dot: "bg-emerald-500" },
  in_progress:{ chip: "bg-amber-100 text-amber-900", ring: "ring-amber-500",   dot: "bg-amber-500" },
  completed:  { chip: "bg-slate-200 text-slate-700", ring: "ring-slate-500",   dot: "bg-slate-500" },
  cancelled:  { chip: "bg-rose-100 text-rose-800",   ring: "ring-rose-500",    dot: "bg-rose-500" },
  default:    { chip: "bg-gray-100 text-gray-700",   ring: "ring-gray-400",    dot: "bg-gray-400" },
};

function getStatusColors(s){ return STATUS[s] ?? STATUS.default; }

/* ---- utilid (LOKAALNE kuupäev, mitte UTC) ---- */
const pad = (n)=>String(n).padStart(2,"0");
function localDateKey(d){
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; // YYYY-MM-DD (local)
}
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function isSameDay(a,b){ return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

export default function CalendarView({
  value,               // Date (kuu, mida näidata)
  selectedDate,        // Date (valitud päev)
  onSelectDate,        // (date: Date) => void
  appointments = [],   // [{ id, appointment_date, status, customer_name, make, model, description }]
  onQuickAdd,          // (dateYYYYMMDD: string, timeHHMM: string) => void
  onEventClick,        // (appointment) => void
}) {
  const monthStart = startOfMonth(value);

  // 6x7 ruudustik, nädal algab esmaspäevast
  const grid = useMemo(() => {
    const weekday = (monthStart.getDay() || 7); // Mon=1..Sun=7
    const start = addDays(monthStart, -(weekday-1));
    return Array.from({length: 42}, (_,i) => addDays(start, i));
  }, [value]);

  // grupi broneeringud päeva (LOKAALSE) kaupa
  const byDay = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      const d = new Date(a.appointment_date);     // parseerib lokaalsesse
      const key = localDateKey(d);                 // LOKAALNE kuupäev -> ei nihku päev tagasi
      (map[key] ||= []).push(a);
    }
    Object.values(map).forEach(list => list.sort((x,y)=> new Date(x.appointment_date) - new Date(y.appointment_date)));
    return map;
  }, [appointments]);

  const quickTimes = ["09:00","10:00","11:00","13:00","15:00"];
  const today = new Date();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* kalender */}
      <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm">
        <div className="grid grid-cols-7 text-xs font-medium text-gray-600 px-4 pt-4">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <div key={d} className="pb-2 text-center">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-2xl overflow-hidden">
          {grid.map((day, i) => {
            const inMonth   = day.getMonth() === value.getMonth();
            const k         = localDateKey(day);
            const dayApts   = byDay[k] || [];
            const sel       = isSameDay(day, selectedDate);
            const isToday   = isSameDay(day, today);
            const isWeekend = [0,6].includes(day.getDay()); // Sun=0, Sat=6

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectDate?.(day)}
                className={[
                  "relative bg-white p-2 min-h-[110px] text-left",
                  !inMonth ? "bg-gray-50 text-gray-400" : "",
                  isWeekend ? "bg-gray-50" : "",
                  sel ? "ring-2 ring-offset-0 "+(getStatusColors("default").ring) : "",
                ].join(" ")}
              >
                {/* Päeva number */}
                <span
                  className={[
                    "inline-flex items-center justify-center rounded-full w-7 h-7 text-sm font-semibold",
                    isToday ? "bg-blue-600 text-white" : "hover:bg-gray-100"
                    ].join(" ")}
                    title={day.toLocaleDateString()}
                  >
                    {day.getDate()}
                  </span>
                {/* broneeringute “chips” (klikk toob edit) */}
                <div className="mt-2 space-y-1">
                  {dayApts.slice(0,3).map(a => {
                    const t = new Date(a.appointment_date).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
                    const c = getStatusColors(a.status);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={(e)=>{ e.stopPropagation(); onEventClick?.(a); }}
                        className={[
                          "w-full text-left flex items-center gap-2 text-[11px] px-2 py-1 rounded-md border",
                          "hover:shadow-sm transition",
                          c.chip.replace("bg-","bg-opacity-50 bg-")
                        ].join(" ")}
                        title={`${t} • ${a.customer_name || ""} ${(a.make||"")+" "+(a.model||"")}\n${a.description || ""}`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
                        <span className="truncate">{t} {a.customer_name || ''}</span>
                      </button>
                    );
                  })}
                  {dayApts.length > 3 && (
                    <div className="text-[11px] text-gray-600">+{dayApts.length-3} more…</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* parem paneel: valitud päev + KIIRAJAD (ainus koht lisamiseks) */}
      <aside className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Selected day</div>
            <div className="text-lg font-semibold">
              {selectedDate ? selectedDate.toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        {/* legend (soovi korral jäta alles) */}
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Legend</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS).filter(([k])=>k!=="default").map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${val.dot}`} />
                <span className="capitalize">{key.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KIIR LISAMINE AINULT SIIN */}
        {selectedDate && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-1">Quick add</div>
            <div className="flex flex-wrap gap-2">
              {quickTimes.map(t => (
                <button
                  key={t}
                  onClick={() => onQuickAdd?.(localDateKey(selectedDate), t)} // LOKAALNE kuupäev → ei nihku
                  className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-sm"
                >
                  <CalIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* valitud päeva detailid (klikitav editiks) */}
        {selectedDate && (() => {
          const key = localDateKey(selectedDate);
          const list = byDay[key] || [];
          return (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-gray-700 mb-1">Appointments</div>
              {list.length === 0 && <div className="text-sm text-gray-500">No appointments</div>}
              {list.map(a => {
                const t = new Date(a.appointment_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                const c = getStatusColors(a.status);
                return (
                  <button key={a.id} onClick={()=>onEventClick?.(a)} className="p-2 rounded-md border text-left hover:bg-gray-50 w-full">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      <div className="text-sm font-semibold">{t} — {a.customer_name || "Customer"}</div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {(a.make||"") + " " + (a.model||"")}
                    </div>
                    {a.description && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-3">{a.description}</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })()}
      </aside>
    </div>
  );
}
