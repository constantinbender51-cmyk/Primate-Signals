import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

// Helper component for chat history item
const HistoryItem = ({ title, lastMessage, active, onClick }) => (
  <div onClick={onClick} className={`p-3 border-b border-gray-200 cursor-pointer ${active ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
    <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
    <p className="text-xs text-gray-500 truncate">{lastMessage}</p>
  </div>
);

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [room, setRoom] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { chatId } = useParams();

  // New state for added features
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [model, setModel] = useState('global');
  const [thinkingMode, setThinkingMode] = useState(true);
  const [mockHistory, setMockHistory] = useState([
    { id: 'hist_1', title: 'Service Inquiry', lastMessage: 'Okay, that makes sense. Thank you!' },
    { id: 'hist_2', title: 'Billing Question', lastMessage: 'What are the features of the pro plan?' },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    navigate('/chat');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const socket = io({ transports: ['websocket'], auth: { token } });
    socketRef.current = socket;

    if (chatId) {
      setRoom(chatId);
      setMessages([
          { id: Date.now() + 1, sender: 'system', text: 'This is a read-only view of a past conversation.' },
          { id: Date.now() + 2, sender: 'user', text: 'What are the features of the pro plan?' },
          { id: Date.now() + 3, sender: 'ai', text: 'The pro plan includes unlimited sessions and priority response times.'}
      ]);
    } else {
        const onChatStarted = (data) => {
          setIsWaiting(false);
          setRoom(data.room);
          socket.emit('join_chat_room', data.room);
          setMessages(prev => [...prev, { id: Date.now(), sender: 'system', text: 'A Human AI Provider has connected.', timestamp: new Date() }]);
        };
        const onReceiveMessage = (msg) => {
          if (msg.sender === 'ai') { setMessages(prev => [...prev, msg]); }
        };
        const onActiveChatData = (data) => {
            setRoom(data.room);
            setMessages(data.messages);
            socket.emit('join_chat_room', data.room);
        };
        const onChatEnded = () => {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'system', text: 'The chat has ended.'}]);
            setRoom(null);
        };
        socket.on('chat_started', onChatStarted);
        socket.on('receive_message', onReceiveMessage);
        socket.on('active_chat_data', onActiveChatData);
        socket.on('chat_ended', onChatEnded);
    }

    return () => {
      socket.disconnect();
    };
  }, [navigate, chatId]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || chatId) return; // Disable sending in mock history view

    const newMsg = { id: Date.now(), sender: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);

    const socket = socketRef.current;
    if (socket) {
        if (!room) {
          setIsWaiting(true);
          socket.emit('request_chat', { text: input, systemPrompt, model, thinkingMode });
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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for Chat History */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <button onClick={handleNewChat} className="w-full py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-semibold">+ New Chat</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 text-xs font-semibold text-gray-500 uppercase">Chat History</div>
          <HistoryItem title="Current Conversation" lastMessage={chatId ? "Viewing history..." : isWaiting ? 'Searching...' : (room ? 'Connected' : 'Ready to start')} active={!chatId} onClick={() => navigate('/chat')} />
          {mockHistory.map(h => <HistoryItem key={h.id} title={h.title} lastMessage={h.lastMessage} active={chatId === h.id} onClick={() => navigate(`/chat/${h.id}`)} />)}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Controls for new features */}
        {!chatId && (
            <div className="bg-white border-b p-3 flex items-end space-x-4 text-sm">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600">System Prompt</label>
                    <input type="text" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} className="w-full border-gray-300 rounded p-1 text-sm mt-1 shadow-sm" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-600">Model (Origin)</label>
                    <select value={model} onChange={e => setModel(e.target.value)} className="w-full border-gray-300 rounded p-1 text-sm mt-1 shadow-sm">
                        <option value="global">Global</option><option value="us">US</option><option value="uk">UK</option>
                    </select>
                </div>
                <div className="flex items-center pb-1">
                    <input type="checkbox" id="thinking" checked={thinkingMode} onChange={e => setThinkingMode(e.target.checked)} className="mr-2" />
                    <label htmlFor="thinking">Thinking Mode</label>
                </div>
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : m.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
               {m.sender === 'system' ? (
                 <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.text}</span>
               ) : (
                <div className={`max-w-[70%] rounded-lg p-3 ${m.sender === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white text-gray-900 rounded-bl-none shadow'}`}>
                  <p className="break-words">{m.text}</p>
                </div>
               )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t p-4 flex">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyPress}
            placeholder={chatId ? "Viewing history, new messages disabled." : room ? "Type your message..." : "Ask your first question..."}
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isWaiting || !!chatId}
          />
          <button onClick={handleSend} className="ml-3 bg-emerald-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-emerald-700 disabled:bg-gray-300" disabled={isWaiting || !!chatId}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}