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
            // --- NEW: Store User Data for Dashboard Display ---
            localStorage.setItem('user', JSON.stringify(res.data.user)); 
            
            toast.success("Welcome back!");
            navigate('/');
        } catch (err) {
            toast.error("Invalid email or password");
        }
    };

    return (
        <div className="auth-card">
            <h2 style={{marginTop: 0}}>Login</h2>
            <form onSubmit={handleLogin}>
                <input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                />
                <button type="submit" style={{width: '100%'}}>Log In</button>
            </form>
            <p style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem'}}>
                Don't have an account? <Link to="/register">Register</Link>
            </p>
        </div>
    );
}
