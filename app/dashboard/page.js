'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// --- Simple Icon Components (No external library needed) ---
const Icons = {
  Message: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>,
  Car: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 16l-1-1m-4-3l-4 5m6-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 10h16v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z"></path></svg>,
  Bot: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
  Users: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>,
  LogOut: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
};

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalMessages: 0,
    pendingLeads: 0,
    appointments: 0,
    recentActivity: []
  });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetching messages to calculate basic stats - fetch more to ensure we get recent convos
      const response = await api.get('/messages?per_page=50');
      const msgs = response.data?.messages || [];

      // Calculate simple stats from the response
      // Note: In a real app, you'd want a dedicated /stats endpoint
      const pending = msgs.filter(m => !m.ai_response).length;
      const appointments = msgs.filter(m => m.appointment).length;

      // Group messages by conversation
      const conversations = groupMessagesByConversation(msgs);

      setStats({
        totalMessages: response.data?.total || 0,
        pendingLeads: pending, // Placeholder logic
        appointments: appointments, // Placeholder logic
        recentActivity: conversations.slice(0, 5) // Top 5 recent conversations
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Helper: Parse dates safely across browsers (Safari fix)
  const safelyParseDate = (dateString) => {
    if (!dateString) return new Date();
    return new Date(dateString);
  };

  const groupMessagesByConversation = (messages) => {
    const convos = {};

    messages.forEach(msg => {
      // Create a unique key for the conversation
      const dealer = msg.dealer_id || 'Unknown';
      const stock = msg.stock_number || 'General';
      const sender = msg.sender || 'Unknown';

      const key = `${sender}-${stock}-${dealer}`;

      if (!convos[key]) {
        convos[key] = {
          id: key,
          sender: sender,
          stock_number: stock,
          dealer_id: dealer,
          messages: [],
          lastMessage: msg,
          hasAppointment: false,
          appointment: null,
        };
      }

      // Add message to list
      convos[key].messages.push(msg);

      // Check for appointment
      if (msg.appointment) {
        convos[key].hasAppointment = true;
        convos[key].appointment = msg.appointment;
      }

      // Update last message tracking
      const msgTime = safelyParseDate(msg.message_time);
      const lastMsgTime = safelyParseDate(convos[key].lastMessage.message_time);

      if (msgTime > lastMsgTime) {
        convos[key].lastMessage = msg;
      }
    });

    // Convert object to array and sort by most recent message
    return Object.values(convos).sort((a, b) =>
      safelyParseDate(b.lastMessage.message_time) - safelyParseDate(a.lastMessage.message_time)
    );
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-full mb-4"></div>
          <div className="text-slate-400 text-sm font-medium">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* --- Top Navigation Bar --- */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <Icons.Car />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-800">
                AutoSales<span className="text-blue-600">AI</span> Admin
              </span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-300">
                {user?.name?.[0] || 'U'}
              </div>
              <button
                onClick={logout}
                className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                title="Logout"
              >
                <Icons.LogOut />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- Main Dashboard Content --- */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back, here's what's happening at the dealership today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Stat Card 1 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Icons.Message />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.totalMessages}</div>
            <div className="text-sm text-slate-500">Total Conversations</div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Icons.Users />
              </div>
              <span className="text-xs font-semibold text-slate-500">Today</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.appointments}</div>
            <div className="text-sm text-slate-500">Appointments Booked</div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <Icons.Car />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">18</div>
            <div className="text-sm text-slate-500">Active Inventory</div>
          </div>

          {/* Stat Card 4 */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg text-white">
                <Icons.Bot />
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Live</span>
            </div>
            <div className="text-2xl font-bold">Active</div>
            <div className="text-sm text-blue-100">AI Agent Status</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Quick Actions Panel */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Management Console</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <button
                onClick={() => router.push('/messages')}
                className="group p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex items-start gap-4"
              >
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icons.Message />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 group-hover:text-blue-600">Customer Inbox</h4>
                  <p className="text-sm text-slate-500 mt-1">View and manage AI conversations with leads.</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/vehicles')}
                className="group p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex items-start gap-4"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Icons.Car />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 group-hover:text-emerald-600">Vehicle Inventory</h4>
                  <p className="text-sm text-slate-500 mt-1">Update stock details, prices, and specs.</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/simulator')}
                className="group p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex items-start gap-4"
              >
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Icons.Bot />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 group-hover:text-purple-600">AI Simulator</h4>
                  <p className="text-sm text-slate-500 mt-1">Test the bot response logic in real-time.</p>
                </div>
              </button>

            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Leads</h3>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {stats.recentActivity.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No recent activity</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.recentActivity.map((conv, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push('/messages')}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-slate-800">{conv.sender}</span>
                        <span className="text-[10px] text-slate-400">{new Date(conv.lastMessage.message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        Stock: <span className="font-mono text-blue-600">{conv.stock_number}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        {conv.lastMessage.role === 'user' ? '👤 ' : '🤖 '}
                        "{conv.lastMessage.message || conv.lastMessage.ai_response}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button onClick={() => router.push('/messages')} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                  View All Activity <Icons.ArrowRight />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}