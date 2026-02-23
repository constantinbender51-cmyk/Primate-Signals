// client/src/subscription.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Subscription() {
  const [plan, setPlan] = useState('basic');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      period: 'month',
      features: [
        '5 chat sessions per month',
        'Standard response time (24h)',
        'Basic profile visibility',
        'Email support'
      ],
      recommended: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 19.99,
      period: 'month',
      features: [
        'Unlimited chat sessions',
        'Priority response time (4h)',
        'Enhanced profile visibility',
        'Video call option',
        'Priority support'
      ],
      recommended: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 29.99,
      period: 'month',
      features: [
        'Unlimited chat sessions',
        'Immediate response time (1h)',
        'Premium profile visibility',
        'Video & voice call options',
        'Dedicated account manager',
        'Custom AI persona matching'
      ],
      recommended: false
    }
  ];

  const handleSubscribe = async () => {
    if (plan !== 'basic' && plan !== 'pro') {
      // For card payment
      if (!cardNumber || !expiry || !cvv) {
        alert('Please fill in all payment details');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // API call to create subscription
      console.log('Creating subscription', { plan, paymentMethod, cardNumber, expiry, cvv });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save user data
      const pendingUser = JSON.parse(localStorage.getItem('pendingUser') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...pendingUser,
        subscription: {
          plan,
          status: 'active',
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }));
      
      setLoading(false);
      navigate('/chat');
    } catch (err) {
      setLoading(false);
      alert("Subscription failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Select Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Choose the perfect plan for your needs
          </p>
        </div>

        {/* Plan Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((p) => (
            <div 
              key={p.id} 
              className={`relative bg-white rounded-lg shadow-md overflow-hidden ${
                plan === p.id ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              {p.recommended && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  Recommended
                </div>
              )}
              
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900">{p.name}</h2>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">${p.price}</span>
                  <span className="text-lg text-gray-500">/{p.period}</span>
                </div>
                
                <ul className="mt-6 space-y-3">
                  {p.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="h-5 w-5 text-emerald-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => setPlan(p.id)}
                  className={`mt-8 w-full py-2 px-4 rounded-md text-base font-medium ${
                    plan === p.id
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan === p.id ? 'Selected' : 'Select Plan'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 py-3 px-4 rounded-md font-medium ${
                paymentMethod === 'card'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 8h16M4 16h16M4 12h16" />
                </svg>
                Credit Card
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`flex-1 py-3 px-4 rounded-md font-medium ${
                paymentMethod === 'paypal'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.5 11.5c.3 0 .5.2.5.5s-.2.5-.5.5h-14c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h14zm0-4c.3 0 .5.2.5.5s-.2.5-.5.5h-14c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h14zm0 8c.3 0 .5.2.5.5s-.2.5-.5.5h-14c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h14z" />
                </svg>
                PayPal
              </div>
            </button>
          </div>
          
          {paymentMethod === 'card' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  id="card-number"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    id="expiry"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    id="cvv"
                    value={cvv}
                    onChange={e => setCvv(e.target.value)}
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <div className="flex items-start">
              <input 
                type="checkbox" 
                id="terms" 
                className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
                I agree to the{' '}
                <a href="#" className="text-emerald-600 hover:text-emerald-700">Terms of Service</a> and{' '}
                <a href="#" className="text-emerald-600 hover:text-emerald-700">Privacy Policy</a>.
              </label>
            </div>
          </div>
          
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="mt-6 w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            {loading ? 'Processing...' : `Start ${plans.find(p => p.id === plan).name} Plan`}
          </button>
        </div>
      </div>
    </div>
  );
}