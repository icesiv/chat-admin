'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestChatBot() {
  const router = useRouter();
  // --- State for Configuration (Sidebar) ---
  // Initialized with values from .env.local
  const [config, setConfig] = useState({
    dealer_id: process.env.NEXT_PUBLIC_DEFAULT_DEALER_ID || '',
    sender: process.env.NEXT_PUBLIC_DEFAULT_SENDER || '',
    stock_number: process.env.NEXT_PUBLIC_DEFAULT_STOCK_NUMBER || '',
  });

  // --- State for Chat ---
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom of chat
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Helper: Get Current Time in YYYY-MM-DD HH:mm:ss format ---
  const getCurrentTimeFormatted = () => {
    const now = new Date();
    const pad = (num) => num.toString().padStart(2, '0');

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // --- Handle Send Message ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const currentText = inputMessage;
    const currentTime = getCurrentTimeFormatted();

    // 1. Add User Message to UI immediately
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: currentText,
      time: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // 2. Prepare Payload
    const payload = {
      dealer_id: config.dealer_id,
      sender: config.sender,
      stock_number: config.stock_number,
      message: currentText,
      message_time: currentTime,
    };

    // 3. Prepare Headers with Auth Token
    const headers = {
      'Content-Type': 'application/json',
    };

    // Get token from localStorage (safely check for window object)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      // 4. Call the API using Env URL
      // Note: We append '/messages' to the base URL from env
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/messages`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.reply)) {
        // 5. Add AI Response to UI
        const aiMsg = {
          id: Date.now() + 1,
          role: 'ai',
          text: data.reply,
          images: data.vehicle_images || [],
          time: getCurrentTimeFormatted(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        console.error("API Error:", data);
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          role: 'system',
          text: `Error: ${data.message || 'Request failed'}`,
          time: currentTime,
        }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'system',
        text: 'Error: Could not connect to the API. Check console.',
        time: currentTime,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-slate-800 font-sans">

      {/* --- LEFT SIDEBAR: CONFIGURATION --- */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 shadow-sm z-10">
        <div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-xl mt-2 font-bold text-gray-900">
            Response Tester
          </h1>

          <p className="text-xs text-gray-500">Admin Simulation Console</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Dealer ID</label>
            <input
              type="text"
              value={config.dealer_id}
              onChange={(e) => setConfig({ ...config, dealer_id: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Customer Name</label>
            <input
              type="text"
              value={config.sender}
              onChange={(e) => setConfig({ ...config, sender: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Stock Number</label>
            <input
              type="text"
              value={config.stock_number}
              onChange={(e) => setConfig({ ...config, stock_number: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => setMessages([])}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-sm transition-colors"
          >
            Clear Chat History
          </button>
        </div>
      </div>

      {/* --- RIGHT SIDE: CHAT INTERFACE --- */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full shadow-2xl bg-white my-4 rounded-xl overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              AI
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Sales Agent</h3>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p>Start the simulation to test the AI response.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : msg.role === 'system'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {/* Display Images if AI sends them */}
                {msg.images && msg.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {msg.images.map((img, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={img}
                        alt="Vehicle"
                        className="rounded-lg w-full h-32 object-cover border border-gray-200"
                      />
                    ))}
                  </div>
                )}

                <span className={`text-[10px] mt-2 block opacity-70 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                  {msg.role === 'user' ? config.sender : 'Dealer'} • {msg.time.split(' ')[1]}
                </span>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-100 text-gray-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
            >
              Send
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}