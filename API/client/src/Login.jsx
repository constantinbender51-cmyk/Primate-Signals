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
            
            toast.success("LOGIN SUCCESSFUL");
            navigate('/');
        } catch (err) {
            toast.error("INVALID CREDENTIALS");
        }
    };

    return (
        <div className="auth-card">
            <h3>Login</h3>
            <form onSubmit={handleLogin}>
                <input 
                    type="email" 
                    placeholder="EMAIL ADDRESS" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="PASSWORD" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                />
                <button type="submit" style={{ width: '100%', marginTop: '1rem' }}>Enter</button>
            </form>
            <div style={{ marginTop: '2rem', fontSize: '0.8rem', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-subtle)' }}>NO ACCOUNT? </span>
                <Link to="/register">REGISTER HERE</Link>
            </div>
        </div>
    );
}
