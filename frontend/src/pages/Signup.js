import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signup } from '../services/api';

const initial = {
  username: '',
  domain: '',
  password: '',
  confirm: '',
  email: '',
  full_name: '',
  want_ssl: false,
  want_dns: false,
  want_email: false,
  want_mysql: false,
  storage_quota_mb: ''
};

const Signup = () => {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.username || !form.password) {
      setError('Username and password are required');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        username: form.username,
        domain: form.domain || undefined,
        password: form.password,
        email: form.email || undefined,
        full_name: form.full_name || undefined,
        want_ssl: form.want_ssl,
        want_dns: form.want_dns,
        want_email: form.want_email,
        want_mysql: form.want_mysql,
        storage_quota_mb: form.storage_quota_mb ? Number(form.storage_quota_mb) : undefined
      };
      await signup.submit(payload);
      setSuccess('Request submitted. Please wait for admin approval.');
      setForm(initial);
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--primary-bg)] p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--primary-text)]">Signup Request</h2>
          <p className="text-[var(--secondary-text)] text-sm">Request account creation for Control Panel access</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 px-3 py-2 rounded bg-[var(--danger-color)]/10 border border-[var(--danger-color)]/20 text-[var(--danger-color)] text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 px-3 py-2 rounded bg-green-500/10 border border-green-500/20 text-green-500 text-sm">{success}</div>
          )}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm text-[var(--secondary-text)]">Username</label>
              <input name="username" value={form.username} onChange={onChange} className="input-field mt-1" placeholder="yourname" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm text-[var(--secondary-text)]">Email (optional)</label>
              <input name="email" value={form.email} onChange={onChange} className="input-field mt-1" placeholder="you@example.edu" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--secondary-text)]">Full Name (ชื่อ-นามสกุล)</label>
              <input name="full_name" value={form.full_name} onChange={onChange} className="input-field mt-1" placeholder="ชื่อ นามสกุล" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--secondary-text)]">Domain <span className="text-red-500">*</span></label>
              <input name="domain" value={form.domain} onChange={onChange} className="input-field mt-1" placeholder="example.edu" />
            </div>
            <div>
              <label className="block text-sm text-[var(--secondary-text)]">Password</label>
              <input type="password" name="password" value={form.password} onChange={onChange} className="input-field mt-1" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm text-[var(--secondary-text)]">Confirm Password</label>
              <input type="password" name="confirm" value={form.confirm} onChange={onChange} className="input-field mt-1" placeholder="••••••••" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Requested Services</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'want_ssl', label: 'SSL' },
                  { key: 'want_dns', label: 'DNS Zone' },
                  { key: 'want_email', label: 'Email' },
                  { key: 'want_mysql', label: 'MySQL' }
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => setForm((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className={`w-full px-3 py-2 rounded border text-sm transition-colors
                      ${form[opt.key]
                        ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/40 text-[var(--primary-text)]'
                        : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--secondary-text)]'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.label}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${form[opt.key] ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'}`}></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--secondary-text)]">Storage Quota (MB)</label>
              <input 
                type="number"
                inputMode="numeric"
                min="0"
                name="storage_quota_mb" 
                value={form.storage_quota_mb} 
                onChange={onChange} 
                className="input-field mt-1" 
                placeholder="e.g. 1024" 
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between pt-2">
              <Link to="/login" className="text-sm text-[var(--secondary-text)] hover:text-[var(--primary-text)]">Back to Login</Link>
              <button type="submit" disabled={loading} className="btn-primary px-4 py-2 disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;


