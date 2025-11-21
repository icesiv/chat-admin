'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function VehiclesPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState('all');
  const [dealers, setDealers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [vehicleMessageCounts, setVehicleMessageCounts] = useState({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchVehicles();
      fetchMessages();
    }
  }, [user]);

  useEffect(() => {
    filterVehicles();
  }, [selectedDealer, searchQuery, vehicles]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      // Fetch from vehicle cache
      const response = await api.get('/vehicles');

      if (response.data) {
        const vehicleData = response.data.data || response.data;
        setVehicles(vehicleData);

        // Extract unique dealers
        const uniqueDealers = [...new Set(vehicleData.map(v => v.dealer_number))].sort();
        setDealers(uniqueDealers);
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get('/messages?per_page=1000');
      const allMessages = response.data.messages || [];
      setMessages(allMessages);

      // Count conversations per vehicle
      const counts = {};
      allMessages.forEach(msg => {
        const key = `${msg.stock_number}-${msg.dealer_id}`;
        if (!counts[key]) {
          counts[key] = {
            messages: 0,
            conversations: new Set(),
            hasAppointment: false,
          };
        }
        counts[key].messages++;
        counts[key].conversations.add(msg.sender);
        if (msg.appointment) {
          counts[key].hasAppointment = true;
        }
      });

      // Convert sets to counts
      const finalCounts = {};
      Object.keys(counts).forEach(key => {
        finalCounts[key] = {
          messages: counts[key].messages,
          conversations: counts[key].conversations.size,
          hasAppointment: counts[key].hasAppointment,
        };
      });

      setVehicleMessageCounts(finalCounts);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const getVehicleStats = (stockNumber, dealerNumber) => {
    const key = `${stockNumber}-${dealerNumber}`;
    return vehicleMessageCounts[key] || { messages: 0, conversations: 0, hasAppointment: false };
  };

  const filterVehicles = () => {
    let filtered = vehicles;

    // Filter by dealer
    if (selectedDealer !== 'all') {
      filtered = filtered.filter(v => v.dealer_number === selectedDealer);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => {
        const data = v.vehicle_data?.data || v.vehicle_data || {};
        return (
          v.stock_number?.toLowerCase().includes(query) ||
          data.make?.toLowerCase().includes(query) ||
          data.model?.toLowerCase().includes(query) ||
          data.year?.toString().includes(query)
        );
      });
    }

    setFilteredVehicles(filtered);
  };

  const getVehicleInfo = (vehicle) => {
    const data = vehicle.vehicle_data?.data || vehicle.vehicle_data || {};
    return {
      year: data.year || 'N/A',
      make: data.make || 'N/A',
      model: data.model || 'N/A',
      trim: data.trim || '',
      price: data.price ? `$${Number(data.price).toLocaleString()}` : 'N/A',
      mileage: data.mileage || data.odometer || 'N/A',
      color: data.exterior_color || data.ExteriorColor || 'N/A',
      vin: data.vin || data.VIN || 'N/A',
      images: data.images || data.Pictures || []
    };
  };

  if (authLoading || !user) {
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
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-gray-700"
              >
                Car Dealership Admin
              </button>
              <span className="text-gray-500">Vehicles</span>
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
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Vehicle Inventory</h2>
            <p className="text-gray-600 mt-1">
              Manage and view all cached vehicles
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dealer Filter */}
              <div>
                <label htmlFor="dealer" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Dealer
                </label>
                <select
                  id="dealer"
                  value={selectedDealer}
                  onChange={(e) => setSelectedDealer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Dealers</option>
                  {dealers.map(dealer => (
                    <option key={dealer} value={dealer}>
                      Dealer {dealer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Stock #, Make, Model, Year..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {filteredVehicles.length} of {vehicles.length} vehicles
              </span>
              {selectedDealer !== 'all' && (
                <button
                  onClick={() => {
                    setSelectedDealer('all');
                    setSearchQuery('');
                  }}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-600">Loading vehicles...</div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-600">No vehicles found</div>
            </div>
          ) : (
            /* Vehicle Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle) => {
                const info = getVehicleInfo(vehicle);
                const stats = getVehicleStats(vehicle.stock_number, vehicle.dealer_number);
                return (
                  <div
                    key={vehicle.id}
                    onClick={() => router.push(`/vehicles/${vehicle.stock_number}?dealer_id=${vehicle.dealer_number}`)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                  >
                    {/* Vehicle Image */}
                    <div className="h-48 bg-gray-200 relative">
                      {info.images.length > 0 ? (
                        <img
                          src={info.images[0]}
                          alt={`${info.year} ${info.make} ${info.model}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                      {/* Dealer Badge */}
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Dealer {vehicle.dealer_number}
                      </div>

                      {/* Message Notification Badge */}
                      {stats.conversations > 0 && (
                        <div className="absolute top-2 left-2 flex gap-2">
                          <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3.293 3.293 3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                            {stats.conversations}
                          </div>
                          {stats.hasAppointment && (
                            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                              ✓
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Vehicle Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {info.year} {info.make} {info.model}
                      </h3>
                      {info.trim && (
                        <p className="text-sm text-gray-600 mb-2">{info.trim}</p>
                      )}

                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-semibold text-gray-900">{info.price}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mileage:</span>
                          <span>{info.mileage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Color:</span>
                          <span>{info.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stock #:</span>
                          <span className="font-mono">{vehicle.stock_number}</span>
                        </div>
                      </div>

                      {/* Conversation Stats */}
                      {stats.conversations > 0 && (
                        <div className="mb-3 p-2 bg-blue-50 rounded-md">
                          <div className="text-xs text-blue-900 font-medium">
                            {stats.conversations} conversation{stats.conversations !== 1 ? 's' : ''} • {stats.messages} message{stats.messages !== 1 ? 's' : ''}
                            {stats.hasAppointment && (
                              <span className="ml-2 text-green-700">• Has appointment</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-gray-200">
                        <button
                          onClick={() => router.push(`/vehicles/${vehicle.stock_number}?dealer_id=${vehicle.dealer_number}`)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
