import React, { useState, useEffect } from 'react';

export default function RecordPage() {
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
  
  useEffect(() => {
    // In a real app, this would fetch data from the API
    // api.get('/api/provider/profile').then(response => setProfile(response.data));
  }, []);
  
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
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      paddingBottom: '80px',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '1.8rem',
            color: '#0f172a',
            fontWeight: '800'
          }}>
            My AI Provider Profile
          </h1>
          <p style={{
            color: '#64758b',
            margin: 0
          }}>
            Manage your profile, track performance, and customize your AI persona
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          {editing ? (
            <>
              <button 
                onClick={() => setEditing(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: loading ? '#cbd5e1' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setEditing(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: '30px'
      }}>
        {/* Left Column - Profile Info */}
        <div>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {/* Profile Header */}
            <div style={{
              height: '120px',
              backgroundColor: '#10b981',
              position: 'relative'
            }}>
              {editing && (
                <label style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleAvatarUpload} 
                  />
                  <span style={{ color: 'white', fontSize: '1.2rem' }}>+</span>
                </label>
              )}
            </div>
            
            {/* Profile Body */}
            <div style={{
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                marginBottom: '15px'
              }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  {customization.avatar ? (
                    <img 
                      src={customization.avatar} 
                      alt="Profile" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '2.5rem',
                      fontWeight: 'bold'
                    }}>
                      {profile.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                {editing && (
                  <div style={{
                    position: 'absolute',
                    bottom: '5px',
                    right: '5px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer'
                  }}>
                    ✏️
                  </div>
                )}
              </div>
              
              {editing ? (
                <input
                  type="text"
                  value={customization.name}
                  onChange={e => setCustomization(prev => ({...prev, name: e.target.value}))}
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    width: '100%',
                    marginBottom: '8px'
                  }}
                />
              ) : (
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  margin: '0 0 5px 0'
                }}>
                  {customization.name}
                </h2>
              )}
              
              {editing ? (
                <input
                  type="text"
                  value={customization.description}
                  onChange={e => setCustomization(prev => ({...prev, description: e.target.value}))}
                  style={{
                    fontSize: '1rem',
                    color: '#64758b',
                    textAlign: 'center',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    width: '100%'
                  }}
                />
              ) : (
                <p style={{
                  color: '#64758b',
                  margin: '0 0 15px 0',
                  fontSize: '1rem'
                }}>
                  {customization.description}
                </p>
              )}
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '15px'
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  fontSize: '0.85rem'
                }}>
                  ⭐ {profile.rating}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#fffbeb',
                  color: '#854d0e',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  fontSize: '0.85rem'
                }}>
                  ⏱️ {profile.responseTime}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div style={{
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#111827'
                  }}>
                    {profile.sessions}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#64758b'
                  }}>
                    Sessions
                  </div>
                </div>
                <div style={{
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#111827'
                  }}>
                    {formatCurrency(profile.earnings)}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#64758b'
                  }}>
                    Earnings
                  </div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center'
              }}>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: profile.availability === 'available' ? '#dcfce7' : '#fff1f2',
                  color: profile.availability === 'available' ? '#166534' : '#b91c1c',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  {profile.availability === 'available' ? 'Available for Chats' : 'Unavailable'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '15px',
              color: '#111827'
            }}>
              Performance Stats
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px'
            }}>
              <div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '5px'
                }}>
                  {stats.avgRating}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64758b'
                }}>
                  Average Rating
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '5px'
                }}>
                  {stats.responseTime}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64758b'
                }}>
                  Response Time
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '5px'
                }}>
                  {stats.satisfaction}%
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64758b'
                }}>
                  Satisfaction
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '5px'
                }}>
                  {stats.activeHours}h
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64758b'
                }}>
                  Active This Week
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Details */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Customization Section */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '20px',
              color: '#111827'
            }}>
              AI Persona Customization
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '15px'
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
                  Greeting Message
                </label>
                {editing ? (
                  <textarea
                    value={customization.greeting}
                    onChange={e => setCustomization(prev => ({...prev, greeting: e.target.value}))}
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                ) : (
                  <p style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    minHeight: '70px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {customization.greeting}
                  </p>
                )}
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
                  Specialties
                </label>
                {editing ? (
                  <textarea
                    value="Technology & Programming, Web Development, AI & Machine Learning, Software Architecture"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {['Technology & Programming', 'Web Development', 'AI & Machine Learning', 'Software Architecture'].map((tag, i) => (
                      <span key={i} style={{
                        padding: '4px 12px',
                        backgroundColor: '#f0fdf4',
                        color: '#047857',
                        borderRadius: '20px',
                        fontSize: '0.85rem'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
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
                  Availability
                </label>
                {editing ? (
                  <select style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}>
                    <option value="available">Available for Chats</option>
                    <option value="busy">Busy - Accepting Limited Chats</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                ) : (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: profile.availability === 'available' ? '#dcfce7' : '#fff1f2',
                    color: profile.availability === 'available' ? '#166534' : '#b91c1c',
                    borderRadius: '6px',
                    display: 'inline-block'
                  }}>
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
          
          {/* Earnings Section */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '20px',
              color: '#111827'
            }}>
              Earnings Summary
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64758b',
                  marginBottom: '5px'
                }}>
                  This Month
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#111827'
                }}>
                  {formatCurrency(425.75)}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64758b',
                  marginBottom: '5px'
                }}>
                  Last Month
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#111827'
                }}>
                  {formatCurrency(385.20)}
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64758b',
                  marginBottom: '5px'
                }}>
                  Payout Method
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  💳 PayPal
                </div>
              </div>
            </div>
            
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '15px',
                color: '#111827'
              }}>
                Recent Transactions
              </h3>
              
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '4px'
                      }}>
                        Chat Session #{1000 + i}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#64758b'
                      }}>
                        {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: '600',
                      color: '#10b981'
                    }}>
                      +{formatCurrency(7.50)}
                    </div>
                  </div>
                ))}
              </div>
              
              <button style={{
                width: '100%',
                marginTop: '15px',
                padding: '8px',
                backgroundColor: '#f1f5f9',
                color: '#1e293b',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500'
              }}>
                View All Transactions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}