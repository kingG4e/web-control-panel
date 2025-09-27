import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaServer, FaEnvelope, FaDatabase, FaCog, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        USE_REMOTE_DNS: false,
        USE_REMOTE_MAIL: false,
        USE_REMOTE_DATABASE: false,
        REMOTE_DNS_SERVER: '',
        REMOTE_DNS_PORT: '',
        REMOTE_DNS_KEY_PATH: '',
        REMOTE_MAIL_SERVER: '',
        REMOTE_MAIL_PORT: '',
        REMOTE_MAIL_USER: '',
        REMOTE_MAIL_PASSWORD: '',
        REMOTE_DATABASE_SERVER: '',
        REMOTE_DATABASE_PORT: '',
        REMOTE_DATABASE_USER: '',
        REMOTE_DATABASE_PASSWORD: '',
        REMOTE_DATABASE_NAME: '',
        DNS_DEFAULT_IP: '',
    });
    const [detectedIp, setDetectedIp] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings', { withCredentials: true });
                setSettings(prev => ({ ...prev, ...response.data }));
                if (response.data.DETECTED_SERVER_IP) {
                    setDetectedIp(response.data.DETECTED_SERVER_IP);
                }
            } catch (err) {
                const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch settings.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prevSettings => ({
            ...prevSettings,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            await api.post('/settings', settings, { withCredentials: true });
            setSuccess('Settings saved successfully!');
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to save settings.';
            setError(errorMessage);
        }
    };

    const InputField = ({ name, value, onChange, placeholder, type = "text" }) => (
        <div className="flex flex-col">
            <label htmlFor={name} className="mb-2 text-sm text-[var(--secondary-text)]">{placeholder}</label>
            <input
                id={name}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="input-field"
            />
        </div>
    );

    const applyDetectedIp = () => {
        if (detectedIp) {
            setSettings(prev => ({ ...prev, DNS_DEFAULT_IP: detectedIp }));
        }
    };

    const ToggleSwitch = ({ name, checked, onChange, label, description }) => (
        <div className="w-full">
            <label className="inline-flex items-center cursor-pointer w-full">
                <div className="flex-grow">
                    <span className="text-lg font-medium text-[var(--primary-text)]">{label}</span>
                    <p className="text-sm text-[var(--secondary-text)] mt-1">{description}</p>
                </div>
                <div className="relative">
                    <input
                        type="checkbox"
                        name={name}
                        checked={checked}
                        onChange={onChange}
                        className="sr-only" // Hide default checkbox
                    />
                    <div className={`w-14 h-8 rounded-full shadow-inner transition-colors duration-300 ease-in-out ${checked ? 'bg-[var(--accent-color)]' : 'bg-gray-600'}`}></div>
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
            </label>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--primary-bg)' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-color)' }}></div>
        </div>
    );

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold flex items-center" style={{ color: 'var(--primary-text)' }}>
                        <FaCog className="mr-3" style={{ color: 'var(--accent-color)' }} />
                        Admin Settings
                    </h1>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {error && (
                        <div className="px-4 py-3 rounded-lg border" role="alert" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--error-text)', borderColor: 'var(--error-border)' }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="px-4 py-3 rounded-lg border" role="alert" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--success-color)', borderColor: 'var(--success-color)' }}>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Toggles group */}
                        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            <div className="space-y-4">
                                <ToggleSwitch 
                                    name="USE_REMOTE_DNS"
                                    checked={settings.USE_REMOTE_DNS}
                                    onChange={handleChange}
                                    label="Use Remote DNS"
                                    description="Use an external BIND server for DNS management."
                                />
                                <ToggleSwitch 
                                    name="USE_REMOTE_MAIL"
                                    checked={settings.USE_REMOTE_MAIL}
                                    onChange={handleChange}
                                    label="Use Remote Mail Server"
                                    description="Use an external SMTP server for sending emails."
                                />
                                <ToggleSwitch 
                                    name="USE_REMOTE_DATABASE"
                                    checked={settings.USE_REMOTE_DATABASE}
                                    onChange={handleChange}
                                    label="Use Remote Database"
                                    description="Connect to an external MySQL/MariaDB database."
                                />
                            </div>
                        </div>

                        {/* DNS Defaults */}
                        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--primary-text)' }}><FaServer className="mr-3" style={{ color: 'var(--info-color)' }} />DNS Defaults</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="flex flex-col">
                                    <label htmlFor="DNS_DEFAULT_IP" className="mb-2 text-sm text-[var(--secondary-text)]">Default IP for new DNS zones</label>
                                    <div className="flex gap-2">
                                        <input
                                            id="DNS_DEFAULT_IP"
                                            type="text"
                                            name="DNS_DEFAULT_IP"
                                            value={settings.DNS_DEFAULT_IP}
                                            onChange={handleChange}
                                            placeholder={detectedIp || 'e.g., 203.0.113.10'}
                                            className="input-field flex-1"
                                        />
                                        <button type="button" onClick={applyDetectedIp} className="btn-secondary" disabled={!detectedIp}>
                                            Use detected{detectedIp ? ` (${detectedIp})` : ''}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs" style={{ color: 'var(--secondary-text)' }}>
                                        Used for A/ns1/mail records during zone creation. You can override per-request.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Remote DNS Server */}
                        {settings.USE_REMOTE_DNS && (
                            <div className="rounded-xl border p-6 animate-fade-in" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--primary-text)' }}><FaServer className="mr-3" style={{ color: 'var(--info-color)' }} />Remote DNS Server</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InputField name="REMOTE_DNS_SERVER" value={settings.REMOTE_DNS_SERVER} onChange={handleChange} placeholder="DNS Server IP" />
                                    <InputField name="REMOTE_DNS_PORT" value={settings.REMOTE_DNS_PORT} onChange={handleChange} placeholder="DNS Port" type="number" />
                                    <InputField name="REMOTE_DNS_KEY_PATH" value={settings.REMOTE_DNS_KEY_PATH} onChange={handleChange} placeholder="RNDC Key Path" />
                                </div>
                            </div>
                        )}

                        {/* Remote Mail Server */}
                        {settings.USE_REMOTE_MAIL && (
                            <div className="rounded-xl border p-6 animate-fade-in" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--primary-text)' }}><FaEnvelope className="mr-3" style={{ color: 'var(--success-color)' }} />Remote Mail Server</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField name="REMOTE_MAIL_SERVER" value={settings.REMOTE_MAIL_SERVER} onChange={handleChange} placeholder="Mail Server" />
                                    <InputField name="REMOTE_MAIL_PORT" value={settings.REMOTE_MAIL_PORT} onChange={handleChange} placeholder="Mail Port" type="number" />
                                    <InputField name="REMOTE_MAIL_USER" value={settings.REMOTE_MAIL_USER} onChange={handleChange} placeholder="Mail Username" />
                                    <InputField name="REMOTE_MAIL_PASSWORD" value={settings.REMOTE_MAIL_PASSWORD} onChange={handleChange} placeholder="Mail Password" type="password" />
                                </div>
                            </div>
                        )}

                        {/* Remote Database Server */}
                        {settings.USE_REMOTE_DATABASE && (
                            <div className="rounded-xl border p-6 animate-fade-in" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--primary-text)' }}><FaDatabase className="mr-3" style={{ color: 'var(--warning-color)' }} />Remote Database Server</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField name="REMOTE_DATABASE_SERVER" value={settings.REMOTE_DATABASE_SERVER} onChange={handleChange} placeholder="Database Server IP" />
                                    <InputField name="REMOTE_DATABASE_PORT" value={settings.REMOTE_DATABASE_PORT} onChange={handleChange} placeholder="Database Port" type="number" />
                                    <InputField name="REMOTE_DATABASE_USER" value={settings.REMOTE_DATABASE_USER} onChange={handleChange} placeholder="Database Username" />
                                    <InputField name="REMOTE_DATABASE_PASSWORD" value={settings.REMOTE_DATABASE_PASSWORD} onChange={handleChange} placeholder="Database Password" type="password" />
                                    <InputField name="REMOTE_DATABASE_NAME" value={settings.REMOTE_DATABASE_NAME} onChange={handleChange} placeholder="Database Name" />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button type="submit" className="btn-primary">
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
