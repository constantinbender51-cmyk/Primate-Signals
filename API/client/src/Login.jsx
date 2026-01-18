import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; 
import api from './api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user)); 
            navigate('/');
        } catch (err) {
            toast.error("Invalid Credentials");
        }
    };

    return (
        <div style={{ 
            maxWidth: '400px', 
            margin: '4rem auto', 
            padding: '2.5rem', 
            background: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center' }}>Welcome Back</h2>
            <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '2rem', fontSize: '14px' }}>
                Log in to access your trading signals.
            </p>

            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        Email Address
                    </label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="name@company.com"
                        required 
                        style={{ margin: 0 }}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        Password
                    </label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="••••••••"
                        required 
                        style={{ margin: 0 }}
                    />
                </div>

                <button type="submit" style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
                    Sign In
                </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Don't have an account? </span>
                <Link to="/register" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>Sign up</Link>
            </div>
        </div>
    );
}
