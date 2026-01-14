import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', { email, password });
            toast.success("ACCOUNT CREATED");
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.error || "REGISTRATION FAILED");
        }
    };

    return (
        <div className="auth-card">
            <h3>Create Account</h3>
            <form onSubmit={handleRegister}>
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
                <button type="submit" style={{ width: '100%', marginTop: '1rem' }}>Register</button>
            </form>
            <div style={{ marginTop: '2rem', fontSize: '0.8rem', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-subtle)' }}>EXISTING USER? </span>
                <Link to="/login">LOGIN HERE</Link>
            </div>
        </div>
    );
}
