'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function MessagesPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, with_appointment, no_appointment
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [perPage] = useState(50);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, currentPage]);

  useEffect(() => {
    applyFilters();
  }, [messages, searchTerm, filterBy]);

  const fetchMessages = async (resetPage = false) => {
    try {
      setLoadingMessages(true);
      const pageToFetch = resetPage ? 1 : currentPage;
      const response = await api.get(`/messages?per_page=${perPage}&page=${pageToFetch}`);
      const msgs = response.data.messages || [];
      console.log('Fetched messages:', msgs);
      console.log('Messages with appointments:', msgs.filter(m => m.appointment));

      setMessages(msgs);
      setTotalMessages(response.data.total || 0);
      setHasMore(response.data.has_more || false);

      if (resetPage) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      alert('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...messages];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.stock_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.dealer_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Appointment filter
    if (filterBy === 'with_appointment') {
      filtered = filtered.filter(msg => msg.appointment);
    } else if (filterBy === 'no_appointment') {
      filtered = filtered.filter(msg => !msg.appointment);
    }

    setFilteredMessages(filtered);
  };

  const groupMessagesByConversation = () => {
    const conversations = {};

    filteredMessages.forEach(msg => {
      const key = `${msg.sender}-${msg.stock_number}-${msg.dealer_id}`;
      if (!conversations[key]) {
        conversations[key] = {
          sender: msg.sender,
          stock_number: msg.stock_number,
          dealer_id: msg.dealer_id,
          messages: [],
          lastMessage: msg,
          hasAppointment: false,
          appointment: null,
        };
      }
      conversations[key].messages.push(msg);

      // Check if this message has an appointment
      if (msg.appointment) {
        conversations[key].hasAppointment = true;
        conversations[key].appointment = msg.appointment;
      }

      // Update last message if this one is more recent
      if (new Date(msg.message_time) > new Date(conversations[key].lastMessage.message_time)) {
        conversations[key].lastMessage = msg;
      }
    });

    // Sort by latest message
    return Object.values(conversations).sort((a, b) =>
      new Date(b.lastMessage.message_time) - new Date(a.lastMessage.message_time)
    );
  };

  const deleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await api.delete(`/messages/${messageId}`);
      await fetchMessages();
      setSelectedConversation(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const conversations = groupMessagesByConversation();

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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                Messages
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">
                {user?.name || user?.email}
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
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by sender, message, stock #..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter By
                </label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Messages</option>
                  <option value="with_appointment">With Appointment</option>
                  <option value="no_appointment">No Appointment</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => fetchMessages(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Stats & Pagination */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Messages</div>
              <div className="text-2xl font-bold text-gray-900">{totalMessages}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Current Page</div>
              <div className="text-2xl font-bold text-gray-900">{filteredMessages.length} msgs</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Conversations</div>
              <div className="text-2xl font-bold text-gray-900">{conversations.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">With Appointments</div>
              <div className="text-2xl font-bold text-green-600">
                {conversations.filter(c => c.hasAppointment).length}
              </div>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} • Showing {messages.length} of {totalMessages} messages
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md font-medium ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!hasMore}
                  className={`px-4 py-2 rounded-md font-medium ${
                    !hasMore
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Conversations List */}
          {loadingMessages ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading messages...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <div className="text-gray-500 text-lg">No messages found</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversations List */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                {conversations.map((conv, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedConversation(conv)}
                    className={`bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow ${
                      selectedConversation === conv ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{conv.sender}</div>
                        <div className="text-sm text-gray-500">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/vehicles/${conv.stock_number}?dealer_id=${conv.dealer_id}`);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Stock: {conv.stock_number}
                          </button>
                          {' | Dealer: '}{conv.dealer_id}
                        </div>
                      </div>
                      {conv.hasAppointment && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Appointment
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {conv.lastMessage.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {conv.messages.length} messages • {formatDate(conv.lastMessage.message_time)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Conversation Details */}
              <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-12rem)]">
                {selectedConversation ? (
                  <div className="bg-white rounded-lg shadow h-full flex flex-col">
                    <div className="p-4 border-b">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Conversation with {selectedConversation.sender}
                      </h2>
                      <div className="text-sm text-gray-500">
                        Stock: {selectedConversation.stock_number} | Dealer: {selectedConversation.dealer_id}
                      </div>
                      {selectedConversation.appointment && (
                        <div className="mt-3 p-3 bg-green-50 rounded-md">
                          <div className="text-sm font-semibold text-green-900">Appointment Details</div>
                          <div className="text-sm text-green-800 mt-1">
                            <div><strong>Name:</strong> {selectedConversation.appointment.customer_name}</div>
                            <div><strong>Phone:</strong> {selectedConversation.appointment.customer_phone}</div>
                            <div><strong>Time:</strong> {formatDate(selectedConversation.appointment.appointment_time)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedConversation.messages
                        .sort((a, b) => new Date(a.message_time) - new Date(b.message_time))
                        .map((msg) => (
                          <div key={msg.id} className="space-y-2">
                            {/* Customer Message */}
                            <div className="flex justify-start">
                              <div className="max-w-[80%]">
                                <div className="bg-gray-100 rounded-lg p-3">
                                  <div className="text-sm text-gray-900">{msg.message}</div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatDate(msg.message_time)}
                                </div>
                              </div>
                            </div>

                            {/* AI Response */}
                            {msg.ai_response && (
                              <div className="flex justify-end">
                                <div className="max-w-[80%]">
                                  <div className="bg-blue-600 text-white rounded-lg p-3">
                                    <div className="text-sm">{msg.ai_response}</div>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 text-right">
                                    AI • {msg.ai_tokens_used} tokens
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                    <div className="p-4 border-t">
                      <button
                        onClick={() => {
                          if (selectedConversation.messages.length > 0) {
                            // Delete all messages in this conversation
                            if (confirm(`Delete all ${selectedConversation.messages.length} messages in this conversation?`)) {
                              Promise.all(
                                selectedConversation.messages.map(msg =>
                                  api.delete(`/messages/${msg.id}`)
                                )
                              ).then(() => {
                                fetchMessages();
                                setSelectedConversation(null);
                              }).catch(err => {
                                console.error('Failed to delete messages:', err);
                                alert('Failed to delete some messages');
                              });
                            }
                          }
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
                      >
                        Delete Conversation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow h-full flex items-center justify-center">
                    <div className="text-gray-500">
                      Select a conversation to view details
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
