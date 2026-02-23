import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

export default function Terminal() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [activeChats, setActiveChats] = useState({});
  const [history, setHistory] = useState([]); // Stores ended chats
  const [selectedChat, setSelectedChat] = useState(null);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('available');
  const navigate = useNavigate();
  const socketRef = useRef();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return navigate('/login');

    // Connect to WebSocket
    socketRef.current = io('');

    // 1. Listen for new requests from clients
    socketRef.current.on('new_request', (req) => {
      setRequests(prev => [...prev, req]);
    });

    // 2. Remove request if another worker takes it or client disconnects
    socketRef.current.on('request_removed', (reqId) => {
      setRequests(prev => prev.filter(r => r.id !== reqId));
    });

    // 3. Receive messages from clients
    socketRef.current.on('receive_message', (msg) => {
      if (msg.sender === 'user') {
        setActiveChats(prev => ({
          ...prev,
          [msg.room]: {
            ...prev[msg.room],
            messages: [...(prev[msg.room]?.messages || []), msg]
          }
        }));
      }
    });

    return () => socketRef.current.disconnect();
  }, [navigate]);

  // --- ACTIONS ---

  const handleAcceptRequest = (req) => {
    // Tell server we took the chat
    socketRef.current.emit('accept_request', req.id);
    
    // Move to active chats
    setActiveChats(prev => ({
      ...prev,
      [req.id]: {
        room: req.id,
        user: req.user,
        topic: req.topic,
        messages: [{ id: Date.now(), sender: 'user', text: req.message, timestamp: new Date() }]
      }
    }));
    
    // Remove from incoming requests, switch tab, and select it
    setRequests(prev => prev.filter(r => r.id !== req.id));
    setActiveTab('active');
    setSelectedChat(req.id);
  };

  const handleDeclineRequest = (requestId) => {
    // Just hide it from this worker's screen
    setRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleEndChat = () => {
    if (!selectedChat) return;
    
    const chatToArchive = activeChats[selectedChat];
    // Move to history
    setHistory(prev => [chatToArchive, ...prev]);
    
    // Remove from active
    const newActive = { ...activeChats };
    delete newActive[selectedChat];
    setActiveChats(newActive);
    setSelectedChat(null);
  };

  const handleSendMessage = () => {
    if (!input.trim() || !selectedChat) return;

    const newMsg = { 
      id: Date.now(), 
      sender: 'ai', 
      text: input, 
      room: selectedChat,
      timestamp: new Date()
    };
    
    // Add locally instantly
    setActiveChats(prev => ({
      ...prev,
      [selectedChat]: {
        ...prev[selectedChat],
        messages: [...prev[selectedChat].messages, newMsg]
      }
    }));

    // Send to client via WebSockets
    socketRef.current.emit('send_message', newMsg);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- RENDER HELPERS ---

  const renderRequests = () => (
    <div className="space-y-3 p-4">
      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Requests</h3>
          <p className="text-gray-600">You're all caught up! New requests will appear here live.</p>
        </div>
      ) : (
        requests.map(request => (
          <div key={request.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-800 mr-3 font-bold">
                    {request.user.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{request.user}</div>
                    <div className="text-sm text-gray-500">{request.topic}</div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{request.time}</span>
              </div>
              <p className="text-gray-700 mb-3 line-clamp-2">{request.message}</p>
              <div className="flex space-x-2">
                <button onClick={() => handleAcceptRequest(request)} className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium">
                  Accept
                </button>
                <button onClick={() => handleDeclineRequest(request.id)} className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
  
  const renderActiveChats = () => (
    <div className="space-y-3 p-4">
      {Object.values(activeChats).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Chats</h3>
          <p className="text-gray-600">When you accept a request, the chat will appear here.</p>
        </div>
      ) : (
        Object.values(activeChats).map(chat => (
          <div 
            key={chat.room}
            onClick={() => setSelectedChat(chat.room)}
            className={`bg-white rounded-lg shadow-sm overflow-hidden border ${selectedChat === chat.room ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'} cursor-pointer hover:border-emerald-300 transition-colors`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-3">
                    {chat.user.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{chat.user}</div>
                    <div className="text-sm text-gray-500">{chat.topic}</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>
              </div>
              <p className="text-gray-600 text-sm line-clamp-1">
                {chat.messages[chat.messages.length - 1]?.text.substring(0, 50)}...
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 space-y-3">
      {history.length === 0 ? (
         <div className="text-center py-12 text-gray-500">
           <div className="text-4xl mb-4">📜</div>
           <h3 className="text-lg font-medium text-gray-900 mb-1">No History</h3>
           <p className="text-gray-600">Chats you end will appear here.</p>
         </div>
      ) : (
        history.map((chat, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 opacity-75">
            <div className="p-3">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="font-medium text-gray-900">{chat.user} • {chat.topic}</div>
                  <div className="text-sm text-gray-500">
                    {chat.messages.length} messages exchanged
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Completed
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderChatInterface = () => {
    if (!selectedChat || !activeChats[selectedChat]) return null;
    const chat = activeChats[selectedChat];
    
    return (
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-3">
              {chat.user.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{chat.user}</h3>
              <div className="text-sm text-gray-500">{chat.topic} • Active</div>
            </div>
          </div>
          <button onClick={handleEndChat} className="text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md font-medium">
            End Chat
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {chat.messages.map(message => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-blue-800 font-bold text-xs">{chat.user.charAt(0).toUpperCase()}</span>
                </div>
              )}