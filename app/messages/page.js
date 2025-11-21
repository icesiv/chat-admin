'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Ensure this path matches your project
import { useRouter } from 'next/navigation';
import api from '@/lib/api'; // Ensure this path matches your project

export default function MessagesPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  
  // State
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, with_appointment, no_appointment
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [perPage] = useState(50);

  // --- 1. Auth Check ---
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // --- 2. Data Fetching ---
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage]);

  // --- 3. Local Filtering ---
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, searchTerm, filterBy]);

  const fetchMessages = async (resetPage = false) => {
    try {
      setLoadingMessages(true);
      const pageToFetch = resetPage ? 1 : currentPage;
      
      // Call API
      const response = await api.get(`/messages?per_page=${perPage}&page=${pageToFetch}`);
      
      // Safety: Ensure messages is always an array
      const msgs = response.data.messages || [];
      
      setMessages(msgs);
      setTotalMessages(response.data.total || 0);
      setHasMore(response.data.has_more || false);

      if (resetPage) setCurrentPage(1);

    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Optional: Add a toast notification here
    } finally {
      setLoadingMessages(false);
    }
  };

  const applyFilters = () => {
    if (!messages) return;

    let filtered = [...messages];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.sender?.toLowerCase().includes(term) ||
        msg.message?.toLowerCase().includes(term) ||
        msg.stock_number?.toLowerCase().includes(term) ||
        msg.dealer_id?.toLowerCase().includes(term)
      );
    }

    // Appointment filter
    if (filterBy === 'with_appointment') {
      filtered = filtered.filter(msg => msg.appointment !== null);
    } else if (filterBy === 'no_appointment') {
      filtered = filtered.filter(msg => msg.appointment === null);
    }

    setFilteredMessages(filtered);
  };

  // Helper: Parse dates safely across browsers (Safari fix)
  const safelyParseDate = (dateString) => {
    if (!dateString) return new Date();
    // Replace space with T for ISO format if needed, though usually backend sends standard format
    return new Date(dateString); 
  };

  const groupMessagesByConversation = () => {
    const convos = {};

    filteredMessages.forEach(msg => {
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

      // Check for appointment (Backend returns 'appointment' object or null)
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

  const deleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(`/messages/${messageId}`);
      fetchMessages(); // Refresh list
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Format for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const conversations = groupMessagesByConversation();

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-900">
                &larr; Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">AI Sales Inbox</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button onClick={logout} className="text-red-600 hover:text-red-800 text-sm font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Filters & Stats */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Customer, Stock #, or Message..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Filter</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Conversations</option>
                  <option value="with_appointment">📅 With Appointment</option>
                  <option value="no_appointment">💬 Enquiries Only</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => fetchMessages(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
          
          {/* LEFT COLUMN: Conversation List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
             <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase flex justify-between">
               <span>Inbox ({conversations.length})</span>
               <span>Page {currentPage}</span>
             </div>
             
             <div className="flex-1 overflow-y-auto">
               {loadingMessages && conversations.length === 0 ? (
                 <div className="p-8 text-center text-gray-400">Loading...</div>
               ) : conversations.length === 0 ? (
                 <div className="p-8 text-center text-gray-400">No messages found.</div>
               ) : (
                 conversations.map((conv) => (
                   <div
                     key={conv.id}
                     onClick={() => setSelectedConversation(conv)}
                     className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                       selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                     }`}
                   >
                     <div className="flex justify-between items-start mb-1">
                       <h3 className="font-bold text-gray-900 truncate">{conv.sender}</h3>
                       {conv.hasAppointment && (
                         <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                           APPT
                         </span>
                       )}
                     </div>
                     
                     <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                       <span className="bg-gray-100 px-1.5 rounded">#{conv.stock_number}</span>
                       <span>•</span>
                       <span>{formatDate(conv.lastMessage.message_time)}</span>
                     </div>

                     <p className="text-sm text-gray-600 line-clamp-2">
                       {conv.lastMessage.role === 'user' ? '👤 ' : '🤖 '}
                       {conv.lastMessage.message || conv.lastMessage.ai_response}
                     </p>
                   </div>
                 ))
               )}
             </div>

             {/* Simple Pagination */}
             <div className="p-3 border-t border-gray-200 flex justify-between bg-gray-50">
               <button 
                 disabled={currentPage === 1} 
                 onClick={() => setCurrentPage(p => p - 1)}
                 className="text-xs font-medium disabled:opacity-30"
               >
                 &larr; Prev
               </button>
               <button 
                 disabled={!hasMore} 
                 onClick={() => setCurrentPage(p => p + 1)}
                 className="text-xs font-medium disabled:opacity-30"
               >
                 Next &rarr;
               </button>
             </div>
          </div>

          {/* RIGHT COLUMN: Chat Details */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{selectedConversation.sender}</h2>
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <span className="font-mono bg-white border border-gray-200 px-2 rounded">Stock: {selectedConversation.stock_number}</span>
                      <span>Dealer: {selectedConversation.dealer_id}</span>
                    </div>
                  </div>
                  
                  {/* Appointment Badge in Header */}
                  {selectedConversation.hasAppointment && selectedConversation.appointment && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-right">
                      <div className="text-xs font-bold text-green-700 uppercase tracking-wide">Scheduled Visit</div>
                      <div className="text-sm font-bold text-green-900">
                        {formatDate(selectedConversation.appointment.appointment_time)}
                      </div>
                      <div className="text-xs text-green-700">
                         {selectedConversation.appointment.customer_phone}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                  {selectedConversation.messages
                    .sort((a, b) => safelyParseDate(a.message_time) - safelyParseDate(b.message_time))
                    .map((msg) => (
                      <div key={msg.id} className="space-y-4">
                        
                        {/* Customer Bubble */}
                        <div className="flex justify-start">
                          <div className="max-w-[80%]">
                            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none px-4 py-3">
                              <p className="text-sm">{msg.message}</p>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1 ml-1">
                              {formatDate(msg.message_time)}
                            </div>
                          </div>
                        </div>

                        {/* AI Bubble */}
                        {msg.ai_response && (
                          <div className="flex justify-end">
                            <div className="max-w-[80%]">
                              <div className={`rounded-2xl rounded-tr-none px-4 py-3 ${
                                msg.ai_status === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-blue-600 text-white shadow-md'
                              }`}>
                                <p className="text-sm leading-relaxed">{msg.ai_response}</p>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1 text-right flex justify-end items-center gap-2">
                                {msg.ai_tokens_used > 0 && <span>{msg.ai_tokens_used} tokens</span>}
                                <span>AI Assistant</span>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" /></svg>
                <p>Select a conversation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}