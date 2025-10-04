import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signup } from '../services/api';
import api from '../services/api';

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
  storage_quota_mb: '',
  email_username: '',
  email_password: '',
  email_quota: '',
  db_name: '',
  db_username: '',
  db_password: ''
};

const Signup = () => {
  const [form, setForm] = useState(initial);
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchPrimary = async () => {
      try {
        const res = await api.get('/public-settings');
        setPrimaryDomain(res.data?.PRIMARY_DOMAIN || '');
      } catch (_) {
        setPrimaryDomain('');
      }
    };
    fetchPrimary();
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    // For locked subdomain field, name will be 'subdomain'
    if (name === 'subdomain') {
      setForm((prev) => ({ ...prev, domain: value ? `${value}.${primaryDomain}` : '' }));
      return;
    }
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
        storage_quota_mb: form.storage_quota_mb ? Number(form.storage_quota_mb) : undefined,
        // Email details
        email_username: form.want_email && form.email_username ? form.email_username : undefined,
        email_password: form.want_email && form.email_password ? form.email_password : undefined,
        email_quota: form.want_email && form.email_quota ? Number(form.email_quota) : undefined,
        // DB details
        db_name: form.want_mysql && form.db_name ? `db_${form.db_name}` : undefined,
        db_username: form.want_mysql && form.db_username ? form.db_username : undefined,
        db_password: form.want_mysql && form.db_password ? form.db_password : undefined
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
              <label className="block text-sm text-[var(--secondary-text)]">Subdomain under Primary Domain <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2 mt-1">
                <input name="subdomain" value={form.domain && primaryDomain && form.domain.endsWith(`.${primaryDomain}`) ? form.domain.replace(`.${primaryDomain}`, '') : ''} onChange={onChange} className="input-field flex-1" placeholder="sub" disabled={!primaryDomain} />
                <span className="text-sm text-[var(--secondary-text)]">.{primaryDomain || '...'}</span>
              </div>
              {!primaryDomain && (
                <p className="text-xs mt-2" style={{ color: 'var(--secondary-text)' }}>
                  Please ask admin to set PRIMARY_DOMAIN first.
                </p>
              )}
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

          {/* Conditional: Email defaults */}
          {form.want_email && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[var(--secondary-text)]">Email Username</label>
                <div className="flex items-center gap-2 mt-1">
                  <input name="email_username" value={form.email_username || ''} onChange={onChange} className="input-field flex-1" placeholder="user" />
                  <span className="text-sm text-[var(--secondary-text)]">@{form.domain || primaryDomain}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--secondary-text)]">Email Password (optional)</label>
                <input type="password" name="email_password" value={form.email_password || ''} onChange={onChange} className="input-field mt-1" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm text-[var(--secondary-text)]">Quota (MB)</label>
                <input type="number" name="email_quota" value={form.email_quota || ''} onChange={onChange} className="input-field mt-1" placeholder="1024" />
              </div>
            </div>
          )}

          {/* Conditional: Database defaults */}
          {form.want_mysql && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[var(--secondary-text)]">Database Name</label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[var(--border-color)] bg-[var(--secondary-bg)] text-[var(--secondary-text)] text-sm">
                    db_
                  </span>
                  <input name="db_name" value={form.db_name || ''} onChange={onChange} className="input-field rounded-l-none" placeholder="mydatabase" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--secondary-text)]">DB Username</label>
                <input name="db_username" value={form.db_username || ''} onChange={onChange} className="input-field mt-1" placeholder="db_user" />
              </div>
              <div>
                <label className="block text-sm text-[var(--secondary-text)]">DB Password (optional)</label>
                <input type="password" name="db_password" value={form.db_password || ''} onChange={onChange} className="input-field mt-1" placeholder="••••••••" />
              </div>
            </div>
          )}

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


