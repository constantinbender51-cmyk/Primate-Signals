import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/auth/me');
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
            } catch (err) {
                toast.error("Session expired");
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    const handleManageStripe = async () => {
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Error opening portal"); }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    if (loading) return <div>Loading profile...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '2rem' }}>User Profile</h2>
            
            <div style={{ 
                background: '#fff', 
                border: '1px solid #e5e7eb', 
                borderRadius: '12px', 
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Email</label>
                    <div style={{ fontSize: '1rem', color: '#111827' }}>{user.email}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Subscription Status</label>
                        <div style={{ 
                            fontSize: '1rem', 
                            fontWeight: '600',
                            color: user.subscription_status === 'active' ? '#10b981' : '#f59e0b',
                            textTransform: 'capitalize'
                        }}>
                            {user.subscription_status || 'Inactive'}
                        </div>
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Next Billing</label>
                        <div style={{ fontSize: '1rem', color: '#111827' }}>
                            {user.next_billing_date ? formatDate(user.next_billing_date) : '-'}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Trial Ends</label>
                        <div style={{ fontSize: '1rem', color: '#111827' }}>
                            {user.trial_ends_at ? formatDate(user.trial_ends_at) : 'Ended'}
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                     <button 
                        onClick={handleManageStripe}
                        style={{ 
                            width: '100%', 
                            background: '#f3f4f6', 
                            color: '#374151', 
                            border: '1px solid #d1d5db' 
                        }}
                    >
                        Manage Subscription & Payments
                    </button>
                </div>
            </div>
        </div>
    );
}
