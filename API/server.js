import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from './api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [room, setRoom] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch all chats on component mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await api.get('/api/client/chats');
        setChats(res.data);
      } catch (err) {
        console.error('Failed to fetch chats:', err);
      }
    };
    fetchChats();
  }, []);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchChatMessages(selectedChat);
    }
  }, [selectedChat]);

  const fetchChatMessages = async (chatId) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/client/chats/${chatId}/messages`);
      setMessages(res.data);
      setRoom(chatId);
      
      // Join the socket room
      const socket = socketRef.current;
      if (socket) {
        socket.emit('join_chat_room', chatId);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setSelectedChat(null);
    setMessages([]);
    setRoom(null);
    setIsWaiting(false);
    setInput('');
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
      
      // Refresh chats list
      api.get('/api/client/chats').then(res => setChats(res.data)).catch(console.error);
    };

    const onReceiveMessage = (msg) => {
      if (msg.sender === 'ai') {
        setMessages(prev => [...prev, msg]);
      }
    };

    const onActiveChatData = (data) => {
      setRoom(data.room);
      setMessages(data.messages);
      setSelectedChat(data.room);
      socket.emit('join_chat_room', data.room);
    };

    const onChatEnded = () => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        sender: 'system', 
        text: 'The chat has ended.' 
      }]);
      setRoom(null);
      setSelectedChat(null);
      
      // Refresh chats list
      api.get('/api/client/chats').then(res => setChats(res.data)).catch(console.error);
    };

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

    const newMsg = { 
      id: Date.now(), 
      sender: 'user', 
      text: input, 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, newMsg]);

    const socket = socketRef.current;
    if (socket) {
      if (!room && !selectedChat) {
        setIsWaiting(true);
        socket.emit('request_chat', { text: input });
      } else {
        socket.emit('send_message', { room: room || selectedChat, text: input, sender: 'user' });
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

  const getChatTitle = (chat) => {
    if (chat.provider_name) {
      return `Chat with ${chat.provider_name}`;
    }
    if (chat.last_message) {
      return chat.last_message.substring(0, 30) + (chat.last_message.length > 30 ? '...' : '');
    }
    return `Chat from ${formatDate(chat.created_at)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">HumanAI Assistant</h2>
          <button
            onClick={startNewChat}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat List Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No chats yet</p>
                <p className="text-sm mt-2">Click "New Chat" to start a conversation</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat === chat.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-gray-900 truncate flex-1">
                        {getChatTitle(chat)}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(chat.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    {chat.last_message && (
                      <p className="text-sm text-gray-600 truncate">
                        {chat.last_message}
                      </p>
                    )}
                    <div className="flex items-center mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        chat.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : chat.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {chat.message_count || 0} messages • {chat.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-gray-200 px-4 py-3 bg-white">
                  <h3 className="font-medium text-gray-900">
                    {chats.find(c => c.id === selectedChat)?.provider_name 
                      ? `Chat with ${chats.find(c => c.id === selectedChat)?.provider_name}`
                      : 'Chat'
                    }
                  </h3>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loading ? (
                    <div className="text-center text-gray-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">No messages yet</div>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : m.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                        {m.sender === 'system' ? (
                          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.text}</span>
                        ) : (
                          <div className={`max-w-[70%] rounded-lg p-3 ${
                            m.sender === 'user' 
                              ? 'bg-emerald-600 text-white rounded-tr-none' 
                              : 'bg-gray-100 text-gray-900 rounded-tl-none'
                          }`}>
                            <p className="break-words">{m.text}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={isWaiting ? "Searching for provider..." : "Type your message..."}
                      className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={isWaiting}
                    />
                    <button
                      onClick={handleSend}
                      disabled={isWaiting || !input.trim()}
                      className="bg-emerald-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-emerald-700 disabled:bg-gray-300"
                    >
                      ↑
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg">Select a chat or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}