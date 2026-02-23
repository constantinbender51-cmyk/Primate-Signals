import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [room, setRoom] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return navigate('/login');
    
    // Connect to WebSocket
    // Uses empty string to connect to the host it's served from (Railway)
    socketRef.current = io('');

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_room', socketRef.current.id);
    });

    socketRef.current.on('chat_started', (data) => {
      setIsWaiting(false);
      setRoom(data.room);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'system',
        text: 'A Human AI Provider has connected.',
        timestamp: new Date()
      }]);
    });

    socketRef.current.on('receive_message', (msg) => {
      // Only append if it's from the AI (we add user msgs locally instantly)
      if (msg.sender === 'ai') {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => socketRef.current.disconnect();
  }, [navigate]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMsg = { id: Date.now(), sender: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);

    if (!room) {
      // First message = creates a request for workers
      setIsWaiting(true);
      socketRef.current.emit('request_chat', {
        user: JSON.parse(localStorage.getItem('user')).email.split('@')[0],
        message: input
      });
    } else {
      // Already in a room, send directly
      socketRef.current.emit('send_message', {
        room: room,
        text: input,
        sender: 'user'
      });
    }
    setInput('');
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
            onKeyPress={e => e.key === 'Enter' && handleSend()}
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