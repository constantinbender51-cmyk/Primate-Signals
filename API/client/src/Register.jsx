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
            toast.success("Registration successful! Please log in.");
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.error || "Registration failed");
        }
    };

    return (
        <div className="auth-card">
            <h2 style={{marginTop: 0}}>Create Account</h2>
            <form onSubmit={handleRegister}>
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
                <button type="submit" style={{width: '100%'}}>Sign Up</button>
            </form>
            <p style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem'}}>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
}
