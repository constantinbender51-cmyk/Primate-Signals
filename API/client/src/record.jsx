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

  // New state for payout feature
  const [payoutConnected, setPayoutConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectPayout = () => {
      setIsConnecting(true);
      setTimeout(() => {
          setPayoutConnected(true);
          setIsConnecting(false);
      }, 1500);
  };
  
  useEffect(() => {
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
    
    setTimeout(() => {
      // Simulate API fetch
    }, 500);
  }, [navigate]);
  
  const handleSave = () => {
    setLoading(true);
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
                <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={loading} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save Changes'}</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700">Edit Profile</button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-24 bg-emerald-600" />
              <div className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                    {customization.avatar ? (<img src={customization.avatar} alt="Profile" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">{profile.name.charAt(0)}</div>)}
                  </div>
                  {editing && (
                    <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-emerald-700">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </label>
                  )}
                </div>
                {editing ? (<input type="text" value={customization.name} onChange={e => setCustomization(prev => ({...prev, name: e.target.value}))} className="text-xl font-bold text-gray-900 text-center w-full mb-1 border-b border-gray-300 focus:outline-none focus:border-emerald-500" />) : (<h2 className="text-xl font-bold text-gray-900 mb-1">{customization.name}</h2>)}
                {editing ? (<input type="text" value={customization.description} onChange={e => setCustomization(prev => ({...prev, description: e.target.value}))} className="text-gray-600 text-center w-full mb-4 border-b border-gray-300 focus:outline-none focus:border-emerald-500" />) : (<p className="text-gray-600 mb-4">{customization.description}</p>)}
              </div>
            </div>
            {/* ... other left column cards ... */}
          </div>
          
          {/* Right Column */}
          <div className="lg:col-span-3">
            {/* ... other right column cards ... */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Earnings Summary</h2>
              {/* ... earnings summary content ... */}
            </div>

            {/* NEW: Payout Settings Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payout Settings</h2>
              {payoutConnected ? (
                <div>
                  <p className="text-gray-600 mb-4">Your earnings are sent to your connected Stripe account.</p>
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">Stripe Account Connected</p>
                      <p className="text-sm text-green-700">worker@test.com</p>
                    </div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-500">Manage</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">Connect a Stripe account to receive payouts for your earnings. We use Stripe for secure and reliable transfers.</p>
                  <button onClick={handleConnectPayout} disabled={isConnecting} className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                    {isConnecting ? 'Connecting...' : 'Connect with Stripe'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}