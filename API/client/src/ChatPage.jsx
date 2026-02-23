import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = setIsSending(false);
  const [aiStatus, setAiStatus] = useState('online');
  const [typing, setTyping] = useState(false);
  
  // Mock data for demo purposes
  useEffect(() => {
    const loadChat = async () => {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setMessages([
          { id: 1, sender: 'ai', text: "Hello! I'm your human-powered AI assistant. How can I help you today?", timestamp: new Date().getTime() - 120000 },
          { id: 2, sender: 'user', text: "Hi there! I'm interested in learning more about your services.", timestamp: new Date().getTime() - 60000 },
          { id: 3, sender: 'ai', text: "Great! Our platform connects you with real people who provide thoughtful, human responses to your questions. How can I assist you specifically?", timestamp: new Date().getTime() - 30000 }
        ]);
        setIsLoading(false);
      }, 800);
    };
    
    loadChat();
  }, [chatId]);
  
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
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f9fafb'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            AI
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#111827'
            }}>
              Human AI Assistant
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.85rem',
              color: aiStatus === 'online' ? '#10b981' : '#9ca3af'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: aiStatus === 'online' ? '#10b981' : '#9ca3af'
              }} />
              <span>{aiStatus === 'online' ? 'Online' : 'Offline'}</span>
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
        padding: '1.5rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {messages.map(message => (
          <div 
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
              gap: '0.75rem',
              maxWidth: '80%',
              alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {message.sender === 'ai' && (
              <div style={{
                width: '32px',
                height: '32px',
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
            
            <div>
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: message.sender === 'user' ? '#10b981' : '#fff',
                color: message.sender === 'user' ? 'white' : '#111827',
                borderRadius: message.sender === 'user' 
                  ? '12px 4px 12px 12px' 
                  : '4px 12px 12px 12px',
                maxWidth: '100%',
                wordBreak: 'break-word'
              }}>
                {message.text}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                textAlign: message.sender === 'user' ? 'right' : 'left',
                marginTop: '0.25rem'
              }}>
                {formatTime(message.timestamp)}
              </div>
            </div>
            
            {message.sender === 'user' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                U
              </div>
            )}
          </div>
        ))}
        
        {typing && (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            maxWidth: '80%',
            alignSelf: 'flex-start'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
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
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#fff',
              borderRadius: '4px 12px 12px 12px'
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
        padding: '1rem 1.5rem',
        backgroundColor: '#fff',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            style={{
              padding: '0 1.25rem',
              backgroundColor: isSending || !input.trim() ? '#cbd5e1' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isSending || !input.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}