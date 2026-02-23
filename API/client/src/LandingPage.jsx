import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ paddingBottom: '80px', animation: 'fadeIn 0.6s ease-out' }}>
      {/* Hero Section */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '80px 20px',
        background: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.95)), url('https://i.postimg.cc/HLmpLKr1/ai-background.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '800',
          color: '#111827',
          marginBottom: '1.5rem',
          maxWidth: '900px'
        }}>
          Human Intelligence, AI Experience
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: '#4b5563',
          maxWidth: '700px',
          marginBottom: '2.5rem'
        }}>
          Connect with real people who power our AI chatbots. Get authentic, human responses with the convenience of AI.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <Link to="/register" style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '6px',
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            Sign Up as User
          </Link>
          <Link to="/verification" style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            Become an AI Provider
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{
        padding: '60px 20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: '2.25rem',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '3rem',
          color: '#111827'
        }}>
          How Human AI Works
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          {[
            { title: 'Choose Your AI', desc: 'Select from specialized human AI providers based on expertise and ratings.' },
            { title: 'Start Chatting', desc: 'Begin a conversation just like with any AI chatbot - but with real human responses.' },
            { title: 'Get Real Answers', desc: 'Receive thoughtful, nuanced responses from actual people behind the scenes.' },
            { title: 'Rate Your Experience', desc: 'Help maintain quality by rating your interactions and providing feedback.' }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#fff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#10b981',
                marginBottom: '1rem'
              }}>
                {i + 1}
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: '#111827'
              }}>
                {item.title}
              </h3>
              <p style={{
                color: '#4b5563',
                lineHeight: '1.5'
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{
        padding: '60px 20px',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          {[
            { title: 'Authentic Responses', desc: 'No generic AI answers - get thoughtful, human responses tailored to your needs.' },
            { title: 'Specialized Knowledge', desc: 'Connect with experts in specific fields who can provide deep domain knowledge.' },
            { title: 'Privacy Protected', desc: 'Your identity remains anonymous while interacting with human AI providers.' },
            { title: 'Quality Guaranteed', desc: 'Providers are verified and rated to ensure consistent, high-quality interactions.' }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '16px'
            }}>
              <div style={{
                minWidth: '24px',
                height: '24px',
                background: '#ecfdf5',
                color: '#059669',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                ✓
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#111827'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  color: '#4b5563',
                  fontSize: '0.95rem'
                }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}