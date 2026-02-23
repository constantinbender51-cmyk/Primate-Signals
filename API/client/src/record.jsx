// client/src/record.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Record() {
  const [profile, setProfile] = useState({
    name: 'Alex Johnson',
    specialty: 'Technology & Programming',
    rating: 4.8,
    responseTime: '2h 15m',
    sessions: 142,
    earnings: 1245.50,
    availability: 'available'
  });
  
  const [stats, setStats] = useState({
    totalSessions: 142,
    avgRating: 4.8,
    responseTime: '2h 15m',
    satisfaction: 96,
    activeHours: 32.5
  });
  
  const [customization, setCustomization] = useState({
    name: 'Tech Expert AI',
    description: 'Your go-to expert for programming, software development, and technology questions',
    avatar: null,
    greeting: 'Hello! I\'m ready to help with your tech questions.'
  });
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
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
    
    // Simulate loading profile data
    setTimeout(() => {
      // In a real app, this would fetch data from the API
      // api.get('/api/worker/profile').then(response => setProfile(response.data));
    }, 500);
  }, [navigate]);
  
  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setEditing(false);
      alert('Profile updated successfully!');
    }, 800);
  };
  
  const handleAvatarUpload = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setCustomization(prev => ({
          ...prev,
          avatar: reader.result
        }));
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My AI Provider Profile</h1>
            <p className="text-gray-600">Manage your profile, track performance, and customize your AI persona</p>
          </div>
          
          <div className="flex space-x-3">
            {editing ? (
              <>
                <button 
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setEditing(true)}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Profile Header */}
              <div className="h-24 bg-emerald-600" />
              
              {/* Profile Body */}
              <div className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                    {customization.avatar ? (
                      <img 
                        src={customization.avatar} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                        {profile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {editing && (
                    <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-emerald-700">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload} 
                      />
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </label>
                  )}
                </div>
                
                {editing ? (
                  <input
                    type="text"
                    value={customization.name}
                    onChange={e => setCustomization(prev => ({...prev, name: e.target.value}))}
                    className="text-xl font-bold text-gray-900 text-center w-full mb-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {customization.name}
                  </h2>
                )}
                
                {editing ? (
                  <input
                    type="text"
                    value={customization.description}
                    onChange={e => setCustomization(prev => ({...prev, description: e.target.value}))}
                    className="text-gray-600 text-center w-full mb-4 border-b border-gray-300 focus:outline-none focus:border-emerald-500"
                  />
                ) : (
                  <p className="text-gray-600 mb-4">
                    {customization.description}
                  </p>
                )}
                
                <div className="flex justify-center space-x-4 mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {profile.rating} ★
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {profile.responseTime}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">{profile.sessions}</div>
                    <div className="text-xs text-gray-600">Sessions</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(profile.earnings)}</div>
                    <div className="text-xs text-gray-600">Earnings</div>
                  </div>
                </div>
                
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile.availability === 'available' 
                      ? 'bg-green-100 text-green-800' 
                      : profile.availability === 'busy'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {profile.availability === 'available' ? 'Available for Chats' : 
                     profile.availability === 'busy' ? 'Busy - Limited Availability' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow mt-6 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Stats</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.avgRating}</div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.responseTime}</div>
                  <div className="text-sm text-gray-600">Response Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.satisfaction}%</div>
                  <div className="text-sm text-gray-600">Satisfaction</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.activeHours}h</div>
                  <div className="text-sm text-gray-600">Active This Week</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Details */}
          <div className="lg:col-span-3">
            {/* AI Persona Customization */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI Persona Customization</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Greeting Message
                  </label>
                  {editing ? (
                    <textarea
                      value={customization.greeting}
                      onChange={e => setCustomization(prev => ({...prev, greeting: e.target.value}))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 min-h-[100px] flex items-center">
                      {customization.greeting}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialties
                  </label>
                  {editing ? (
                    <textarea
                      defaultValue="Technology & Programming, Web Development, AI & Machine Learning, Software Architecture"
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {['Technology & Programming', 'Web Development', 'AI & Machine Learning', 'Software Architecture'].map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability
                  </label>
                  {editing ? (
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500">
                      <option value="available">Available for Chats</option>
                      <option value="busy">Busy - Accepting Limited Chats</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  ) : (
                    <div className={`inline-block px-3 py-1 rounded-md ${
                      profile.availability === 'available' 
                        ? 'bg-green-100 text-green-800' 
                        : profile.availability === 'busy'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {profile.availability === 'available' 
                        ? 'Available for Chats' 
                        : profile.availability === 'busy'
                          ? 'Busy - Accepting Limited Chats'
                          : 'Unavailable'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Earnings Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Earnings Summary</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">This Month</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(425.75)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Last Month</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(385.20)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Payout Method</div>
                  <div className="text-lg font-medium text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.5 11.5c.3 0 .5.2.5.5s-.2.5-.5.5h-14c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h14zm0-4c.3 0 .5.2.5.5s-.2.5-.5.5h-14c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h14zm0 8c.3 0 .5.2.5.5s-.2.5-.5.5h-14c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h14z" />
                    </svg>
                    PayPal
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Transactions</h3>
                
                <div className="divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">Chat Session #{1000 + i}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="font-medium text-emerald-600">
                        +{formatCurrency(7.50)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  View All Transactions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}