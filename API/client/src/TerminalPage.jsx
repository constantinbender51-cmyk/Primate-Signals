import React, { useState, useEffect } from 'react';

export default function TerminalPage() {
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
  
  useEffect(() => {
    // In a real app, this would set up a WebSocket connection
    // to receive real-time chat requests
    
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
  }, [status]);
  
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
    // api.post('/api/provider/status', { status: newStatus });
  };
  
  const renderRequests = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {requests.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#64758b'
        }}>
          <div style={{
            fontSize: '2rem',
            marginBottom: '10px'
          }}>
            🕒
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#111827'
          }}>
            No Active Requests
          </h3>
          <p>
            You're all caught up! New requests will appear here when users need assistance.
          </p>
        </div>
      ) : (
        requests.map(request => (
          <div key={request.id} style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '15px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: request.priority === 'high' 
              ? '4px solid #ef4444' 
              : '4px solid #3b82f6'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {request.user.charAt(0)}
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#111827'
                  }}>
                    {request.user}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64758b'
                  }}>
                    {request.topic}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#64758b',
                textAlign: 'right'
              }}>
                {request.time}
              </div>
            </div>
            
            <p style={{
              color: '#4b5563',
              marginBottom: '12px',
              lineHeight: '1.4'
            }}>
              {request.message}
            </p>
            
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <button 
                onClick={() => handleAcceptRequest(request.id)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Accept
              </button>
              <button 
                onClick={() => handleDeclineRequest(request.id)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: '#f1f5f9',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Decline
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
  
  const renderActiveChats = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {activeChats.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#64758b'
        }}>
          <div style={{
            fontSize: '2rem',
            marginBottom: '10px'
          }}>
            💬
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#111827'
          }}>
            No Active Chats
          </h3>
          <p>
            When you accept a request, the chat will appear here for easy access.
          </p>
        </div>
      ) : (
        activeChats.map(chat => (
          <div 
            key={chat.id}
            onClick={() => setSelectedChat(chat.id)}
            style={{
              backgroundColor: selectedChat === chat.id ? '#ecfdf5' : '#fff',
              borderRadius: '10px',
              padding: '15px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              border: selectedChat === chat.id ? '1px solid #10b981' : 'none'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {chat.user.charAt(0)}
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#111827'
                  }}>
                    {chat.user}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64758b'
                  }}>
                    {chat.topic}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#64758b',
                textAlign: 'right'
              }}>
                Active
              </div>
            </div>
            
            <p style={{
              color: '#4b5563',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {chat.message.substring(0, 50)}{chat.message.length > 50 ? '...' : ''}
            </p>
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {chat.user.charAt(0)}
            </div>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {chat.user}
              </h3>
              <div style={{
                fontSize: '0.85rem',
                color: '#64758b'
              }}>
                {chat.topic} • Active
              </div>
            </div>
          </div>
          
          <button style={{
            padding: '6px 12px',
            backgroundColor: '#f1f5f9',
            border: 'none',
            borderRadius: '6px',
            color: '#4b5563',
            cursor: 'pointer'
          }}>
            End Chat
          </button>
        </div>
        
        {/* Messages Area */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#f9fafb'
        }}>
          {messages.map(message => (
            <div 
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: message.sender === 'user' ? 'row' : 'row-reverse',
                gap: '10px'
              }}
            >
              {message.sender === 'user' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {chat.user.charAt(0)}
                </div>
              )}
              
              <div style={{
                maxWidth: '70%',
                backgroundColor: message.sender === 'user' ? '#fff' : '#10b981',
                color: message.sender === 'user' ? '#111827' : 'white',
                padding: '10px 14px',
                borderRadius: message.sender === 'user' 
                  ? '8px 8px 8px 0' 
                  : '8px 8px 0 8px'
              }}>
                {message.text}
              </div>
              
              {message.sender === 'ai' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  AI
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div style={{
              display: 'flex',
              gap: '10px',
              maxWidth: '70%',
              alignSelf: 'flex-start'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {chat.user.charAt(0)}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '6px 10px',
                backgroundColor: '#fff',
                borderRadius: '8px 8px 8px 0'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'typing 1s infinite'
                }} />
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'typing 1s infinite 0.2s'
                }} />
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'typing 1s infinite 0.4s'
                }} />
              </div>
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <button style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                😊
              </button>
              <div style={{
                flex: 1,
                position: 'relative'
              }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    resize: 'none',
                    minHeight: '40px',
                    maxHeight: '120px'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '10px',
                  fontSize: '0.8rem',
                  color: '#94a3b8'
                }}>
                  Shift + Enter for new line
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button style={{
                  padding: '6px 12px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}>
                  Quick Responses
                </button>
                <button style={{
                  padding: '6px 12px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}>
                  Session Notes
                </button>
              </div>
              
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim()}
                style={{
                  padding: '8px 20px',
                  backgroundColor: !input.trim() ? '#cbd5e1' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: !input.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }