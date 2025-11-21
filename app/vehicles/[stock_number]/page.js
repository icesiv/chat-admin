'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

export default function VehicleDetailPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { stock_number } = params;

  const [vehicle, setVehicle] = useState(null);
  const [messages, setMessages] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [dealerId, setDealerId] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // details, conversations, appointments
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Auto-fetch vehicle if dealer_id is in URL
  useEffect(() => {
    if (!loading && user && !vehicle) {
      const params = new URLSearchParams(window.location.search);
      const dealerIdFromUrl = params.get('dealer_id');

      if (dealerIdFromUrl && !dealerId) {
        console.log('Auto-fetching vehicle with dealer_id from URL:', dealerIdFromUrl);
        setDealerId(dealerIdFromUrl);
      }
    }
  }, [user, loading, vehicle, dealerId]);

  // Trigger fetch when dealerId is set from URL
  useEffect(() => {
    if (dealerId && !vehicle && !loadingVehicle) {
      const params = new URLSearchParams(window.location.search);
      const dealerIdFromUrl = params.get('dealer_id');

      if (dealerIdFromUrl === dealerId) {
        console.log('Triggering auto-fetch for dealer_id:', dealerId);
        fetchVehicleDetails();
      }
    }
  }, [dealerId]);

  const fetchVehicleDetails = async () => {
    if (!dealerId) {
      alert('Please enter a Dealer ID');
      return;
    }

    try {
      setLoadingVehicle(true);
      setFetchError(null);

      console.log('Fetching vehicle details:', { stock_number, dealerId });

      // Fetch vehicle details from the API
      const response = await api.get(`/vehicles/${stock_number}?dealer_id=${dealerId}`);

      console.log('Vehicle API response:', response.data);

      if (response.data.success && response.data.vehicle) {
        setVehicle(response.data.vehicle);
        console.log('Vehicle set:', response.data.vehicle);

        // Fetch messages for this vehicle
        await fetchMessages();
      } else {
        setFetchError('Vehicle data not found in response');
      }
    } catch (error) {
      console.error('Failed to fetch vehicle details:', error);
      console.error('Error response:', error.response);
      setFetchError(error.response?.data?.message || error.message || 'Failed to load vehicle details');
    } finally {
      setLoadingVehicle(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages?per_page=100`);
      const allMessages = response.data.messages || [];

      // Filter messages for this vehicle
      const vehicleMessages = allMessages.filter(
        msg => msg.stock_number === stock_number && msg.dealer_id === dealerId
      );

      setMessages(vehicleMessages);

      // Extract appointments
      const vehicleAppointments = vehicleMessages
        .filter(msg => msg.appointment)
        .map(msg => msg.appointment);

      setAppointments(vehicleAppointments);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const groupMessagesByConversation = () => {
    const conversations = {};

    messages.forEach(msg => {
      const key = msg.sender;
      if (!conversations[key]) {
        conversations[key] = {
          sender: msg.sender,
          messages: [],
          appointment: null,
        };
      }
      conversations[key].messages.push(msg);

      if (msg.appointment) {
        conversations[key].appointment = msg.appointment;
      }
    });

    return Object.values(conversations).sort((a, b) => {
      const aTime = Math.max(...a.messages.map(m => new Date(m.message_time)));
      const bTime = Math.max(...b.messages.map(m => new Date(m.message_time)));
      return bTime - aTime;
    });
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
                onClick={() => router.push('/messages')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Messages
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                Vehicle Details: {stock_number}
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
          {/* Dealer ID Input */}
          {!vehicle && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Enter Dealer Information
              </h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={dealerId}
                  onChange={(e) => setDealerId(e.target.value)}
                  placeholder="Enter Dealer ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchVehicleDetails}
                  disabled={loadingVehicle}
                  data-fetch-vehicle
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
                >
                  {loadingVehicle ? 'Loading...' : 'Fetch Vehicle'}
                </button>
              </div>
              {fetchError && (
                <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md">
                  {fetchError}
                </div>
              )}
            </div>
          )}

          {/* Vehicle Header */}
          {vehicle && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h2>
                  {vehicle.trim && (
                    <p className="text-gray-600 mt-1">{vehicle.trim}</p>
                  )}
                  {vehicle.cached_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Cached: {formatDate(vehicle.cached_at)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setVehicle(null);
                    setMessages([]);
                    setAppointments([]);
                    setActiveTab('details');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Change Vehicle
                </button>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          {vehicle && (
            <div className="mb-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Total Messages</div>
                  <div className="text-2xl font-bold text-gray-900">{messages.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Conversations</div>
                  <div className="text-2xl font-bold text-gray-900">{conversations.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Appointments</div>
                  <div className="text-2xl font-bold text-green-600">{appointments.length}</div>
                </div>
              </div>

              {/* Tab Buttons */}
              <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'details'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Vehicle Details
                    </button>
                    <button
                      onClick={() => setActiveTab('images')}
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'images'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Images ({vehicle.images?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('conversations')}
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'conversations'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Conversations ({conversations.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'appointments'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Appointments ({appointments.length})
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Details Tab */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* Primary Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Vehicle Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-500 uppercase">Stock Number</div>
                            <div className="text-base font-semibold text-gray-900">{vehicle.stock_number}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-500 uppercase">Dealer ID</div>
                            <div className="text-base font-semibold text-gray-900">{vehicle.dealer_id}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-500 uppercase">VIN</div>
                            <div className="text-base font-semibold text-gray-900">{vehicle.vin || 'N/A'}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded">
                            <div className="text-xs text-green-600 uppercase font-semibold">Price</div>
                            <div className="text-xl font-bold text-green-700">
                              {formatPrice(vehicle.price)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-500 uppercase">Mileage</div>
                            <div className="text-base font-semibold text-gray-900">
                              {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'N/A'}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-500 uppercase">Condition</div>
                            <div className="text-base font-semibold text-gray-900">{vehicle.condition || 'N/A'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Specifications */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Specifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {vehicle.color && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Exterior:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.color}</div>
                            </div>
                          )}
                          {vehicle.exterior_color && !vehicle.color && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Exterior:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.exterior_color}</div>
                            </div>
                          )}
                          {vehicle.interior_color && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Interior:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.interior_color}</div>
                            </div>
                          )}
                          {vehicle.transmission && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Transmission:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.transmission}</div>
                            </div>
                          )}
                          {vehicle.engine && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Engine:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.engine}</div>
                            </div>
                          )}
                          {vehicle.fuel_type && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Fuel Type:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.fuel_type}</div>
                            </div>
                          )}
                          {vehicle.drivetrain && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Drivetrain:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.drivetrain}</div>
                            </div>
                          )}
                          {vehicle.body_style && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Body Style:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.body_style}</div>
                            </div>
                          )}
                          {vehicle.doors && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Doors:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.doors}</div>
                            </div>
                          )}
                          {vehicle.title_status && (
                            <div className="flex items-start">
                              <div className="text-sm text-gray-500 w-24">Title Status:</div>
                              <div className="text-sm font-semibold text-gray-900">{vehicle.title_status}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Features */}
                      {vehicle.features && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Features</h3>
                          <div className="bg-gray-50 p-4 rounded">
                            {Array.isArray(vehicle.features) ? (
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {vehicle.features.map((feature, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-gray-700">{vehicle.features}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {vehicle.description && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
                          <div className="bg-gray-50 p-4 rounded">
                            <div className="text-sm text-gray-700 whitespace-pre-line">{vehicle.description}</div>
                          </div>
                        </div>
                      )}

                      {/* Dealer Information */}
                      {vehicle.dealer_info && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Dealer Information</h3>
                          <div className="bg-blue-50 p-4 rounded">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(vehicle.dealer_info).map(([key, value]) => {
                                if (typeof value === 'string' || typeof value === 'number') {
                                  return (
                                    <div key={key} className="flex items-start">
                                      <div className="text-sm text-gray-600 w-32 capitalize">
                                        {key.replace(/_/g, ' ')}:
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900">{value}</div>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional Data */}
                      {vehicle.raw_data && (
                        <details>
                          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                            View All Raw Data
                          </summary>
                          <div className="mt-3 bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96">
                            <pre className="text-xs">{JSON.stringify(vehicle.raw_data, null, 2)}</pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Images Tab */}
                  {activeTab === 'images' && (
                    <div>
                      {vehicle.images && vehicle.images.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                              Vehicle Images ({vehicle.images.length})
                            </h3>
                            <button
                              onClick={() => {
                                // Open all images in new tabs
                                vehicle.images.forEach((img, idx) => {
                                  setTimeout(() => window.open(img, '_blank'), idx * 100);
                                });
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Open All in New Tabs
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vehicle.images.map((img, idx) => (
                              <div key={idx} className="relative group bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                                <img
                                  src={img}
                                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} - Image ${idx + 1}`}
                                  className="w-full h-64 object-cover cursor-pointer transition-transform group-hover:scale-105"
                                  onClick={() => window.open(img, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-white text-sm font-medium">
                                      Image {idx + 1} of {vehicle.images.length}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(img, '_blank');
                                      }}
                                      className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      View Full Size
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Image Grid Options */}
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">
                              <strong>Tip:</strong> Click on any image to open it in a new tab, or use the "Open All in New Tabs" button above.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="text-gray-500 text-lg mt-4">
                            No images available for this vehicle
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conversations Tab */}
                  {activeTab === 'conversations' && (
                    <div>
                      {conversations.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Contact List - Left Panel */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                              Contacts ({conversations.length})
                            </h3>
                            <div className="space-y-2">
                              {conversations.map((conv, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedConversation(conv)}
                                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                                    selectedConversation === conv
                                      ? 'bg-blue-50 border-2 border-blue-500 shadow-md'
                                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900">{conv.sender}</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                    {conv.appointment && (
                                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">
                                        Appointment
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600 truncate">
                                    {conv.messages[conv.messages.length - 1]?.message}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-2">
                                    {formatDate(conv.messages[conv.messages.length - 1]?.message_time)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Message Thread - Right Panel */}
                          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-24rem)]">
                            {selectedConversation ? (
                              <div className="bg-gray-50 rounded-lg h-full flex flex-col border-2 border-gray-200">
                                {/* Conversation Header */}
                                <div className="p-4 bg-white border-b border-gray-200 rounded-t-lg">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedConversation.sender}
                                      </h3>
                                      <div className="text-sm text-gray-500 mt-1">
                                        {selectedConversation.messages.length} message{selectedConversation.messages.length !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setSelectedConversation(null)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>

                                  {/* Appointment Info */}
                                  {selectedConversation.appointment && (
                                    <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                      <div className="text-sm font-semibold text-green-900 mb-1">Appointment Details</div>
                                      <div className="text-sm text-green-800 space-y-1">
                                        <div><strong>Name:</strong> {selectedConversation.appointment.customer_name}</div>
                                        <div><strong>Phone:</strong> {selectedConversation.appointment.customer_phone}</div>
                                        <div><strong>Time:</strong> {formatDate(selectedConversation.appointment.appointment_time)}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
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
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg h-full flex items-center justify-center border-2 border-gray-200 border-dashed">
                                <div className="text-center p-8">
                                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  <div className="text-gray-500 text-lg">
                                    Select a contact to view conversation
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <div className="text-gray-500 text-lg">
                            No conversations found for this vehicle
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Appointments Tab */}
                  {activeTab === 'appointments' && (
                    <div>
                      {appointments.length > 0 ? (
                        <div className="space-y-4">
                          {appointments.map((appointment, idx) => (
                            <div key={idx} className="border-l-4 border-green-500 bg-green-50 pl-4 py-3 rounded-r">
                              <div className="font-semibold text-gray-900 text-lg">
                                {appointment.customer_name}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Phone:</span> {appointment.customer_phone}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Time:</span> {formatDate(appointment.appointment_time)}
                              </div>
                              {appointment.dealer_id && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">Dealer ID:</span> {appointment.dealer_id}
                                </div>
                              )}
                              {appointment.stock_number && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">Stock #:</span> {appointment.stock_number}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="text-gray-500 text-lg">
                            No appointments scheduled for this vehicle
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
