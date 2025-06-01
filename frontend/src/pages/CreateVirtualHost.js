import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StepIndicator = ({ currentStep, totalSteps, titles }) => (
  <div className="mb-8">
    <div className="relative flex justify-between items-center px-4">
      {/* Progress Line Background */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-600/30" />
      
      {/* Active Progress Line */}
      <div 
        className="absolute top-1/2 left-0 h-[1px] bg-[var(--primary)] transition-all duration-300"
        style={{ width: `${((currentStep - 1) / (titles.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      {titles.map((title, index) => {
        const isActive = index + 1 === currentStep;
        const isCompleted = index + 1 < currentStep;
        return (
          <div 
            key={index} 
            className="relative flex flex-col items-center"
          >
            {/* Step Number */}
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center 
                transition-all duration-200 z-10
                ${isActive || isCompleted
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-800 text-gray-400'
                }
              `}
            >
              <span className="text-sm font-medium">{index + 1}</span>
            </div>

            {/* Step Title */}
            <span 
              className={`
                mt-3 text-xs font-medium whitespace-nowrap
                ${isActive || isCompleted
                  ? 'text-gray-200'
                  : 'text-gray-500'
                }
              `}
            >
              {title}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const Card = ({ title, children, icon }) => (
  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6 space-y-4">
    <div className="flex items-center space-x-3">
      {icon}
      <h3 className="text-lg font-medium text-[var(--text-primary)]">{title}</h3>
    </div>
    {children}
  </div>
);

const CreateVirtualHost = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Basic Settings
    domain: '',
    description: '',
    username: '',
    userPassword: '',
    confirmPassword: '',
    serverType: 'apache',
    phpVersion: '8.2',
    documentRoot: '',
    enableSSL: false,
    
    // Server Settings
    serverAlias: '',
    ipAddress: 'any',
    port: '80',
    
    // PHP Settings
    enablePHP: true,
    maxExecutionTime: '30',
    maxFileUploads: '20',
    uploadMaxFilesize: '2M',
    memoryLimit: '128M',
    
    // Database Settings
    createDatabase: false,
    
    // DNS Settings
    createDNS: false,
    enableWWWAlias: true,
  });

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [creationStatus, setCreationStatus] = useState({});
  const [isCreationComplete, setIsCreationComplete] = useState(false);

  const stepTitles = [
    'Basic Info',
    'Server Setup',
    'Services',
    'Review'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      // Auto-fill document root based on username if it's empty or contains previous username
      if (name === 'username' && (prev.documentRoot === '' || prev.documentRoot.includes(prev.username))) {
        newState.documentRoot = `/home/${value}/public_html`;
      }

      return newState;
    });
  };

  // Generate random password
  const generatePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.domain) {
      newErrors.domain = 'Domain name is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Invalid domain name format';
    }
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.userPassword) {
      newErrors.userPassword = 'Password is required';
    } else if (formData.userPassword.length < 8) {
      newErrors.userPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(formData.userPassword)) {
      newErrors.userPassword = 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character';
    }

    if (formData.userPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent resubmission if creation is already complete
    if (isCreationComplete) {
      return;
    }
    
    // Only validate and submit when on the final step and the submit button is clicked
    if (step === 4) {
      if (!validateForm()) {
        return;
      }
      
      setIsSubmitting(true);
      
      try {
        // Simulate server creation process
        setCreationStatus({
          apache: { status: 'pending', message: 'Creating Apache VHost configuration...' },
          dns: { status: 'pending', message: 'Setting up DNS zone...' },
          home: { status: 'pending', message: 'Creating home directory...' },
          user: { status: 'pending', message: 'Creating Linux user...' },
          database: { status: 'pending', message: 'Setting up MySQL database...' },
          ssl: { status: 'pending', message: 'Requesting SSL certificate...' },
          logging: { status: 'pending', message: 'Configuring log files...' }
        });

        // Simulate sequential creation process
        await simulateCreation('apache', `/etc/apache2/sites-available/${formData.domain}.conf`);
        await simulateCreation('dns', `/etc/bind/zones/${formData.domain}.hosts`);
        await simulateCreation('home', `/home/${formData.username}/public_html`);
        await simulateCreation('user', formData.username);
        if (formData.createDatabase) {
          await simulateCreation('database', formData.username);
        }
        if (formData.enableSSL) {
          await simulateCreation('ssl', formData.domain);
        }
        await simulateCreation('logging', 'Setting up log files');

        setIsCreationComplete(true);
      } catch (error) {
        console.error('Failed to create virtual host:', error);
        setErrors({ submit: 'Failed to create virtual host. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (validateForm()) {
      setStep(step + 1);
    }
  };

  const simulateCreation = async (key, detail) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCreationStatus(prev => ({
      ...prev,
      [key]: { status: 'complete', message: `Completed: ${detail}` }
    }));
  };

  const renderCreationStatus = () => {
    const allTasksComplete = Object.values(creationStatus).every(status => status.status === 'complete');

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Creation Progress</h3>
        <div className="space-y-2">
          {Object.entries(creationStatus).map(([key, status]) => (
            <div key={key} className="flex items-center space-x-2">
              {status.status === 'pending' ? (
                <svg className="animate-spin h-4 w-4 text-[var(--primary)]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="text-[var(--text-primary)]">{status.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Configuration Summary</h3>
        <div className="bg-[var(--hover-bg)] rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-3">Domain Information</h4>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>Domain: {formData.domain}</p>
                <p>Server Type: {formData.serverType}</p>
                <p>Document Root: {formData.documentRoot}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-3">User Account</h4>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>Username: {formData.username}</p>
                <p>Email: {formData.username}@{formData.domain}</p>
                <p>Access: SSH, FTP, Email</p>
                <p>Password: {formData.userPassword ? '✓ Set' : '✗ Not set'}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-3">DNS Configuration</h4>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>DNS Zone: {formData.createDNS ? '✓ Enabled' : '✗ Disabled'}</p>
                <p>WWW Alias: {formData.enableWWWAlias ? '✓ Enabled' : '✗ Disabled'}</p>
              </div>
            </div>
            
            {formData.createDatabase && (
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-3">MySQL Database</h4>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <p>Database: {formData.username}_db</p>
                  <p>User: {formData.username}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {isSubmitting || isCreationComplete ? renderCreationStatus() : null}
      </div>
    );
  };

  const renderBasicSettings = () => (
    <div className="space-y-6">
      <Card
        title="Domain Information"
        icon={
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        }
      >
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Domain Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                placeholder="example.com"
                className={`w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border ${
                  errors.domain ? 'border-red-500' : 'border-[var(--border-color)]'
                } rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]`}
                required
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            {errors.domain && <p className="mt-1 text-sm text-red-500">{errors.domain}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Description
            </label>
            <div className="relative">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description for this virtual server"
                rows="3"
                className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="User Account"
        icon={
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      >
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={`w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border ${
                  errors.username ? 'border-red-500' : 'border-[var(--border-color)]'
                } rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]`}
                required
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                name="userPassword"
                value={formData.userPassword}
                onChange={handleChange}
                placeholder="Enter password"
                className={`w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border ${
                  errors.userPassword ? 'border-red-500' : 'border-[var(--border-color)]'
                } rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]`}
                required
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            {errors.userPassword && <p className="mt-1 text-sm text-red-500">{errors.userPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={`w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-[var(--border-color)]'
                } rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]`}
                required
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          <div className="bg-[var(--hover-bg)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Password Requirements:</h4>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
              <li className={`flex items-center ${formData.userPassword.length >= 8 ? 'text-green-500' : ''}`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {formData.userPassword.length >= 8 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                At least 8 characters
              </li>
              <li className={`flex items-center ${/[A-Z]/.test(formData.userPassword) ? 'text-green-500' : ''}`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {/[A-Z]/.test(formData.userPassword) ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                One uppercase letter
              </li>
              <li className={`flex items-center ${/[a-z]/.test(formData.userPassword) ? 'text-green-500' : ''}`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {/[a-z]/.test(formData.userPassword) ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                One lowercase letter
              </li>
              <li className={`flex items-center ${/[0-9]/.test(formData.userPassword) ? 'text-green-500' : ''}`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {/[0-9]/.test(formData.userPassword) ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                One number
              </li>
              <li className={`flex items-center ${/[^A-Za-z0-9]/.test(formData.userPassword) ? 'text-green-500' : ''}`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {/[^A-Za-z0-9]/.test(formData.userPassword) ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                One special character
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderServerSettings = () => (
    <div className="space-y-6">
      <Card
        title="Server Configuration"
        icon={
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Server Type
            </label>
            <div className="flex space-x-4">
              {['apache', 'nginx'].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="radio"
                    name="serverType"
                    value={type}
                    checked={formData.serverType === type}
                    onChange={handleChange}
                    className="h-4 w-4 text-[var(--primary)] border-[var(--border-color)] focus:ring-[var(--primary)]"
                  />
                  <span className="ml-2 capitalize text-[var(--text-primary)]">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              SSL Configuration
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="enableSSL"
                id="enableSSL"
                checked={formData.enableSSL}
                onChange={handleChange}
                className="h-4 w-4 text-[var(--primary)] border-[var(--border-color)] rounded focus:ring-[var(--primary)]"
              />
              <label htmlFor="enableSSL" className="text-[var(--text-primary)]">
                Enable SSL/HTTPS
              </label>
            </div>
            {formData.enableSSL && (
              <div className="mt-2 p-4 bg-[var(--hover-bg)] rounded-lg">
                <div className="text-sm text-[var(--text-secondary)]">
                  <p>• Free Let's Encrypt SSL certificate will be automatically generated</p>
                  <p>• HTTP traffic will be redirected to HTTPS</p>
                  <p>• Certificate will be auto-renewed before expiration</p>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Server Aliases
            </label>
            <div className="relative">
              <input
                type="text"
                name="serverAlias"
                value={formData.serverAlias}
                onChange={handleChange}
                placeholder="www.example.com example.net www.example.net"
                className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Separate multiple aliases with spaces</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              IP Address
            </label>
            <div className="relative">
              <select
                name="ipAddress"
                value={formData.ipAddress}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)] appearance-none"
              >
                <option value="any">Any</option>
                <option value="127.0.0.1">127.0.0.1</option>
              </select>
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <svg className="absolute right-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Port
            </label>
            <div className="relative">
              <input
                type="text"
                name="port"
                value={formData.port}
                onChange={handleChange}
                placeholder="80"
                className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="PHP Configuration"
        icon={
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="enablePHP"
              id="enablePHP"
              checked={formData.enablePHP}
              onChange={handleChange}
              className="h-4 w-4 text-[var(--primary)] border-[var(--border-color)] rounded focus:ring-[var(--primary)]"
            />
            <label htmlFor="enablePHP" className="ml-2 text-[var(--text-primary)]">
              Enable PHP
            </label>
          </div>

          {formData.enablePHP && (
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  PHP Version
                </label>
                <div className="relative">
                  <select
                    name="phpVersion"
                    value={formData.phpVersion}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)] appearance-none"
                  >
                    <option value="8.2">PHP 8.2</option>
                    <option value="8.1">PHP 8.1</option>
                    <option value="8.0">PHP 8.0</option>
                    <option value="7.4">PHP 7.4</option>
                  </select>
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                  <svg className="absolute right-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Memory Limit
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="memoryLimit"
                    value={formData.memoryLimit}
                    onChange={handleChange}
                    placeholder="128M"
                    className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Max Execution Time
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="maxExecutionTime"
                    value={formData.maxExecutionTime}
                    onChange={handleChange}
                    placeholder="30"
                    className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Upload Max Filesize
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="uploadMaxFilesize"
                    value={formData.uploadMaxFilesize}
                    onChange={handleChange}
                    placeholder="2M"
                    className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-6">
      <Card
        title="Database Service"
        icon={
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="createDatabase"
              id="createDatabase"
              checked={formData.createDatabase}
              onChange={handleChange}
              className="h-4 w-4 text-[var(--primary)] border-[var(--border-color)] rounded focus:ring-[var(--primary)]"
            />
            <label htmlFor="createDatabase" className="ml-2 text-[var(--text-primary)]">
              Create MySQL Database
            </label>
          </div>

          {formData.createDatabase && (
            <div className="mt-4 p-4 bg-[var(--hover-bg)] rounded-lg">
              <p className="text-sm text-[var(--text-secondary)]">
                Database will be created using Linux user credentials:
                <br />
                - Database name: {formData.username}_db
                <br />
                - Database user: {formData.username}
                <br />
                - Email: {formData.username}@{formData.domain}
                <br />
                - Password: Auto-generated on creation
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card
        title="DNS Service"
        icon={
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="createDNS"
              id="createDNS"
              checked={formData.createDNS}
              onChange={handleChange}
              className="h-4 w-4 text-[var(--primary)] border-[var(--border-color)] rounded focus:ring-[var(--primary)]"
            />
            <label htmlFor="createDNS" className="ml-2 text-[var(--text-primary)]">
              Create DNS Zone
            </label>
          </div>

          {formData.createDNS && (
            <div className="mt-4 p-4 bg-[var(--hover-bg)] rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enableWWWAlias"
                  id="enableWWWAlias"
                  checked={formData.enableWWWAlias}
                  onChange={handleChange}
                  className="h-4 w-4 text-[var(--primary)] border-[var(--border-color)] rounded focus:ring-[var(--primary)]"
                />
                <label htmlFor="enableWWWAlias" className="ml-2 text-[var(--text-primary)]">
                  Create www.domain.com alias
                </label>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Create Virtual Server</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Configure a new virtual server with web, mail, and DNS services</p>
        </div>
        <button
          onClick={() => navigate('/virtual-hosts')}
          className="flex items-center px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      <StepIndicator currentStep={step} totalSteps={4} titles={stepTitles} />

      <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="space-y-6">
          {step === 1 && renderBasicSettings()}
          {step === 2 && renderServerSettings()}
          {step === 3 && renderServices()}
          {step === 4 && renderSummary()}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border-color)]">
          {step > 1 && !isCreationComplete && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center px-6 py-2.5 text-[var(--text-primary)] bg-[var(--hover-bg)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
          )}
          
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors ml-auto"
            >
              Next
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : !isCreationComplete ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Virtual Server...
                </>
              ) : (
                <>
                  Create Virtual Server
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/virtual-hosts')}
              className="flex items-center px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors ml-auto"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete Setup
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateVirtualHost; 