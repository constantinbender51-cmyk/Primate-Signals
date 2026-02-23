import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from './api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [room, setRoom] = useState(null);
  const [oldChats, setOldChats] = useState([]);
  const [showOldChats, setShowOldChats] = useState(false);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch old chats
  useEffect(() => {
    const fetchOldChats = async () => {
      try {
        const res = await api.get('/api/client/chats');
        setOldChats(res.data);
      } catch (err) {
        console.error('Failed to fetch old chats:', err);
      }
    };
    fetchOldChats();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const socket = io({ transports: ['websocket'], auth: { token } });
    socketRef.current = socket;

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
        text: 'Chat ended.' 
      }]);
      setRoom(null);
      // Refresh old chats list
      api.get('/api/client/chats').then(res => setOldChats(res.data)).catch(console.error);
    };

    socket.on('chat_started', onChatStarted);
    socket.on('receive_message', onReceiveMessage);
    socket.on('active_chat_data', onActiveChatData);
    socket.on('chat_ended', onChatEnded);

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const loadOldChat = async (chatId) => {
    try {
      const res = await api.get(`/api/client/chats/${chatId}/messages`);
      setMessages(res.data);
      setRoom(chatId);
      setShowOldChats(false);
      
      // Join the room
      const socket = socketRef.current;
      if (socket) {
        socket.emit('join_chat_room', chatId);
      }
    } catch (err) {
      console.error('Failed to load old chat:', err);
    }
  };

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

  const startNewChat = () => {
    setMessages([]);
    setRoom(null);
    setShowOldChats(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between border-b">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold">HumanAI Assistant</h2>
            {room && (
              <button
                onClick={startNewChat}
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowOldChats(!showOldChats)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History ({oldChats.length})
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isWaiting ? 'bg-yellow-100 text-yellow-800' : 
              room ? 'bg-green-100 text-green-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {isWaiting ? 'Searching...' : room ? 'Connected' : 'New Chat'}
            </span>
          </div>
        </div>

        {/* Old Chats Dropdown */}
        {showOldChats && oldChats.length > 0 && (
          <div className="bg-white border-b shadow-sm">
            <div className="p-2 max-h-48 overflow-y-auto">
              {oldChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => loadOldChat(chat.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Chat with {chat.provider_name || 'Provider'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(chat.updated_at).toLocaleDateString()} • {chat.message_count || 0} messages
                    </div>
                  </div>
                  <span className="text-xs text-emerald-600 opacity-0 group-hover:opacity-100">
                    Open →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isWaiting && !room && (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg">Type a message to start chatting</p>
                <p className="text-sm mt-2">or select a past conversation from history</p>
              </div>
            </div>
          )}
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

        {/* Input */}
        <div className="bg-white border-t p-4 flex">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={room ? "Type your message..." : "Ask a question to start..."}
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isWaiting}
          />
          <button 
            onClick={handleSend} 
            className="ml-3 bg-emerald-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-emerald-700 disabled:bg-gray-300" 
            disabled={isWaiting || !input.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}