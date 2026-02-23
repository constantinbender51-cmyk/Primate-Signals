import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionPage() {
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
        '10 chat sessions per month',
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
      id: 'enterprise',
      name: 'Enterprise',
      price: 49.99,
      period: 'month',
      features: [
        'Unlimited chat sessions',
        'Immediate response time (15m)',
        'Premium profile visibility',
        'Video & voice call options',
        'Dedicated account manager',
        'Custom AI persona creation'
      ],
      recommended: false
    }
  ];

  const handleSubscribe = async () => {
    if (plan === 'basic' || plan === 'pro') {
      // For card payment
      if (!cardNumber || !expiry || !cvv) {
        alert('Please fill in all payment details');
        return;
      }
    }
    
    setLoading(true);
    try {
      // API call to create subscription
      // await api.post('/api/subscribe', { plan, paymentMethod, cardNumber, expiry, cvv });
      
      // For demo purposes
      setTimeout(() => {
        setLoading(false);
        navigate('/terminal');
      }, 1500);
    } catch (err) {
      setLoading(false);
      alert("Subscription failed. Please try again.");
    }
  };

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '4rem auto',
      padding: '2.5rem',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: '1.5rem'
      }}>
        Select Your Plan
      </h1>
      
      <p style={{
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: '2.5rem',
        fontSize: '14px'
      }}>
        Choose the perfect plan for your needs as a human AI provider
      </p>

      {/* Plan Selection */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        {plans.map((p) => (
          <div key={p.id} style={{
            border: `2px solid ${plan === p.id ? '#10b981' : '#e5e7eb'}`,
            borderRadius: '10px',
            padding: '1.5rem',
            position: 'relative',
            backgroundColor: plan === p.id ? 'rgba(16, 185, 129, 0.05)' : '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => setPlan(p.id)}>
            {p.recommended && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                right: '16px',
                backgroundColor: '#10b981',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '20px'
              }}>
                Recommended
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827'
              }}>
                {p.name}
              </h2>
              <div style={{
                textAlign: 'right'
              }}>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: '#111827'
                }}>
                  ${p.price}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#6b7280'
                }}>
                  /{p.period}
                </div>
              </div>
            </div>
            
            <ul style={{
              listStyle: 'none',
              padding: 0,
              marginBottom: '1.5rem'
            }}>
              {p.features.map((feature, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '0.5rem',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </span>
                  <span style={{
                    color: '#4b5563'
                  }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            
            <button style={{
              width: '100%',
              padding: '8px',
              backgroundColor: plan === p.id ? '#10b981' : '#f1f5f9',
              color: plan === p.id ? 'white' : '#1e293b',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              {plan === p.id ? 'Selected' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Method */}
      {plan !== 'enterprise' && (
        <div style={{
          marginBottom: '2.5rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '1rem',
            color: '#111827'
          }}>
            Payment Method
          </h2>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <button 
              onClick={() => setPaymentMethod('card')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: paymentMethod === 'card' ? '#10b981' : '#f1f5f9',
                color: paymentMethod === 'card' ? 'white' : '#1e293b',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>💳</span> Credit Card
            </button>
            <button 
              onClick={() => setPaymentMethod('paypal')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: paymentMethod === 'paypal' ? '#10b981' : '#f1f5f9',
                color: paymentMethod === 'paypal' ? 'white' : '#1e293b',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span> PayPal
            </button>
          </div>
          
          {paymentMethod === 'card' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Expiry Date
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  CVV
                </label>
                <input
                  type="text"
                  placeholder="123"
                  value={cvv}
                  onChange={e => setCvv(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terms Agreement */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <input 
            type="checkbox" 
            id="terms"
            style={{ marginTop: '0.25rem' }}
          />
          <label htmlFor="terms" style={{
            fontSize: '0.9rem',
            color: '#4b5563'
          }}>
            I agree to the{' '}
            <a href="/terms" style={{ color: '#3b82f6' }}>Terms of Service</a> and{' '}
            <a href="/privacy" style={{ color: '#3b82f6' }}>Privacy Policy</a>. I understand that as a human AI provider, 
            I am responsible for the quality of my responses and interactions with users.
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button 
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : `Start ${plan === 'enterprise' ? 'Free Trial' : 'Subscription'}`}
        </button>
      </div>
    </div>
  );
}