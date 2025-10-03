import React, { useState, useEffect } from 'react';
import { FaServer, FaEnvelope, FaDatabase, FaCog, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import api from '../services/api';

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
        PRIMARY_DOMAIN: '',
        DNS_DEFAULT_IP: '',
    });
    const [detectedIp, setDetectedIp] = useState('');
    const [bulkIp, setBulkIp] = useState('');
    const [bulkMode, setBulkMode] = useState('all'); // 'all' | 'selected'
    const [domains, setDomains] = useState([]);
    const [selectedDomains, setSelectedDomains] = useState([]);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);
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
                // Load domains for bulk update UI
                try {
                    const zones = await api.get('/dns/zones', { withCredentials: true });
                    setDomains((zones.data || []).map(z => z.domain_name));
                } catch (e) {
                    setDomains([]);
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

    const toggleDomain = (d) => {
        setSelectedDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    };

    const submitBulkIp = async () => {
        if (!bulkIp) {
            setError('Please enter a new IP');
            return;
        }
        if (bulkMode === 'selected' && selectedDomains.length === 0) {
            setError('Please select at least one domain');
            return;
        }
        setIsBulkLoading(true);
        setSuccess(null);
        setError(null);
        setBulkResult(null);
        try {
            const payload = { new_ip: bulkIp, mode: bulkMode };
            if (bulkMode === 'selected') payload.domains = selectedDomains;
            const resp = await api.post('/dns/replace-ip-bulk', payload);
            setBulkResult({
                updatedDomains: resp.data.updated_domains || [],
                updatedRecords: resp.data.updated_records || 0
            });
            setSuccess(`Updated ${resp.data.updated_records} records in ${resp.data.updated_domains.length} zone(s).`);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Bulk update failed');
        } finally {
            setIsBulkLoading(false);
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

                        {/* Primary Domain & DNS Defaults */}
                        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--primary-text)' }}><FaServer className="mr-3" style={{ color: 'var(--info-color)' }} />Primary Domain & DNS Defaults</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="flex flex-col">
                                    <label htmlFor="PRIMARY_DOMAIN" className="mb-2 text-sm text-[var(--secondary-text)]">Primary Domain</label>
                                    <input
                                        id="PRIMARY_DOMAIN"
                                        type="text"
                                        name="PRIMARY_DOMAIN"
                                        value={settings.PRIMARY_DOMAIN}
                                        onChange={handleChange}
                                        placeholder="e.g., example.com"
                                        className="input-field"
                                    />
                                    <p className="mt-2 text-xs" style={{ color: 'var(--secondary-text)' }}>
                                        Used as the base domain for creating subdomains.
                                    </p>
                                </div>
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

                        {/* Change IP Address (Bulk) */}
                        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: 'var(--primary-text)' }}>
                                <FaServer className="mr-3" style={{ color: 'var(--warning-color)' }} />Change IP Address (Bulk)
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Current IP */}
                                <div className="flex flex-col">
                                    <label className="mb-2 text-sm text-[var(--secondary-text)]">Current IPv4 Address</label>
                                    <input type="text" value={settings.DNS_DEFAULT_IP || detectedIp || ''} readOnly className="input-field" />
                                </div>
                                {/* New IP */}
                                <div className="flex flex-col">
                                    <label className="mb-2 text-sm text-[var(--secondary-text)]">New IPv4 Address</label>
                                    <input type="text" value={bulkIp} onChange={(e) => setBulkIp(e.target.value)} placeholder="e.g., 203.0.113.10" className="input-field" />
                                </div>
                                {/* Mode */}
                                <div className="flex flex-col">
                                    <label className="mb-2 text-sm text-[var(--secondary-text)]">Server to Update</label>
                                    <select value={bulkMode} onChange={(e) => setBulkMode(e.target.value)} className="input-field">
                                        <option value="all">All servers</option>
                                        <option value="selected">Only selected…</option>
                                    </select>
                                </div>
                            </div>
                            {bulkMode === 'selected' && (
                                <div className="mt-4">
                                    <label className="mb-3 text-sm font-medium text-[var(--secondary-text)]">Select domains</label>
                                    <div className="relative">
                                        <div 
                                            className="max-h-64 overflow-y-auto p-4 bg-[var(--card-bg)] border-2 rounded-xl shadow-inner custom-scrollbar"
                                            style={{ 
                                                borderColor: 'var(--border-color)'
                                            }}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {domains.map((d) => {
                                                    const checked = selectedDomains.includes(d);
                                                    return (
                                                        <label
                                                            key={d}
                                                            className={`
                                                                group relative flex items-center gap-3 p-3 rounded-lg border-2 
                                                                transition-all duration-200 cursor-pointer
                                                                ${checked 
                                                                    ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] shadow-md' 
                                                                    : 'bg-[var(--surface-bg)] border-[var(--border-color)] hover:border-[var(--accent-color)]/50 hover:shadow-sm'
                                                                }
                                                                ${isBulkLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={checked}
                                                                onChange={() => toggleDomain(d)}
                                                                disabled={isBulkLoading}
                                                            />
                                                            <div
                                                                className={`
                                                                    relative w-5 h-5 rounded-md flex items-center justify-center 
                                                                    transition-all duration-200 
                                                                    ${checked 
                                                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] scale-110' 
                                                                        : 'bg-transparent border-2 border-[var(--border-color)] group-hover:border-[var(--accent-color)]/70'
                                                                    }
                                                                `}
                                                            >
                                                                <svg
                                                                    className={`w-3 h-3 text-white transition-all duration-200 ${
                                                                        checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                                                                    }`}
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="3"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <path d="M20 6L9 17l-5-5" />
                                                                </svg>
                                                            </div>
                                                            <span className={`
                                                                text-sm font-medium transition-colors duration-200
                                                                ${checked ? 'text-[var(--accent-color)]' : 'text-[var(--primary-text)]'}
                                                            `}>
                                                                {d}
                                                            </span>
                                                            {checked && (
                                                                <div className="absolute inset-0 rounded-lg bg-[var(--accent-color)]/5 pointer-events-none" />
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                                {domains.length === 0 && (
                                                    <div className="col-span-full text-center py-8 text-sm text-[var(--secondary-text)]">
                                                        No domains found.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <style jsx>{`
                                            .custom-scrollbar::-webkit-scrollbar {
                                                width: 8px;
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-track {
                                                background: var(--surface-bg);
                                                border-radius: 4px;
                                                border: 1px solid var(--border-color);
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                                background: var(--accent-color);
                                                border-radius: 4px;
                                                border: 1px solid var(--surface-bg);
                                            }
                                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                                background: var(--accent-color);
                                                opacity: 0.9;
                                            }
                                            .custom-scrollbar {
                                                scrollbar-width: thin;
                                                scrollbar-color: var(--accent-color) var(--surface-bg);
                                            }
                                        `}</style>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="text-sm text-[var(--secondary-text)]">
                                            Selected <span className="font-semibold text-[var(--accent-color)]">{selectedDomains.length}</span> of {domains.length} domains
                                        </div>
                                        {selectedDomains.length > 0 && (
                                            <button
                                                onClick={() => setSelectedDomains([])}
                                                className="text-xs text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                                                disabled={isBulkLoading}
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-6">
                                <div className="text-xs text-[var(--secondary-text)]">
                                    {isBulkLoading && (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="animate-spin inline-block w-4 h-4 rounded-full border-2 border-[var(--accent-color)] border-t-transparent"></span>
                                            Updating IP across zones...
                                        </span>
                                    )}
                                    {!isBulkLoading && bulkResult && (
                                        <span className="inline-flex items-center gap-2 text-[var(--success-color)]">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                            Updated {bulkResult.updatedRecords} records in {bulkResult.updatedDomains.length} zone(s)
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={submitBulkIp}
                                    className={`btn-primary ${isBulkLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    disabled={isBulkLoading || !bulkIp || (bulkMode === 'selected' && selectedDomains.length === 0)}
                                >
                                    {isBulkLoading ? 'Working...' : 'Change Now'}
                                </button>
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
