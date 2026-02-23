import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from './api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [room, setRoom] = useState(null); // room is the chatId
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'history'
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedHistoryChat, setSelectedHistoryChat] = useState(null);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, historyMessages]);

  // Fetch chat history on component mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await api.get('/api/client/chats');
        setChatHistory(res.data);
      } catch (err) {
        console.error('Failed to fetch chat history:', err);
      }
    };
    fetchChatHistory();
  }, []);

  // Fetch messages for a specific history chat
  const fetchHistoryMessages = async (chatId) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/api/client/chats/${chatId}/messages`);
      setHistoryMessages(res.data);
      setSelectedHistoryChat(chatId);
    } catch (err) {
      console.error('Failed to fetch history messages:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Resume a past chat
  const handleResumeChat = async (chatId) => {
    try {
      const res = await api.post(`/api/client/chats/${chatId}/resume`);
      if (res.data.success) {
        // Switch to current chat tab and set up the room
        setActiveTab('current');
        setRoom(chatId);
        setMessages(res.data.messages || []);
        
        // Join the socket room
        const socket = socketRef.current;
        if (socket) {
          socket.emit('join_chat_room', chatId);
        }
        
        // Show success message
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'system',
          text: 'Chat resumed. You can continue your conversation.',
          timestamp: new Date()
        }]);
        
        // Refresh history to show updated status
        const historyRes = await api.get('/api/client/chats');
        setChatHistory(historyRes.data);
      }
    } catch (err) {
      console.error('Failed to resume chat:', err);
      alert('Could not resume chat. The provider might be unavailable.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);

    // Initialize socket connection with auth token
    const socket = io({ transports: ['websocket'], auth: { token } });
    socketRef.current = socket;

    // --- Event Handlers ---
    const onChatStarted = (data) => {
      setIsWaiting(false);
      setRoom(data.room);
      socket.emit('join_chat_room', data.room);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'system',
        text: 'A Human AI Provider has connected.',
        timestamp: new Date()
      }]);
    };

    const onReceiveMessage = (msg) => {
      if (msg.sender === 'ai') {
        setMessages(prev => [...prev, msg]);
      }
    };

    const onActiveChatData = (data) => {
        setRoom(data.room);
        setMessages(data.messages);
        socket.emit('join_chat_room', data.room);
    };

    const onChatEnded = () => {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          sender: 'system', 
          text: 'The chat has ended. You can start a new conversation or view past chats in History.' 
        }]);
        setRoom(null);
        
        // Refresh chat history to include the ended chat
        api.get('/api/client/chats')
          .then(res => {
            // Merge with existing history, avoiding duplicates
            setChatHistory(prev => {
              const newHistory = res.data;
              // Create a map of existing chats by ID
              const existingMap = new Map(prev.map(chat => [chat.id, chat]));
              // Update with new data
              newHistory.forEach(chat => existingMap.set(chat.id, chat));
              // Convert back to array and sort by updated_at
              return Array.from(existingMap.values())
                .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            });
          })
          .catch(console.error);
    }

    // --- Attach Listeners ---
    socket.on('chat_started', onChatStarted);
    socket.on('receive_message', onReceiveMessage);
    socket.on('active_chat_data', onActiveChatData);
    socket.on('chat_ended', onChatEnded);

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const user = JSON.parse(localStorage.getItem('user'));
    
    const newMsg = { 
      id: Date.now(), 
      sender: 'user', 
      text: input, 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, newMsg]);

    const socket = socketRef.current;
    if (socket) {
        if (!room) {
          setIsWaiting(true);
          socket.emit('request_chat', { text: input });
        } else {
          socket.emit('send_message', { room, text: input, sender: 'user' });
        }
    }
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto flex flex-col h-screen">
        {/* Header with tabs */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">HumanAI Assistant</h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => setActiveTab('current')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'current' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Current Chat
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'history' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                History ({chatHistory.length})
              </button>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isWaiting ? 'bg-yellow-100 text-yellow-800' : 
              room ? 'bg-green-100 text-green-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {isWaiting ? 'Searching...' : room ? 'Connected' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Main content area */}
        {activeTab === 'current' ? (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : m.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                  {m.sender === 'system' ? (
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.text}</span>
                  ) : (
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      m.sender === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-900 shadow rounded-tl-none'
                    }`}>
                      <p className="break-words">{m.text}</p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="bg-white border-t p-4 flex">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={room ? "Type your message..." : "Ask your first question to find a provider..."}
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={room && isWaiting}
              />
              <button 
                onClick={handleSend} 
                className="ml-3 bg-emerald-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-emerald-700 disabled:bg-gray-300" 
                disabled={room && isWaiting}
              >
                ↑
              </button>
            </div>
          </>
        ) : (
          /* History tab */
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Chat History</h3>
            
            {chatHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-lg font-medium text-gray-600 mb-2">No chat history yet</p>
                <p className="text-sm text-gray-500">Start a conversation to see your past chats here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatHistory.map(chat => (
                  <div 
                    key={chat.id} 
                    className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:border-emerald-300 transition-colors ${
                      chat.status === 'active' ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold mr-3">
                            {chat.provider_name?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {chat.provider_name || 'Previous Chat'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(chat.updated_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {chat.status === 'active' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Active
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            chat.status === 'closed' ? 'bg-gray-100 text-gray-600' : 
                            chat.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {chat.message_count || 0} messages
                          </span>
                        </div>
                      </div>
                      
                      {/* Preview of last message */}
                      {chat.last_message && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2 bg-gray-50 p-2 rounded">
                          "{chat.last_message}"
                        </p>
                      )}
                      
                      <button
                        onClick={() => handleResumeChat(chat.id)}
                        disabled={chat.status === 'active'}
                        className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                          chat.status === 'active'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {chat.status === 'active' ? 'Currently Active' : 'Resume This Chat'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}