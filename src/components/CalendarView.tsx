import React, { useMemo, useCallback } from "react";
import { Calendar as CalIcon } from "lucide-react";

/** ----- Status värvid ----- */
const STATUS: Record<
  string,
  { chip: string; ring: string; dot: string; hover?: string }
> = {
  scheduled:  { chip: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",   ring: "ring-blue-500",    dot: "bg-blue-500 dark:bg-blue-400",   hover: "hover:bg-blue-50/70 dark:hover:bg-blue-900/40" },
  confirmed:  { chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200", ring: "ring-emerald-500", dot: "bg-emerald-500 dark:bg-emerald-400", hover: "hover:bg-emerald-50/70 dark:hover:bg-emerald-900/40" },
  in_progress:{ chip: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200", ring: "ring-amber-500",   dot: "bg-amber-500 dark:bg-amber-400",   hover: "hover:bg-amber-50/70 dark:hover:bg-amber-900/40" },
  completed:  { chip: "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200", ring: "ring-slate-500",   dot: "bg-slate-500 dark:bg-slate-300",   hover: "hover:bg-slate-100/70 dark:hover:bg-slate-800/70" },
  cancelled:  { chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",   ring: "ring-rose-500",    dot: "bg-rose-500 dark:bg-rose-400",    hover: "hover:bg-rose-50/70 dark:hover:bg-rose-900/40" },
  default:    { chip: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",   ring: "ring-gray-400",    dot: "bg-gray-400 dark:bg-gray-300",    hover: "hover:bg-gray-50/70 dark:hover:bg-gray-800/70" },
};
const getStatus = (s?: string) => STATUS[s || ""] ?? STATUS.default;

/** ----- utilid (LOKAALNE aeg) ----- */
const pad = (n: number) => String(n).padStart(2, "0");
function localDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // YYYY-MM-DD
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a?: Date | null, b?: Date | null) {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** ----- Props ----- */
type Appointment = {
  id: string | number;
  appointment_date: string; // ISO
  status?: string;
  customer_name?: string;
  make?: string;
  model?: string;
  description?: string;
  license_plate?: string;
  plate?: string;
};

interface CalendarViewProps {
  value: Date;                        // kuu, mida näidata
  selectedDate: Date | null;          // valitud päev
  onSelectDate?: (date: Date) => void;
  appointments?: Appointment[];
  onQuickAdd?: (dateYYYYMMDD: string, timeHHMM: string) => void;
  onEventClick?: (appointment: Appointment) => void;
  quickTimes?: string[];              // vaikimisi ["09:00","10:00","11:00","13:00","15:00"]
}

/** ----- Komponent ----- */
const CalendarView: React.FC<CalendarViewProps> = ({
  value,
  selectedDate,
  onSelectDate,
  appointments = [],
  onQuickAdd,
  onEventClick,
  quickTimes = ["09:00", "10:00", "11:00", "13:00", "15:00"],
}) => {
  const monthStart = startOfMonth(value);

  // 6x7 grid, nädal algab E (Mon)
  const grid = useMemo(() => {
    const weekdayMon1 = monthStart.getDay() === 0 ? 7 : monthStart.getDay(); // Mon=1..Sun=7
    const start = addDays(monthStart, -(weekdayMon1 - 1));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [value]);

  // grupeerime lokaalse päeva järgi
  const byDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const d = new Date(a.appointment_date); // local parse
      const key = localDateKey(d);
      (map[key] ||= []).push(a);
    }
    Object.values(map).forEach((list) =>
      list.sort(
        (x, y) =>
          new Date(x.appointment_date).getTime() -
          new Date(y.appointment_date).getTime()
      )
    );
    return map;
  }, [appointments]);

  const today = new Date();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, day: Date) => {
      if (!onSelectDate) return;
      const key = e.key;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
        e.preventDefault();
        const delta =
          key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : key === "ArrowUp" ? -7 : 7;
        onSelectDate(addDays(day, delta));
      }
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        onSelectDate(day);
      }
    },
    [onSelectDate]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Kalender */}
      <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white/90 dark:bg-slate-900/85 backdrop-blur">
        <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 dark:text-gray-300 px-4 pt-4">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="pb-2 text-center select-none">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded-b-2xl overflow-hidden">
          {grid.map((day, i) => {
            const inMonth = day.getMonth() === value.getMonth();
            const k = localDateKey(day);
            const dayApts = byDay[k] || [];
            const sel = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            const isWeekend = [0, 6].includes(day.getDay()); // Sun=0, Sat=6

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectDate?.(day)}
                onKeyDown={(e) => handleKeyDown(e, day)}
                aria-label={day.toDateString()}
                className={[
                  "relative p-2 min-h-[110px] text-left outline-none focus:ring-2 focus:ring-blue-500",
                  "bg-white dark:bg-slate-900 transition-colors",
                  !inMonth ? "bg-gray-50 dark:bg-slate-900/60 text-gray-400 dark:text-gray-500" : "",
                  isWeekend ? "bg-gray-50 dark:bg-slate-900/70" : "",
                  sel ? `ring-2 ring-offset-0 ${getStatus("default").ring}` : "",
                ].join(" ")}
              >
                {/* Päeva number */}
                <span
                  className={[
                    "inline-flex items-center justify-center rounded-full w-7 h-7 text-sm font-semibold",
                    isToday
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800",
                  ].join(" ")}
                  title={day.toLocaleDateString()}
                >
                  {day.getDate()}
                </span>

                {/* Sündmused */}
                <div className="mt-2 space-y-1">
                  {dayApts.slice(0, 3).map((a) => {
                    const t = new Date(a.appointment_date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const c = getStatus(a.status);
                    return (
                      <button
                        key={String(a.id)}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(a);
                        }}
                        className={[
                          "w-full text-left flex items-center gap-2 text-[11px] px-2 py-1 rounded-md border",
                          "border-gray-200 dark:border-gray-700",
                          c.chip,
                          c.hover,
                          "transition shadow-sm",
                        ].join(" ")}
                        title={`${t} • ${a.customer_name || ""} ${(a.make || "") + " " + (a.model || "")}\n${a.description || ""}`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
                        <span className="truncate">{t} {a.customer_name || ""}</span>
                      </button>
                    );
                  })}
                  {dayApts.length > 3 && (
                    <div className="text-[11px] text-gray-600 dark:text-gray-400">
                      +{dayApts.length - 3} more…
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parempoolne paneel: legend + kiirlisamine + valitud päeva nimekiri */}
      <aside className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 bg-white/90 dark:bg-slate-900/85 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Selected day</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedDate ? selectedDate.toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Legend</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS)
              .filter(([k]) => k !== "default")
              .map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${val.dot}`} />
                  <span className="capitalize">{key.replace("_", " ")}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Quick add (ainult siin) */}
        {selectedDate && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quick add</div>
            <div className="flex flex-wrap gap-2">
              {quickTimes.map((t) => (
                <button
                  key={t}
                  onClick={() => onQuickAdd?.(localDateKey(selectedDate), t)}
                  className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                  title={`Add at ${t}`}
                >
                  <CalIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Valitud päeva detailid */}
        {selectedDate && (() => {
          const key = localDateKey(selectedDate);
          const list = byDay[key] || [];
          return (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Appointments</div>
              {list.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">No appointments</div>
              )}
              {list.map((a) => {
                const t = new Date(a.appointment_date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const c = getStatus(a.status);
                return (
                  <button
                    key={String(a.id)}
                    onClick={() => onEventClick?.(a)}
                    className="p-2 rounded-md border border-gray-200 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-slate-800 w-full"
                    title="Edit appointment"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t} — {a.customer_name || "Customer"}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {(a.make || "") + " " + (a.model || "")}
                      {(a.plate || a.license_plate) ? ` · ${(a.plate || a.license_plate)}` : ""}
                    </div>
                    {a.description && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                        {a.description}
                      </div>
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
};

export default CalendarView;
