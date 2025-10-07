// src/pages/SettingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { User, Lock, Users, Shield, Palette, Search, RefreshCw, Save, KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authAPI, meAPI, usersAPI, rolesAPI, type AppUser, type Role, type Permission } from "../lib/api";
import toast from "react-hot-toast";

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth(); // eelda et sul on see olemas; kui ei ole, eemalda refreshUser
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "users" | "roles" | "theme">("profile");
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("theme") === "dark");
  const isAdmin = user?.role === "admin";

  // PROFILE state
  const [profile, setProfile] = useState({ fullName: user?.fullName || "", email: user?.email || "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // PASSWORD state
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [changingPwd, setChangingPwd] = useState(false);

  // USERS (admin)
  const [users, setUsers] = useState<AppUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [uLoading, setULoading] = useState(false);
  const [uSearch, setUSearch] = useState("");
  const [uPage, setUPage] = useState(1);
  const uLimit = 25;

  // ROLES (admin)
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [rLoading, setRLoading] = useState(false);
  const [rSaving, setRSaving] = useState(false);

  // theme side-effect
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // keep profile in sync if user changes
  useEffect(() => {
    setProfile({ fullName: user?.fullName || "", email: user?.email || "" });
  }, [user?.fullName, user?.email]);

  // --- handlers ---
  async function handleSaveProfile() {
    try {
      setSavingProfile(true);
      await meAPI.update(profile);
      toast.success("Profiil salvestatud.");
      await refreshUser?.(); // kui olemas
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Profiili salvestamine ebaõnnestus.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!pwd.newPassword || pwd.newPassword.length < 8) {
      toast.error("Uus parool peab olema vähemalt 8 märki.");
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      toast.error("Uus parool ja kinnitus ei ühti.");
      return;
    }
    try {
      setChangingPwd(true);
      await authAPI.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success("Parool muudetud.");
      setPwd({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Parooli muutmine ebaõnnestus.");
    } finally {
      setChangingPwd(false);
    }
  }

  // --- admin: users ---
  const loadUsers = React.useCallback(async () => {
    if (!isAdmin) return;
    try {
      setULoading(true);
      const data = await usersAPI.list({ search: uSearch || undefined, page: uPage, limit: uLimit });
      setUsers(data.items);
      setTotalUsers(data.total);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Kasutajate laadimine ebaõnnestus.");
    } finally {
      setULoading(false);
    }
  }, [uSearch, uPage, isAdmin]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function updateUserField(id: string, patch: Partial<Pick<AppUser, "fullName"|"email"|"role"|"isActive">>) {
    // optimistlik
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)));
    try {
      await usersAPI.update(id, patch);
      toast.success("Kasutaja uuendatud.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Uuendamine ebaõnnestus.");
      // refresh to revert
      loadUsers();
    }
  }

  async function resetUserPassword(id: string) {
    try {
      const res = await usersAPI.resetPassword(id);
      const info = res?.tempPassword ? `Ajutine parool: ${res.tempPassword}` : "Ajutine parool loodud.";
      toast.success(info);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Parooli lähtestamine ebaõnnestus.");
    }
  }

  // --- admin: roles & permissions ---
  async function loadRolesAndPerms() {
    if (!isAdmin) return;
    setRLoading(true);
    try {
      const [r, p] = await Promise.all([rolesAPI.listRoles(), rolesAPI.listPermissions()]);
      setRoles(r);
      setPerms(p);
      if (r.length && !selectedRole) setSelectedRole(r[0].id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Rollide/õiguste laadimine ebaõnnestus.");
    } finally {
      setRLoading(false);
    }
  }

  useEffect(() => { loadRolesAndPerms(); }, [isAdmin]);

  useEffect(() => {
    if (!selectedRole) return;
    (async () => {
      try {
        setRLoading(true);
        const keys = await rolesAPI.getRolePermissions(selectedRole);
        setRolePerms(keys);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Rolli õiguste laadimine ebaõnnestus.");
      } finally {
        setRLoading(false);
      }
    })();
  }, [selectedRole]);

  async function saveRolePerms() {
    if (!selectedRole) return;
    try {
      setRSaving(true);
      await rolesAPI.setRolePermissions(selectedRole, rolePerms);
      toast.success("Õigused salvestatud.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Õiguste salvestamine ebaõnnestus.");
    } finally {
      setRSaving(false);
    }
  }

  // UI helpers
  const totalPages = Math.max(1, Math.ceil(totalUsers / uLimit));

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Settings</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "profile", label: "User Info", icon: <User className="h-4 w-4" /> },
          { key: "password", label: "Password", icon: <Lock className="h-4 w-4" /> },
          ...(isAdmin ? [
            { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
            { key: "roles", label: "Roles", icon: <Shield className="h-4 w-4" /> },
          ] : []),
          { key: "theme", label: "Theme", icon: <Palette className="h-4 w-4" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              activeTab === t.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6">
        {activeTab === "profile" && (
          <div className="max-w-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">User Info</h2>
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Full name</label>
            <input
              className="w-full mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
              value={profile.fullName}
              onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
            />
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Email</label>
            <input
              className="w-full mb-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              type="email"
            />
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {savingProfile ? "Salvestan..." : "Salvesta"}
            </button>
          </div>
        )}

        {activeTab === "password" && (
          <div className="max-w-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Change Password</h2>
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Current password</label>
            <input
              className="w-full mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
              type="password"
              value={pwd.currentPassword}
              onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))}
            />
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">New password</label>
            <input
              className="w-full mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
              type="password"
              value={pwd.newPassword}
              onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
            />
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Confirm new password</label>
            <input
              className="w-full mb-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
              type="password"
              value={pwd.confirm}
              onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
            />
            <button
              onClick={handleChangePassword}
              disabled={changingPwd}
              className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> {changingPwd ? "Vahetan..." : "Muuda parool"}
            </button>
          </div>
        )}

        {activeTab === "users" && isAdmin && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-full max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={uSearch}
                  onChange={e => { setUSearch(e.target.value); setUPage(1); }}
                  placeholder="Otsi nime või e-maili..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
              <button
                onClick={loadUsers}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <RefreshCw className={`h-4 w-4 ${uLoading ? "animate-spin" : ""}`} /> Lae uuesti
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left px-3 py-2">Nimi</th>
                    <th className="text-left px-3 py-2">E-mail</th>
                    <th className="text-left px-3 py-2">Roll</th>
                    <th className="text-left px-3 py-2">Staatus</th>
                    <th className="text-left px-3 py-2">Tegevused</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">
                        <input
                          value={u.fullName}
                          onChange={e => updateUserField(u.id, { fullName: e.target.value })}
                          className="w-full rounded-md border border-transparent focus:border-gray-300 dark:focus:border-gray-700 bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="email"
                          value={u.email}
                          onChange={e => updateUserField(u.id, { email: e.target.value })}
                          className="w-full rounded-md border border-transparent focus:border-gray-300 dark:focus:border-gray-700 bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={u.role}
                          onChange={e => updateUserField(u.id, { role: e.target.value })}
                          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1"
                        >
                          {/* Kui kasutad role’ide API-t, võid need siia map’ida */}
                          <option value="user">user</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={u.isActive}
                            onChange={e => updateUserField(u.id, { isActive: e.target.checked })}
                          />
                          <span>{u.isActive ? "Aktiivne" : "Keelatud"}</span>
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => resetUserPassword(u.id)}
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          title="Lähtesta parool"
                        >
                          <KeyRound className="h-4 w-4" /> Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!users.length && !uLoading && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                        Tulemusi ei leitud.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Leht {uPage}/{totalPages} &middot; Kokku {totalUsers}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setUPage(p => Math.max(1, p - 1))}
                  disabled={uPage <= 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                  Eelmine
                </button>
                <button
                  onClick={() => setUPage(p => Math.min(totalPages, p + 1))}
                  disabled={uPage >= totalPages}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                  Järgmine
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "roles" && isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* roles list */}
            <div className="md:col-span-1">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Rollid</h3>
              <div className="space-y-2">
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      selectedRole === r.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {r.name}
                    {r.description ? (
                      <div className="text-xs opacity-80">{r.description}</div>
                    ) : null}
                  </button>
                ))}
                {!roles.length && !rLoading && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Rollid puuduvad.</div>
                )}
              </div>
            </div>

            {/* permissions */}
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Õigused</h3>
              {rLoading ? (
                <div className="text-sm text-gray-500">Laen...</div>
              ) : selectedRole ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {perms.map(p => {
                      const checked = rolePerms.includes(p.key);
                      return (
                        <label key={p.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const v = e.target.checked;
                              setRolePerms(old =>
                                v ? Array.from(new Set([...old, p.key])) : old.filter(k => k !== p.key),
                              );
                            }}
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    onClick={saveRolePerms}
                    disabled={rSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" /> {rSaving ? "Salvestan..." : "Salvesta õigused"}
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-500">Vali roll vasakult.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "theme" && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Theme Settings</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDark(false)}
                className={`px-4 py-2 rounded-lg border ${
                  !dark
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setDark(true)}
                className={`px-4 py-2 rounded-lg border ${
                  dark
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
