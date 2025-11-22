'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestChatBot() {
  const router = useRouter();

  // --- Configuration State ---
  const [config, setConfig] = useState({
    dealer_id: process.env.NEXT_PUBLIC_DEFAULT_DEALER_ID || '305.1',
    dealer_name: 'Demo Dealer', // Static for simulation
    sender: process.env.NEXT_PUBLIC_DEFAULT_SENDER || 'Himel',
    stock_number: process.env.NEXT_PUBLIC_DEFAULT_STOCK_NUMBER || 'N28131',
  });

  // --- Chat & Logic State ---
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // --- NEW: Captured Data State ---
  const [appointment, setAppointment] = useState(null);
  const [detectedPhone, setDetectedPhone] = useState(''); // Auto-fills when AI learns it

  // Auto-scroll
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper: Time Format
  const getCurrentTimeFormatted = () => {
    const now = new Date();
    const pad = (num) => num.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  // --- Load History Function ---
  const loadChatHistory = async () => {
    if (!config.sender) return alert("Please enter a sender name first");

    setIsHistoryLoading(true);

    // 1. CRITICAL: Clear ALL current session data immediately
    setMessages([]);
    setAppointment(null);
    setDetectedPhone('');

    try {
      const headers = { 'Accept': 'application/json' };
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const query = new URLSearchParams({
        sender: config.sender,
        stock_number: config.stock_number,
        dealer_id: config.dealer_id,
        per_page: 50
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages?${query.toString()}`, {
        headers: headers
      });

      const data = await response.json();

      if (response.ok && data.messages) {
        const historyMsgs = [];
        // Sort oldest to newest
        const rawMsgs = data.messages.sort((a, b) => new Date(a.message_time) - new Date(b.message_time));

        rawMsgs.forEach(msg => {
          // User Msg
          historyMsgs.push({
            id: `user-${msg.id}`,
            role: 'user',
            text: msg.message,
            time: msg.message_time
          });

          // AI Msg
          if (msg.ai_response) {
            historyMsgs.push({
              id: `ai-${msg.id}`,
              role: 'ai',
              text: msg.ai_response,
              images: [],
              time: msg.created_at
            });
          }

          // 2. Restore Appointment/Phone State if found in history
          if (msg.appointment) {
            setAppointment(msg.appointment);
            if (msg.appointment.customer_phone) {
              setDetectedPhone(msg.appointment.customer_phone);
            }
          }
        });

        setMessages(historyMsgs);
      } else {
        console.log("No history found or API error");
      }
    } catch (error) {
      console.error("History Error:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // --- Handle Send ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const currentText = inputMessage;
    const currentTime = getCurrentTimeFormatted();

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: currentText,
      time: currentTime,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    const payload = {
      dealer_id: config.dealer_id,
      sender: config.sender,
      stock_number: config.stock_number,
      message: currentText,
      message_time: currentTime,
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (err) {
        console.error("CRITICAL API ERROR: Received HTML instead of JSON");
        throw new Error("Server returned HTML. Check Console.");
      }

      if (response.ok && (data.success || data.reply)) {
        const aiMsg = {
          id: Date.now() + 1,
          role: 'ai',
          text: data.reply,
          images: data.vehicle_images || [],
          time: getCurrentTimeFormatted(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Logic to update Appointment and Phone
        if (data.data && data.data.appointment) {
          setAppointment(data.data.appointment);

          // Update the disabled phone field if found
          if (data.data.appointment.customer_phone) {
            setDetectedPhone(data.data.appointment.customer_phone);
          }

          setMessages((prev) => [...prev, {
            id: Date.now() + 2,
            role: 'system',
            text: `📅 APPOINTMENT DETECTED: ${new Date(data.data.appointment.time).toLocaleString()}`,
            time: getCurrentTimeFormatted(),
          }]);
        }
      } else {
        throw new Error(data.message || 'API Error');
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        text: `System Error: ${error.message}`,
        time: currentTime,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-slate-800 font-sans">

      {/* --- LEFT SIDEBAR: CONTROLS & STATUS --- */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-5 shadow-sm z-10 overflow-y-auto">
        <div className="flex flex-col items-start gap-1">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 mb-4 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
            &larr; Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900">Simulator</h1>
          <p className="text-xs text-gray-500">AI Sales Agent Testing</p>
        </div>

        {/* --- Appointment Status Indicator --- */}
        <div className={`rounded-xl p-4 border transition-all duration-500 ${appointment
          ? 'bg-green-50 border-green-200 shadow-sm'
          : 'bg-gray-50 border-gray-200 border-dashed'
          }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${appointment ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <h3 className={`text-xs font-bold uppercase tracking-wide ${appointment ? 'text-green-700' : 'text-gray-500'}`}>
              {appointment ? 'Appointment Locked' : 'No Appointment'}
            </h3>
          </div>

          {appointment ? (
            <div className="space-y-1">
              <div className="text-lg font-bold text-gray-800">
                {new Date(appointment.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {new Date(appointment.time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Chat to schedule a visit. Status updates automatically.
            </p>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* --- Inputs --- */}
        <div className="space-y-4">

          {/* Dealer Info */}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dealer Name (Read Only)</label>
              <input
                type="text"
                value={config.dealer_name}
                disabled
                className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-500 cursor-not-allowed select-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dealer ID</label>
              <input
                type="text"
                value={config.dealer_id}
                onChange={(e) => setConfig({ ...config, dealer_id: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Customer Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.sender}
                onChange={(e) => setConfig({ ...config, sender: e.target.value })}
                className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={loadChatHistory}
                disabled={isHistoryLoading || !config.sender}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 rounded-md text-xs font-semibold border border-gray-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Load History"
              >
                {isHistoryLoading ? '...' : 'History'}
              </button>
            </div>
          </div>

          {/* Phone - Auto Detected */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex justify-between">
              <span>Client Phone</span>
              {detectedPhone && <span className="text-green-600 text-[9px] bg-green-50 px-1 rounded">AI DETECTED</span>}
            </label>
            <input
              type="text"
              value={detectedPhone || 'Waiting for user input...'}
              disabled
              className={`w-full p-2 border rounded-md text-sm font-mono cursor-not-allowed transition-colors ${detectedPhone
                  ? 'bg-green-50 border-green-200 text-green-800 font-bold'
                  : 'bg-gray-50 border-gray-200 text-gray-400 italic'
                }`}
            />
          </div>

          {/* Stock Number */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stock Number</label>
            <input
              type="text"
              value={config.stock_number}
              onChange={(e) => setConfig({ ...config, stock_number: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => { setMessages([]); setAppointment(null); setDetectedPhone(''); }}
          className="mt-auto py-2 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-md text-sm transition-colors w-full"
        >
          Clear / Reset
        </button>
      </div>

      {/* --- RIGHT SIDE: CHAT --- */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full shadow-2xl bg-white my-4 rounded-xl overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              AI
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Sales Assistant</h3>
              <div className="flex items-center gap-3">
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                </p>
                <span className="text-[10px] text-gray-400">Model: GPT-4o-mini</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          {messages.length === 0 && !isHistoryLoading && (
            <div className="text-center text-gray-400 mt-20">
              <p>Start typing to test the appointment logic.</p>
              <p className="text-xs mt-2">Try: "Can I come see this car tomorrow at 10am?"</p>
            </div>
          )}

          {isHistoryLoading && (
            <div className="flex justify-center mt-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center my-2">
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200 shadow-sm">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : msg.role === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Images */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {msg.images.map((img, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={img}
                          alt="Vehicle"
                          className="rounded-lg w-full h-28 object-cover border border-gray-200 hover:opacity-90 cursor-pointer"
                        />
                      ))}
                    </div>
                  )}

                  <span className={`text-[10px] mt-2 block opacity-70 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                    {msg.role === 'user' ? config.sender : 'AI Agent'} • {msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              )}
            </div>
          ))}

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

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-50 text-gray-800 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              <span>Send</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}