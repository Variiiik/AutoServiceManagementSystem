import React from 'react';
import { ClipboardList, Wrench } from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Pealkiri */}
      <div className="flex items-center gap-3">
        <Wrench className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Work Orders
        </h1>
      </div>

      {/* Klaasist kaart */}
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-blue-400/40 via-blue-500/20 to-blue-600/10 dark:from-blue-300/25 dark:via-blue-400/15 dark:to-blue-500/10">
        <div className="rounded-2xl bg-white/90 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur ring-1 ring-slate-200/80 dark:ring-slate-700/70 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <ClipboardList className="h-12 w-12 text-blue-500 dark:text-blue-300" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Work orders management coming soon
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              This section will allow you to create, assign, and track service jobs,
              manage parts usage, and monitor progress in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
