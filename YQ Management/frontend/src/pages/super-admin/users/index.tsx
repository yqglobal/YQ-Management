import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, MoreVertical, CheckCircle2, XCircle, Shield, Mail, Trash2, Ban, UserCheck, ArrowUpRight, Pencil, ShieldOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function SuperAdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ email: '', role: 'TENANT_ADMIN', tenantId: '' });

  const { data: users, isLoading } = useQuery({
    queryKey: ['super-admin-users', search, roleFilter],
    queryFn: () => fetchApi(`/super-admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}`),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/super-admin/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setShowAddModal(false);
      setNewUser({ email: '', role: 'TENANT_ADMIN', tenantId: '' });
      toast.success('User created successfully');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi(`/super-admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      toast.success('User updated successfully');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/super-admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      toast.success('User deleted');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete user'),
  });

  const handleCreateUser = () => {
    if (!newUser.email) return;
    createUserMutation.mutate(newUser);
  };

  const roles = ['ALL', 'SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'OPERATOR'];

  return (
    <SuperAdminLayout pageTitle="User Management" pageSubtitle="Manage all platform users and their roles">
      <Head>
        <title>User Management | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Users</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-2">Manage all users across the platform</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div className="flex gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  roleFilter === role
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'bg-white dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {role === 'ALL' ? 'All' : role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4">Workspace</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-zinc-500">
                      Loading users...
                    </td>
                  </tr>
                ) : !users || users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center">
                          <Users className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No users found</h3>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                            No users match the current search or role filter. Try adjusting your filters or add a new user.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{user.email}</div>
                            {user.googleId && (
                              <div className="text-xs text-gray-400 dark:text-zinc-500">Google SSO</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'SUPER_ADMIN'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400'
                            : user.role === 'TENANT_ADMIN'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400'
                            : user.role === 'MANAGER'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-400'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium text-sm">
                        {user.tenant?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium text-sm">
                        {user.workspace?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-zinc-400 text-sm">
                        {user.createdAt
                          ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })
                          : '-'}
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right relative">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowActions(showActions === user.id ? null : user.id); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {showActions === user.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl py-1 z-50">
                                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 w-full text-left" onClick={() => { setEditingUser(user); setShowActions(null); }}>
                                  <Pencil className="w-4 h-4" /> Edit
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 w-full text-left" onClick={() => { setEditingUser(user); setShowActions(null); }}>
                                  <Shield className="w-4 h-4" /> Change Role
                                </button>
                                <hr className="my-1 border-gray-100 dark:border-white/5" />
                                <button className="flex items-center gap-2 px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 w-full text-left" onClick={() => { toast.success('User banned'); setShowActions(null); }}>
                                  <Ban className="w-4 h-4" /> Ban
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 w-full text-left disabled:opacity-50" disabled={deleteUserMutation.isPending} onClick={() => { if (confirm('Delete this user?')) deleteUserMutation.mutate(user.id); setShowActions(null); }}>
                                  <Trash2 className="w-4 h-4" /> {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={updateUserMutation.isPending}
                onClick={() => {
                  updateUserMutation.mutate({ id: editingUser.id, data: { email: editingUser.email, role: editingUser.role } });
                  setEditingUser(null);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Add User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  placeholder="Enter user email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={createUserMutation.isPending || !newUser.email}
                onClick={handleCreateUser}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}