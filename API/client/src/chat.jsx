// client/src/chat.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [aiStatus, setAiStatus] = useState('online');
  const [typing, setTyping] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const navigate = useNavigate();
  
  // Mock providers data
  const providers = [
    { id: 1, name: 'Alex', specialty: 'Technology', rating: 4.8, status: 'online' },
    { id: 2, name: 'Sarah', specialty: 'Business', rating: 4.6, status: 'online' },
    { id: 3, name: 'Michael', specialty: 'Health', rating: 4.9, status: 'busy' },
    { id: 4, name: 'Emily', specialty: 'Education', rating: 4.7, status: 'offline' }
  ];

  useEffect(() => {
    // Check if user is logged in and has subscription
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'client' || !user.subscription || user.subscription.status !== 'active') {
      navigate('/subscription');
      return;
    }
    
    // Simulate loading chat history
    setTimeout(() => {
      setMessages([
        { id: 1, sender: 'ai', text: "Hello! I'm your human-powered AI assistant. How can I help you today?", timestamp: Date.now() - 120000 },
        { id: 2, sender: 'user', text: "Hi there! I'm interested in learning more about your services.", timestamp: Date.now() - 60000 },
        { id: 3, sender: 'ai', text: "Great! Our platform connects you with real people who provide thoughtful, human responses to your questions. How can I assist you specifically?", timestamp: Date.now() - 30000 }
      ]);
      setIsLoading(false);
    }, 800);
  }, [navigate]);
  
  // Simulate AI typing
  useEffect(() => {
    if (typing) {
      const timer = setTimeout(() => {
        setTyping(false);
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          sender: 'ai', 
          text: "I'm here to help! What would you like to know about?", 
          timestamp: Date.now()
        }]);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [typing]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    setIsSending(true);
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(false);
    
    // Simulate AI response
    setTyping(true);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Chat Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button 
                  onClick={() => navigate('/')}
                  className="mr-4 text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                
                {selectedProvider ? (
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedProvider.status === 'online' ? 'bg-emerald-100' : 
                      selectedProvider.status === 'busy' ? 'bg-yellow-100' : 'bg-gray-100'
                    } mr-3`}>
                      <span className="font-medium text-gray-800">
                        {selectedProvider.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedProvider.name}</h2>
                      <p className="text-sm text-gray-500">{selectedProvider.specialty}</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      onChange={e => setSelectedProvider(providers.find(p => p.id === parseInt(e.target.value)))}
                      className="appearance-none bg-transparent border-b border-gray-300 focus:outline-none focus:border-emerald-500 pl-0 pr-8"
                      defaultValue=""
                    >
                      <option value="" disabled>Select a provider</option>
                      {providers.map(provider => (
                        <option 
                          key={provider.id} 
                          value={provider.id}
                          className="py-2"
                        >
                          {provider.name} • {provider.specialty} • {provider.rating}★
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <button className="text-gray-500 hover:text-gray-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L21 17M4 12a2 2 0 012-2m0 0a6 6 0 017.743-5.743M21 12H9m-6 0a2 2 0 002 2" />
                  </svg>
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="h-[70vh] overflow-y-auto bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
          {messages.map(message => (
            <div 
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              {message.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-medium text-emerald-800">
                    {selectedProvider ? selectedProvider.name.charAt(0) : 'AI'}
                  </span>
                </div>
              )}
              
              <div className={`max-w-[70%] rounded-lg p-4 ${
                message.sender === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-900 rounded-tl-none shadow'
              }`}>
                <p className="break-words">{message.text}</p>
                <span className="text-xs mt-1 block opacity-70">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ml-3 flex-shrink-0">
                  <span className="font-medium text-blue-800">U</span>
                </div>
              )}
            </div>
          ))}
          
          {typing && (
            <div className="flex justify-start mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="font-medium text-emerald-800">
                  {selectedProvider ? selectedProvider.name.charAt(0) : 'AI'}
                </span>
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
        <div className="bg-white border-t border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button className="text-gray-400 hover:text-gray-600 mr-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="w-full border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 px-4 py-2 pr-10"
              />
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-emerald-500"
                onClick={handleSend}
                disabled={isSending || !input.trim()}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            
            <button className="text-gray-400 hover:text-gray-600 ml-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}