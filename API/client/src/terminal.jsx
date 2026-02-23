// client/src/terminal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Terminal() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([
    {
      id: 1,
      user: 'John D.',
      topic: 'Web Development',
      message: 'Need help debugging a React component...',
      time: '2m ago',
      priority: 'high'
    },
    {
      id: 2,
      user: 'Sarah M.',
      topic: 'Machine Learning',
      message: 'Can you explain neural network architectures?',
      time: '5m ago',
      priority: 'medium'
    },
    {
      id: 3,
      user: 'Alex T.',
      topic: 'JavaScript',
      message: 'Having issues with async/await in Node.js...',
      time: '8m ago',
      priority: 'medium'
    }
  ]);
  
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('available');
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is logged in and is a worker
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'worker') {
      navigate('/');
      return;
    }
    
    // Simulate a new request coming in
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && status === 'available') {
        const newRequest = {
          id: Date.now(),
          user: ['Emma', 'Liam', 'Olivia', 'Noah'][Math.floor(Math.random() * 4)],
          topic: ['Python', 'Data Science', 'Cloud Computing', 'Mobile Dev'][Math.floor(Math.random() * 4)],
          message: 'Looking for expert advice on...',
          time: 'just now',
          priority: Math.random() > 0.7 ? 'high' : 'medium'
        };
        
        setRequests(prev => [newRequest, ...prev]);
      }
    }, 15000);
    
    return () => clearInterval(interval);
  }, [status, navigate]);
  
  const handleAcceptRequest = (requestId) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    
    // Move request to active chats
    setActiveChats(prev => [...prev, {
      ...request,
      status: 'active',
      startTime: new Date()
    }]);
    
    // Remove from requests
    setRequests(prev => prev.filter(r => r.id !== requestId));
    
    // Set as selected chat
    setSelectedChat(request.id);
    
    // Initialize chat messages
    setMessages([
      {
        id: Date.now(),
        sender: 'user',
        text: request.message,
        timestamp: new Date()
      },
      {
        id: Date.now() + 1,
        sender: 'system',
        text: 'Chat session started',
        timestamp: new Date()
      }
    ]);
  };
  
  const handleDeclineRequest = (requestId) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
  };
  
  const handleSendMessage = () => {
    if (!input.trim() || !selectedChat) return;
    
    // Add user message (from provider perspective, they're sending as AI)
    const newMessage = {
      id: Date.now(),
      sender: 'ai',
      text: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    
    // Simulate user response after a delay
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'user',
        text: "Thanks for your response! That's very helpful.",
        timestamp: new Date()
      }]);
    }, 1500);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    
    // In a real app, this would update status on the server
    // api.post('/api/worker/status', { status: newStatus });
  };
  
  const renderRequests = () => (
    <div className="space-y-3">
      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Requests</h3>
          <p className="text-gray-600">You're all caught up! New requests will appear here when users need assistance.</p>
        </div>
      ) : (
        requests.map(request => (
          <div key={request.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    request.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  } mr-3`}>
                    {request.user.charAt(0)}
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
                <button 
                  onClick={() => handleAcceptRequest(request.id)}
                  className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleDeclineRequest(request.id)}
                  className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
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
    <div className="space-y-3">
      {activeChats.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Chats</h3>
          <p className="text-gray-600">When you accept a request, the chat will appear here for easy access.</p>
        </div>
      ) : (
        activeChats.map(chat => (
          <div 
            key={chat.id}
            onClick={() => setSelectedChat(chat.id)}
            className={`bg-white rounded-lg shadow-sm overflow-hidden border ${
              selectedChat === chat.id ? 'border-emerald-500' : 'border-gray-200'
            } cursor-pointer hover:border-emerald-300 transition-colors`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
                    {chat.user.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{chat.user}</div>
                    <div className="text-sm text-gray-500">{chat.topic}</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              
              <p className="text-gray-600 text-sm line-clamp-1">{chat.message.substring(0, 50)}{chat.message.length > 50 ? '...' : ''}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
  
  const renderChatInterface = () => {
    if (!selectedChat) return null;
    
    const chat = activeChats.find(c => c.id === selectedChat);
    if (!chat) return null;
    
    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
              {chat.user.charAt(0)}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{chat.user}</h3>
              <div className="text-sm text-gray-500">{chat.topic} • Active</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map(message => (
            <div 
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-blue-800 font-medium">{chat.user.charAt(0)}</span>
                </div>
              )}
              
              <div className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === 'user' 
                  ? 'bg-white text-gray-900 rounded-tl-none shadow' 
                  : 'bg-emerald-600 text-white rounded-tr-none'
              }`}>
                <p className="break-words">{message.text}</p>
                <span className="text-xs mt-1 block opacity-70 text-right">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {message.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center ml-2 flex-shrink-0">
                  <span className="text-emerald-800 font-medium">AI</span>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-blue-800 font-medium">{chat.user.charAt(0)}</span>
              </div>
              
              <div className="bg-white rounded-lg p-3 shadow flex items-center">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  rows="1"
                  className="w-full border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 px-4 py-2 pr-10 resize-none"
                  style={{ maxHeight: '100px' }}
                />
              </div>
              
              <button 
                onClick={handleSendMessage}
                disabled={isSending || !input.trim()}
                className={`p-2 rounded-full ${
                  input.trim() ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Shift + Enter for new line</span>
              <span>{input.length}/500</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Sidebar - Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Profile Summary */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                A
              </div>
              <div>
                <div className="font-medium text-gray-900">Alex Johnson</div>
                <div className="text-xs text-gray-500">Tech Expert AI</div>
              </div>
            </div>
            
            <select 
              value={status}
              onChange={e => handleStatusChange(e.target.value)}
              className={`w-full px-2 py-1.5 rounded text-sm ${
                status === 'available' ? 'bg-green-50 text-green-800' : 
                status === 'busy' ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'
              }`}
            >
              <option value="available">Available for Chats</option>
              <option value="busy">Busy - Limited Availability</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-2">
              <button 
                onClick={() => setActiveTab('requests')}
                className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium mb-1 ${
                  activeTab === 'requests' 
                    ? 'bg-emerald-50 text-emerald-800' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </span>
                New Requests
                {requests.length > 0 && (
                  <span className="ml-auto bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                    {requests.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveTab('active')}
                className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium mb-1 ${
                  activeTab === 'active' 
                    ? 'bg-emerald-50 text-emerald-800' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </span>
                Active Chats
                {activeChats.length > 0 && (
                  <span className="ml-auto bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                    {activeChats.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium ${
                  activeTab === 'history' 
                    ? 'bg-emerald-50 text-emerald-800' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                </span>
                Chat History
              </button>
            </nav>
          </div>
          
          {/* Quick Stats */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 bg-white rounded text-center">
                <div className="text-lg font-bold text-gray-900">4.8</div>
                <div className="text-xs text-gray-600">Rating</div>
              </div>
              <div className="p-2 bg-white rounded text-center">
                <div className="text-lg font-bold text-gray-900">2h 15m</div>
                <div className="text-xs text-gray-600">Response Time</div>
              </div>
            </div>
            
            <button className="w-full py-1.5 px-3 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              View Full Profile
            </button>
          </div>
        </div>
        
        {/* Right Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center bg-white">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'requests' && 'New Chat Requests'}
              {activeTab === 'active' && 'Active Chats'}
              {activeTab === 'history' && 'Chat History'}
            </h2>
            
            <div className="flex items-center space-x-2">
              {activeTab === 'active' && (
                <button className="text-sm text-gray-600 hover:text-gray-900">
                  End All Chats
                </button>
              )}
              <button className="text-gray-600 hover:text-gray-900">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.927-1.756 3.353 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.927 0 3.353a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.927 1.756-3.353 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.927 0-3.353a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab !== 'active' ? (
              <div className="h-full w-96 border-r border-gray-200 overflow-y-auto">
                {activeTab === 'requests' && renderRequests()}
                {activeTab === 'history' && (
                  <div className="p-4">
                    <div className="relative mb-4">
                      <input
                        type="text"
                        placeholder="Search chat history..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                          <div className="p-3">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <div className="font-medium text-gray-900">John D. • Web Development</div>
                                <div className="text-sm text-gray-500">
                                  {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                                </div>
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Completed
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-2">Need help debugging a React component...</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            
            {/* Chat Interface */}
            <div className={`h-full ${activeTab === 'active' ? 'flex' : 'hidden md:flex'}`}>
              {activeTab === 'active' ? (
                renderChatInterface()
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-6">
                  <div className="text-5xl mb-4">
                    {activeTab === 'requests' && '📭'}
                    {activeTab === 'history' && '📜'}
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {activeTab === 'requests' && 'Select a Request'}
                    {activeTab === 'history' && 'Select a Chat'}
                  </h3>
                  <p className="text-center text-gray-600">
                    {activeTab === 'requests' && 'Click on a request to view details and accept or decline.'}
                    {activeTab === 'history' && 'Select a chat from your history to view the conversation.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}