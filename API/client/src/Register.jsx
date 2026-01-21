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

        // Password Validation
        if (password.length < 6 || !/\d/.test(password)) {
            toast.error("Password must be at least 6 characters and include a number");
            return;
        }

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
        <div style={{ 
            maxWidth: '400px', 
            margin: '4rem auto', 
            padding: '2.5rem', 
            background: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center' }}>
                {step === 1 ? 'Create Account' : 'Verify Email'}
            </h2>
            <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '2rem', fontSize: '14px' }}>
                {step === 1 
                    ? 'Get started with professional trading signals.' 
                    : `Enter the 4-digit code sent to ${email}`}
            </p>
            
            {step === 1 ? (
                <form onSubmit={handleRegister}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            Email Address
                        </label>
                        <input 
                            type="email" 
                            placeholder="name@company.com" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
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
                            placeholder="Create a strong password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            style={{ margin: 0 }}
                        />
                    </div>
                    <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px' }}>
                        {isLoading ? 'Sending...' : 'Create Account'}
                    </button>
                    
                    <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '14px' }}>
                        <span style={{ color: '#6b7280' }}>Already have an account? </span>
                        <Link to="/login" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleVerify}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <input 
                            type="text" 
                            placeholder="0000" 
                            value={code} 
                            onChange={e => setCode(e.target.value)} 
                            maxLength="4"
                            style={{ 
                                letterSpacing: '10px', 
                                textAlign: 'center', 
                                fontSize: '1.5rem', 
                                fontWeight: 'bold',
                                padding: '15px'
                            }}
                            required 
                        />
                    </div>
                    <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px' }}>
                        {isLoading ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setStep(1)} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#6b7280', 
                            marginTop: '1.5rem', 
                            fontSize: '13px', 
                            textDecoration: 'underline',
                            width: '100%'
                        }}
                    >
                        Wrong email? Go back.
                    </button>
                </form>
            )}
        </div>
    );
}
