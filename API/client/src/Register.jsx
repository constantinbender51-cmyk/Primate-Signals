import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

export default function Register() {
    const [step, setStep] = useState(1); // 1 = Details, 2 = Verification
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/auth/register', { email, password });
            toast.success("Code sent to email!");
            setStep(2);
        } catch (err) {
            toast.error(err.response?.data?.error || "Registration Failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/auth/verify', { email, code });
            toast.success("Account Verified! Logging in...");
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.error || "Verification Failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <h3>Create Account</h3>
            
            {step === 1 ? (
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
                    <button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: '1rem' }}>
                        {isLoading ? 'Sending...' : 'Register'}
                    </button>
                    
                    <div style={{ marginTop: '2rem', fontSize: '0.8rem', textAlign: 'center' }}>
                        <span style={{ color: '#666' }}>EXISTING USER? </span>
                        <Link to="/login">LOGIN HERE</Link>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleVerify}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Enter the 4-digit code sent to <strong>{email}</strong>
                    </p>
                    <input 
                        type="text" 
                        placeholder="0000" 
                        value={code} 
                        onChange={e => setCode(e.target.value)} 
                        maxLength="4"
                        style={{ letterSpacing: '5px', textAlign: 'center', fontSize: '1.2rem' }}
                        required 
                    />
                    <button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: '1rem' }}>
                        {isLoading ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setStep(1)} 
                        style={{ background: 'none', border: 'none', color: '#666', marginTop: '10px', fontSize: '0.8rem', textDecoration: 'underline' }}
                    >
                        Wrong email? Go back.
                    </button>
                </form>
            )}
        </div>
    );
}
