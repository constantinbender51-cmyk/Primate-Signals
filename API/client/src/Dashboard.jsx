import React from 'react';
import LandingPage from './LandingPage';

export default function Dashboard() {
    const token = localStorage.getItem('token');

    // 1. If not logged in, show the Landing Page
    if (!token) return <LandingPage />;

    // 2. If logged in, relay the external application via iframe
    return (
        <div style={{ 
            width: '100%', 
            height: '85vh', 
            animation: 'fadeIn 0.5s ease-out',
            overflow: 'hidden',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#fff'
        }}>
            <iframe 
                src="https://harmonious-perfection-production.up.railway.app/"
                title="Market Analysis Relay"
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: 'none',
                    display: 'block'
                }}
                allowFullScreen
            />
        </div>
    );
}
