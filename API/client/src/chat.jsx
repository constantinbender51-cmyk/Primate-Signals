import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io({ transports: ['websocket'], autoConnect: false });

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [room, setRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return navigate('/login');
    
    if (!socket.connected) {
      socket.connect();
    }

    // Handlers
    const onChatStarted = (data) => {
      setIsWaiting(false);
      setRoom(data.room);
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

    // Attach Listeners
    socket.on('chat_started', onChatStarted);
    socket.on('receive_message', onReceiveMessage);

    return () => {
      socket.off('chat_started', onChatStarted);
      socket.off('receive_message', onReceiveMessage);
    };
  }, [navigate]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    
    const newMsg = { id: Date.now(), sender: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);

    if (!room) {
      setIsWaiting(true);
      socket.emit('request_chat', {
        user: JSON.parse(localStorage.getItem('user')).email.split('@')[0],
        message: input
      });
    } else {
      socket.emit('send_message', {
        room: room,
        text: input,
        sender: 'user'
      });
    }
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto flex flex-col h-screen">
        <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between border-b">
          <h2 className="text-lg font-bold">HumanAI Assistant</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isWaiting ? 'bg-yellow-100 text-yellow-800' : room ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {isWaiting ? 'Searching for provider...' : room ? 'Connected' : 'Type to start'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : m.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
               {m.sender === 'system' ? (
                 <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.text}</span>
               ) : (
                <div className={`max-w-[70%] rounded-lg p-3 ${m.sender === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-gray-900 shadow rounded-tl-none'}`}>
                  {m.text}
                </div>
               )}
            </div>
          ))}
        </div>

        <div className="bg-white border-t p-4 flex">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask anything..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={handleSend} className="ml-3 bg-emerald-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}