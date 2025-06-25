import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    const accountDeleted = searchParams.get('deleted') === 'true';

    useEffect(() => {
        // Clear the URL parameter after showing the message
        if (accountDeleted) {
            const timer = setTimeout(() => {
                navigate('/login', { replace: true });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [accountDeleted, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login({ username, password });

            if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.error || 'Invalid username or password.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--primary-bg)] p-4">
            <div className="w-full max-w-[420px] space-y-8">
                {/* Account Deleted Success Message */}
                {accountDeleted && (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center">
                            <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3" />
                            <div>
                                <h3 className="text-green-800 font-medium">Account Successfully Deleted</h3>
                                <p className="text-green-700 text-sm mt-1">
                                    Your account and all associated data have been permanently removed from our system.
                                </p>
                                <p className="text-green-600 text-xs mt-2">
                                    Thank you for using our service. This page will redirect automatically.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Logo and Welcome Text */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-[var(--accent-color)] rounded-2xl flex items-center justify-center shadow-xl shadow-[var(--accent-color)]/20">
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13.5 2C13.5 2.83 12.83 3.5 12 3.5C11.17 3.5 10.5 2.83 10.5 2C10.5 1.17 11.17 0.5 12 0.5C12.83 0.5 13.5 1.17 13.5 2ZM12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22ZM12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20Z"/>
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--primary-text)]">
                        {accountDeleted ? 'Account Deleted' : 'Welcome back'}
                    </h2>
                    <p className="text-[var(--secondary-text)]">
                        {accountDeleted 
                            ? 'Your account deletion was completed successfully'
                            : 'Sign in with your Linux system account'
                        }
                    </p>
                </div>

                {/* Login Form - Hide if account was deleted */}
                {!accountDeleted && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-[var(--danger-color)]/10 border border-[var(--danger-color)]/20 rounded-xl">
                                <p className="text-sm text-[var(--danger-color)] text-center">{error}</p>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-[var(--tertiary-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="username"
                                        type="text"
                                        required
                                        className="input-field pl-12"
                                        placeholder="Enter your Linux username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-[var(--tertiary-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        className="input-field pl-12"
                                        placeholder="Enter your Linux password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)] focus:ring-offset-[var(--primary-bg)]"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--secondary-text)]">
                                    Remember me
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </div>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                )}

                {/* Footer */}
                <p className="text-center text-sm text-[var(--tertiary-text)]">
                    © 2024 Control Panel. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Login; 