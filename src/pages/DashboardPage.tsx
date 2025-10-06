import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Car,
  Wrench,
  Package,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

/** Väike “sinakas klaas + glow” kaartide wrapper */
const BlueCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div
      className={[
        // gradient-border
        'p-[1px] rounded-2xl bg-gradient-to-b from-blue-400/40 via-blue-500/20 to-blue-600/10',
        'dark:from-blue-300/25 dark:via-blue-400/15 dark:to-blue-500/10',
      ].join(' ')}
    >
      <div
        className={[
          'rounded-2xl',
          // klaas/taust
          'bg-white/90 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur',
          // piirjoon + vari
          'ring-1 ring-slate-200/80 dark:ring-slate-700/70 shadow-lg',
          // sinakas helk
          'shadow-blue-500/10 hover:shadow-blue-500/20',
          'transition-all duration-200 ease-out hover:-translate-y-0.5',
          className,
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
};

const Badge: React.FC<{ tone: 'blue' | 'yellow' | 'green' | 'gray'; children: React.ReactNode }> = ({ tone, children }) => {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/25 dark:text-blue-200 dark:ring-blue-700/50',
    yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200 dark:bg-yellow-900/25 dark:text-yellow-200 dark:ring-yellow-700/50',
    green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-900/25 dark:text-green-200 dark:ring-green-700/50',
    gray: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-slate-800/60 dark:text-gray-300 dark:ring-slate-700/60',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[tone]}`}>{children}</span>;
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(res => res.data),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => dashboardAPI.getRecentOrders().then(res => res.data),
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => dashboardAPI.getTodayAppointments().then(res => res.data),
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => dashboardAPI.getLowStock().then(res => res.data),
  });

  const getStatusBadgeTone = (status: string) => {
    switch (status) {
      case 'pending':
        return 'yellow' as const;
      case 'in_progress':
        return 'blue' as const;
      case 'completed':
        return 'green' as const;
      default:
        return 'gray' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero – sinakas gradient ja kerge mustri-efekt */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.fullName}!</h1>
          <p className="text-blue-100">Here’s what’s happening in your auto service shop today.</p>
        </div>
      </div>

      {/* Stats – rohkem kontrasti ja sinist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BlueCard>
          <div className="flex items-center p-6">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Users className="h-6 w-6 text-blue-700 dark:text-blue-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Customers</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stats?.totalCustomers ?? 0}
              </p>
            </div>
          </div>
        </BlueCard>

        <BlueCard>
          <div className="flex items-center p-6">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Car className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Vehicles</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stats?.totalVehicles ?? 0}
              </p>
            </div>
          </div>
        </BlueCard>

        <BlueCard>
          <div className="flex items-center p-6">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Wrench className="h-6 w-6 text-amber-700 dark:text-amber-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Active Orders</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {(stats?.pendingOrders ?? 0) + (stats?.inProgressOrders ?? 0)}
              </p>
            </div>
          </div>
        </BlueCard>

        <BlueCard>
          <div className="flex items-center p-6">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <Calendar className="h-6 w-6 text-indigo-700 dark:text-indigo-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Today’s Appointments</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stats?.todayAppointments ?? 0}
              </p>
            </div>
          </div>
        </BlueCard>
      </div>

      {/* Work Orders / Inventory / Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BlueCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Work Orders</h3>
              <Wrench className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" /> Pending
                </span>
                <Badge tone="yellow">{stats?.pendingOrders ?? 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-500" /> In&nbsp;Progress
                </span>
                <Badge tone="blue">{stats?.inProgressOrders ?? 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> Completed
                </span>
                <Badge tone="green">{stats?.completedOrders ?? 0}</Badge>
              </div>
            </div>
          </div>
        </BlueCard>

        <BlueCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Inventory Status</h3>
              <Package className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>

            {(stats?.lowStockItems ?? 0) > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center text-rose-600 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    {stats?.lowStockItems} items low in stock
                  </span>
                </div>
                {lowStockItems?.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="text-sm text-slate-700 dark:text-slate-300">
                    {item.name} – {item.stock_quantity} left
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center text-emerald-600 dark:text-emerald-300">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">All items in stock</span>
              </div>
            )}
          </div>
        </BlueCard>

        <BlueCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Performance</h3>
              <TrendingUp className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Completion Rate</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {stats && (stats.completedOrders + stats.inProgressOrders + stats.pendingOrders) > 0
                    ? Math.round(
                        (stats.completedOrders / (stats.completedOrders + stats.inProgressOrders + stats.pendingOrders)) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500"
                  style={{
                    width:
                      stats && (stats.completedOrders + stats.inProgressOrders + stats.pendingOrders) > 0
                        ? `${Math.round(
                            (stats.completedOrders / (stats.completedOrders + stats.inProgressOrders + stats.pendingOrders)) * 100
                          )}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Active Orders</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats?.inProgressOrders ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Today’s Schedule</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats?.todayAppointments ?? 0}</span>
              </div>
            </div>
          </div>
        </BlueCard>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BlueCard>
          <div className="px-6 pt-6 pb-3 border-b border-slate-200/70 dark:border-slate-700/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Work Orders</h3>
          </div>
          <div className="p-6">
            {recentOrders?.length ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((o: any) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{o.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {o.customer_name} – {o.make} {o.model}
                      </p>
                    </div>
                    <Badge tone={getStatusBadgeTone(o.status)}>{o.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">No recent work orders</p>
            )}
          </div>
        </BlueCard>

        <BlueCard>
          <div className="px-6 pt-6 pb-3 border-b border-slate-200/70 dark:border-slate-700/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Today’s Appointments</h3>
          </div>
          <div className="p-6">
            {todayAppointments?.length ? (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {a.customer_name} – {a.make} {a.model}
                      </p>
                    </div>
                    <Badge tone={getStatusBadgeTone(a.status)}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">No appointments today</p>
            )}
          </div>
        </BlueCard>
      </div>
    </div>
  );
};
