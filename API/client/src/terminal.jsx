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
              
              <div className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === 'user' 
                  ? 'bg-white text-gray-900 rounded-tl-none shadow-sm border border-gray-100' 
                  : 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
              }`}>
                <p className="break-words">{message.text}</p>
              </div>
              
              {message.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center ml-2 flex-shrink-0">
                  <span className="text-emerald-800 font-bold text-xs">AI</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Input */}
        <div className="border-t border-gray-200 px-4 py-3 bg-white">
          <div className="flex items-center space-x-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response as the AI..."
              rows="1"
              className="flex-1 border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500 px-4 py-2 resize-none"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className={`p-2 rounded-full h-10 w-10 flex items-center justify-center ${
                input.trim() ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-400'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex h-screen overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        
        {/* Profile Summary */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold mr-3">AI</div>
            <div>
              <div className="font-medium text-gray-900">Provider Terminal</div>
              <div className="text-xs text-green-600 font-medium flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Live Socket Connected
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="p-2 border-b border-gray-200 flex space-x-1">
          <button onClick={() => setActiveTab('requests')} className={`flex-1 py-2 text-xs font-medium rounded-md ${activeTab === 'requests' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            Requests {requests.length > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full">{requests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-2 text-xs font-medium rounded-md ${activeTab === 'active' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            Active {Object.keys(activeChats).length > 0 && <span className="ml-1 bg-emerald-500 text-white px-1.5 rounded-full">{Object.keys(activeChats).length}</span>}
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 text-xs font-medium rounded-md ${activeTab === 'history' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            History
          </button>
        </nav>
        
        {/* Dynamic List Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {activeTab === 'requests' && renderRequests()}
          {activeTab === 'active' && renderActiveChats()}
          {activeTab === 'history' && renderHistory()}
        </div>

      </div>
      
      {/* RIGHT CONTENT AREA (CHAT) */}
      <div className="flex-1 flex flex-col bg-white">
        {activeTab === 'active' && selectedChat ? (
          renderChatInterface()
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6 bg-gray-50">
            <div className="text-6xl mb-4 opacity-50">
              {activeTab === 'requests' ? '📡' : activeTab === 'history' ? '📚' : '🤖'}
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              {activeTab === 'requests' ? 'Listening for Users...' : activeTab === 'history' ? 'Session History' : 'Select a Chat'}
            </h3>
            <p className="text-center text-gray-500 max-w-sm">
              {activeTab === 'requests' 
                ? 'When a user needs AI assistance, their request will appear in the sidebar.' 
                : 'Choose an active conversation from the sidebar to start replying as the AI.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}