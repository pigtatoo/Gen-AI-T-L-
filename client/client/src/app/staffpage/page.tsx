"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'staff';
}

export default function StaffPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filtered, setFiltered] = useState<UserItem[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('User');
  const [actionStatus, setActionStatus] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [rssSyncStatus, setRssSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [rssSyncMessage, setRssSyncMessage] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/loginpage');
      return;
    }

    // read saved user from localStorage so header shows real name
    try {
      const saved = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      setUserName(saved.name || 'User');
    } catch (e) {
      setUserName('User');
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        const list = data.users || [];
        setUsers(list);
        setFiltered(list);
        // initialize action statuses for each user
        const statuses: Record<number, 'idle' | 'saving' | 'saved' | 'error'> = {};
        list.forEach((u: UserItem) => (statuses[u.id] = 'idle'));
        setActionStatus(statuses);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error fetching users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [token, router]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return setFiltered(users);
    setFiltered(
      users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [query, users]);

  const updateRole = async (id: number, role: string) => {
    if (!token) return;
    const prev = users.slice();
    setUsers((prevUsers) => prevUsers.map(u => (u.id === id ? { ...u, role: role as any } : u)));
    setActionStatus(prev => ({ ...prev, [id]: 'saving' }));
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      const data = await res.json();
      // Update with server response
      setUsers(prev => prev.map(u => (u.id === id ? data.user : u)));
      setActionStatus(prev => ({ ...prev, [id]: 'saved' }));
      // clear saved state after a short delay
      setTimeout(() => setActionStatus(prev => ({ ...prev, [id]: 'idle' })), 2000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error updating role');
      setActionStatus(prev => ({ ...prev, [id]: 'error' }));
      setUsers(prev);
      setTimeout(() => setActionStatus(prev => ({ ...prev, [id]: 'idle' })), 3000);
    }
  };

  const triggerRssSync = async () => {
    if (!token) return;
    setRssSyncStatus('syncing');
    setRssSyncMessage('');
    try {
      const res = await fetch(`${API_URL}/api/admin/rss-sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to trigger RSS sync');
      const data = await res.json();
      setRssSyncStatus('success');
      setRssSyncMessage(data.message || 'RSS sync started successfully');
      setTimeout(() => {
        setRssSyncStatus('idle');
        setRssSyncMessage('');
      }, 5000);
    } catch (err) {
      console.error(err);
      setRssSyncStatus('error');
      setRssSyncMessage(err instanceof Error ? err.message : 'Error triggering RSS sync');
      setTimeout(() => {
        setRssSyncStatus('idle');
        setRssSyncMessage('');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header (matching landing page style) */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-8 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Staff Console</h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => router.push('/userpage')}
              className="rounded-lg  px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100"
            >
              {userName}
              
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* RSS Sync Section */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">RSS Sync Control</h3>
            <p className="text-sm text-gray-600 mb-4">
              Manually trigger the weekly RSS sync to fetch and analyze new articles.
            </p>
            <button
              onClick={triggerRssSync}
              disabled={rssSyncStatus === 'syncing'}
              className={`rounded-lg px-6 py-2 font-semibold transition-colors ${
                rssSyncStatus === 'syncing'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {rssSyncStatus === 'syncing' ? 'Syncing...' : 'Trigger RSS Sync'}
            </button>
            {rssSyncMessage && (
              <div
                className={`mt-3 text-sm font-medium ${
                  rssSyncStatus === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {rssSyncMessage}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-semibold mb-4">Manage Users</h2>
          {error && <div className="mb-4 text-red-600">{error}</div>}

          <div className="mb-4 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="flex-1 rounded border px-3 py-2"
            />
            <button
              onClick={() => {
                setQuery('');
                setFiltered(users);
              }}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Clear
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">Loading...</div>
          ) : (
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">ID</th>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Role</th>
                    <th className="text-left px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-4 py-2">{u.id}</td>
                      <td className="px-4 py-2">{u.name}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2">
                        <select
                          value={u.role}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          className="rounded border px-2 py-1"
                        >
                          <option value="student">student</option>
                          <option value="teacher">teacher</option>
                          <option value="staff">staff</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        {actionStatus[u.id] === 'saving' && (
                          <span className="text-sm text-gray-600">Updating...</span>
                        )}
                        {actionStatus[u.id] === 'saved' && (
                          <span className="text-sm text-green-600 font-semibold">Saved</span>
                        )}
                        {actionStatus[u.id] === 'error' && (
                          <span className="text-sm text-red-600">Error</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}