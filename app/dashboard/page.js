'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch dashboard statistics
      const response = await api.get('/messages');
      // Process stats from response
      setStats({
        totalMessages: response.data?.data?.length || 0,
        // Add more stats as needed
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Car Dealership Admin
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">
                Welcome, {user?.name || user?.email}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Messages
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {stats?.totalMessages || 0}
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Conversations
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      0
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Appointments
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      0
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() => router.push('/messages')}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <span className="text-gray-700 font-medium">View Messages</span>
              </button>
              <button
                onClick={() => router.push('/vehicles')}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <span className="text-gray-700 font-medium">Manage Vehicles</span>
              </button>
              <button
                onClick={() => router.push('/appointments')}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <span className="text-gray-700 font-medium">View Appointments</span>
              </button>
              <button
                onClick={() => router.push('/simulator')}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <span className="text-gray-700 font-medium">Simulator</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
