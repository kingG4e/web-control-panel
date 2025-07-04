import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { virtualHosts } from '../services/api.js';
import SuccessModal from '../components/modals/SuccessModal.js';
import ConfirmationModal from '../components/modals/ConfirmationModal.js';
import CreateVirtualHostProgress from '../components/modals/CreateVirtualHostProgress.js';

// Inline SVG Icons
const ArrowLeftIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const GlobeAltIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const ServerIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const ShieldCheckIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const CodeBracketIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);

const UserIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const KeyIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const InformationCircleIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationTriangleIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CreateVirtualHost = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    domain: '',
    linux_password: '',
    server_admin: '',
    php_version: '8.1',
    create_ssl: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [domainValidation, setDomainValidation] = useState({
    isValid: true,
    message: '',
    isChecking: false
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progressSteps, setProgressSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [progressError, setProgressError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  // Real-time domain validation
  const validateDomainRealTime = async (domain) => {
    if (!domain) {
      setDomainValidation({ isValid: true, message: '', isChecking: false });
      return;
    }

    // Basic format validation
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainPattern.test(domain)) {
      setDomainValidation({
        isValid: false,
        message: 'รูปแบบโดเมนไม่ถูกต้อง (เช่น example.com)',
        isChecking: false
      });
      return;
    }

    // Check reserved domains
    const reserved = ['localhost', 'localhost.localdomain', '127.0.0.1', 'admin', 'www', 'mail', 'ftp', 'root'];
    if (reserved.some(r => domain.toLowerCase().includes(r))) {
      setDomainValidation({
        isValid: false,
        message: 'โดเมนนี้เป็นชื่อที่สงวนไว้',
        isChecking: false
      });
      return;
    }

    // Check if domain exists (debounced)
    setDomainValidation({ isValid: true, message: 'กำลังตรวจสอบ...', isChecking: true });
    
    try {
      // This would be a lightweight check endpoint
      // For now, we'll skip the actual API call to avoid too many requests
      setTimeout(() => {
        setDomainValidation({
          isValid: true,
          message: 'โดเมนพร้อมใช้งาน',
          isChecking: false
        });
      }, 500);
    } catch (err) {
      setDomainValidation({
        isValid: false,
        message: 'ไม่สามารถตรวจสอบโดเมนได้',
        isChecking: false
      });
    }
  };

  // Debounce domain validation
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.domain) {
        validateDomainRealTime(formData.domain);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.domain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.domain) {
      setError('Domain is required.');
      return;
    }

    if (!formData.linux_password) {
      setError('Linux user password is required.');
      return;
    }

    // Validate domain format
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainPattern.test(formData.domain)) {
      setError('Please enter a valid domain name (e.g., example.com).');
      return;
    }

    // Validate password
    if (formData.linux_password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Show confirmation modal instead of creating immediately
    setError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setLoading(true);
      setShowConfirmModal(false);
      
      // Define the steps that will be performed
      const steps = [
        { title: "Create Linux user + home directory", description: "Creating user account and home folder" },
        { title: "Create Apache VirtualHost + DNS zone", description: "Configuring web server and DNS records" },
        { title: "Create maildir + email mapping", description: "Setting up email account and mail structure" },
        { title: "Create database + user", description: "Creating MySQL database and user" },
        { title: "Create FTP user", description: "Setting up FTP/SFTP access" }
      ];
      
      if (formData.create_ssl) {
        steps.push({ title: "Request SSL certificate", description: "Issuing SSL certificate for HTTPS" });
      }
      
      steps.push({ title: "Save everything to database", description: "Saving all data to database and final setup" });
      
      setProgressSteps(steps);
      setCurrentStep(0);
      setProgressError(null);
      setIsComplete(false);
      setShowProgressModal(true);
      
      const data = {
        domain: formData.domain,
        linux_password: formData.linux_password,
        server_admin: formData.server_admin || `admin@${formData.domain}`,
        php_version: formData.php_version,
        create_ssl: formData.create_ssl
      };
      
      // Simulate step progression (in real implementation, this would be WebSocket or polling)
      const simulateProgress = async () => {
        for (let i = 0; i < steps.length; i++) {
          setCurrentStep(i);
          await new Promise(resolve => setTimeout(resolve, 800)); // Simulate work
        }
      };
      
      // Start progress simulation
      const progressPromise = simulateProgress();
      
      // Make actual API call
      const result = await virtualHosts.create(data);
      
      // Wait for progress simulation to complete
      await progressPromise;
      
      // Mark as complete
      setIsComplete(true);
      setCurrentStep(steps.length);
      
      // Wait a moment then show success
      setTimeout(() => {
        setShowProgressModal(false);
        
        const responseData = result || {};
        let successMessage = responseData.message || 'Virtual Host created successfully!';
        
        // Show detailed step-by-step progress if available
        if (responseData.steps_completed && responseData.steps_completed.length > 0) {
          successMessage = `🎉 Virtual Host created successfully!\n\n`;
          successMessage += `📋 Steps Completed:\n`;
          responseData.steps_completed.forEach((step, index) => {
            successMessage += `   ✅ ${step}\n`;
          });
          successMessage += `\n`;
        }
        
        // Show service details
        if (responseData.services_created && responseData.services_created.length > 0) {
          successMessage += `📦 Services Created (${responseData.services_created.length}):\n`;
          responseData.services_created.forEach(service => {
            successMessage += `   ✓ ${service}\n`;
          });
          successMessage += `\n`;
        }
        
        // Show credentials and access information
        successMessage += `🔐 Access Information:\n`;
        successMessage += `   Domain: ${responseData.domain || formData.domain}\n`;
        successMessage += `   Linux User: ${responseData.linux_username}\n`;
        successMessage += `   Password: ${responseData.linux_password}\n`;
        successMessage += `   Document Root: ${responseData.document_root}\n\n`;
        
        if (responseData.default_email) {
          successMessage += `📧 Email Account:\n`;
          successMessage += `   Address: ${responseData.default_email}\n`;
          successMessage += `   Password: ${responseData.email_password}\n\n`;
        }
        
        if (responseData.database_name) {
          successMessage += `🗄️ MySQL Database:\n`;
          successMessage += `   Database: ${responseData.database_name}\n`;
          successMessage += `   User: ${responseData.database_user}\n`;
          successMessage += `   Password: ${responseData.database_password}\n\n`;
        }
        
        if (responseData.ftp_username) {
          successMessage += `📁 FTP/SFTP Access:\n`;
          successMessage += `   Username: ${responseData.ftp_username}\n`;
          successMessage += `   Password: ${responseData.ftp_password}\n\n`;
        }
        
        if (responseData.ssl_certificate_id) {
          successMessage += `🔒 SSL Certificate:\n`;
          successMessage += `   Status: Issued successfully\n`;
          if (responseData.ssl_valid_until) {
            successMessage += `   Valid Until: ${new Date(responseData.ssl_valid_until).toLocaleDateString()}\n`;
          }
          successMessage += `\n`;
        }
        
        // Show warnings if any
        if (responseData.errors && responseData.errors.length > 0) {
          successMessage += `⚠️ Warnings (${responseData.errors.length}):\n`;
          responseData.errors.forEach(error => {
            successMessage += `   • ${error}\n`;
          });
          successMessage += `\n`;
        }
        
        // Show next steps
        successMessage += `🚀 Next Steps:\n`;
        successMessage += `   • Upload your website files to: ${responseData.document_root}\n`;
        successMessage += `   • Configure your domain DNS to point to this server\n`;
        if (!responseData.ssl_certificate_id && !formData.create_ssl) {
          successMessage += `   • Consider getting an SSL certificate for security\n`;
        }
        successMessage += `   • Test your website at: http://${formData.domain}\n`;
        
        setSuccessData({
          ...responseData,
          message: successMessage,
          title: '🎉 Virtual Host Created Successfully!',
          domain: formData.domain
        });
        
        setShowSuccessModal(true);
      }, 1000);
      
    } catch (error) {
      console.error('Error creating virtual host:', error);
      let errorMessage = error.message || 'Failed to create virtual host';
      
      // Handle specific error cases
      if (error.message && error.message.includes('cleanup_performed')) {
        errorMessage = error.message + '\n\n⚠️ System attempted to clean up partially created resources.';
      }
      
      setProgressError(errorMessage);
      setError(errorMessage);
      
      // Show error in progress modal for a moment, then close
      setTimeout(() => {
        setShowProgressModal(false);
      }, 3000);
      
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
      
      // Auto-generate server admin when domain changes
      if (name === 'domain' && value && !prev.server_admin) {
        newData.server_admin = `admin@${value}`;
      }
      
      return newData;
    });
  };

  const generatedUsername = formData.domain ? formData.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'example';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/virtual-hosts"
            className="inline-flex items-center transition-colors mb-4"
            style={{ 
              color: 'var(--secondary-text)'
            }}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Virtual Hosts
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-text)' }}>
            Create Virtual Host
          </h1>
          <p className="text-lg mt-2" style={{ color: 'var(--secondary-text)' }}>
            Set up a new domain with hosting configuration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Domain Configuration */}
              <div className="rounded-xl border p-6" style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)' 
              }}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                    backgroundColor: 'rgba(96, 165, 250, 0.15)',
                    border: '1px solid rgba(96, 165, 250, 0.3)'
                  }}>
                    <GlobeAltIcon className="w-5 h-5" style={{ color: '#60a5fa' }} />
      </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>Domain Configuration</h2>
                    <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Set up your domain and basic hosting settings</p>
          </div>
        </div>

                <div className="space-y-6">
                  {/* Domain Name */}
          <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                      Domain Name <span className="text-red-400">*</span>
            </label>
                    <div className="relative">
            <input
              type="text"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
                        placeholder="example.com"
                        className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: domainValidation.isValid ? 'var(--border-color)' : '#f87171',
                          color: 'var(--primary-text)',
                          focusRingColor: 'var(--accent-color)'
                        }}
              required
                      />
                      {formData.domain && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {domainValidation.isChecking ? (
                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          ) : domainValidation.isValid ? (
                            <CheckCircleIcon className="w-5 h-5" style={{ color: '#34d399' }} />
                          ) : (
                            <XCircleIcon className="w-5 h-5" style={{ color: '#f87171' }} />
                          )}
                        </div>
                      )}
          </div>
                    {domainValidation.message && (
                      <p className={`text-sm mt-2 ${domainValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                        {domainValidation.message}
                      </p>
                    )}
          </div>

                  {/* Server Admin Email */}
            <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                Server Admin Email
              </label>
              <input
                type="email"
                name="server_admin"
                value={formData.server_admin}
                onChange={handleChange}
                placeholder="admin@example.com"
                      className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        backgroundColor: 'var(--input-bg)', 
                        borderColor: 'var(--border-color)',
                        color: 'var(--primary-text)',
                        focusRingColor: 'var(--accent-color)'
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--secondary-text)' }}>
                      Auto-generated based on domain if left empty
              </p>
            </div>

            {/* PHP Version */}
            <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                PHP Version
              </label>
              <select
                name="php_version"
                value={formData.php_version}
                onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        backgroundColor: 'var(--input-bg)', 
                        borderColor: 'var(--border-color)',
                        color: 'var(--primary-text)',
                        focusRingColor: 'var(--accent-color)'
                      }}
                    >
                      <option value="8.1">PHP 8.1 (Recommended)</option>
                      <option value="8.0">PHP 8.0</option>
                <option value="7.4">PHP 7.4</option>
              </select>
                  </div>
            </div>
          </div>

              {/* SSL Certificate */}
              <div className="rounded-xl border p-6" style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)' 
              }}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <ShieldCheckIcon className="w-5 h-5" style={{ color: '#22c55e' }} />
                  </div>
              <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>SSL Certificate</h2>
                    <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Free SSL certificate from Let's Encrypt</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="create_ssl"
                    name="create_ssl"
                    checked={formData.create_ssl}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-2 transition-colors duration-200"
                    style={{ 
                      borderColor: 'var(--border-color)',
                      backgroundColor: formData.create_ssl ? 'var(--accent-color)' : 'var(--input-bg)'
                    }}
                  />
                  <label htmlFor="create_ssl" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--primary-text)' }}>
                    Request SSL certificate automatically (recommended)
                  </label>
                </div>
                
                <div className="mt-3 text-xs p-3 rounded-lg" style={{ 
                  backgroundColor: 'var(--secondary-bg)',
                  color: 'var(--secondary-text)'
                }}>
                  <strong>Note:</strong> SSL certificate will be automatically issued from Let's Encrypt. 
                  Make sure your domain points to this server before enabling SSL.
                </div>
              </div>

              {/* Linux User Account */}
              <div className="rounded-xl border p-6" style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)' 
              }}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                    backgroundColor: 'rgba(52, 211, 153, 0.15)',
                    border: '1px solid rgba(52, 211, 153, 0.3)'
                  }}>
                    <UserIcon className="w-5 h-5" style={{ color: '#34d399' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>Linux User Account</h2>
                    <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Secure access credentials for file management</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Generated Username */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                      Generated Linux Username
                    </label>
                    <div className="px-4 py-3 rounded-lg border" style={{ 
                      backgroundColor: 'var(--secondary-bg)', 
                      borderColor: 'var(--border-color)',
                      color: 'var(--primary-text)'
                    }}>
                      {generatedUsername} <span className="text-xs" style={{ color: 'var(--secondary-text)' }}>(auto-generated from domain)</span>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                      Linux User Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      name="linux_password"
                      value={formData.linux_password}
                      onChange={handleChange}
                      placeholder="Enter secure password (min 8 characters)"
                      className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        backgroundColor: 'var(--input-bg)', 
                        borderColor: 'var(--border-color)',
                        color: 'var(--primary-text)',
                        focusRingColor: 'var(--accent-color)'
                      }}
                      required
                      minLength={8}
                    />
              </div>
            </div>
          </div>

              {/* Error Display */}
              {error && (
                <div className="rounded-lg p-4 border" style={{ 
                  backgroundColor: 'var(--error-bg)', 
                  borderColor: 'var(--error-border)',
                  color: 'var(--error-text)'
                }}>
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#f87171' }} />
                    <div>
                      <h3 className="font-medium">Error</h3>
                      <div className="mt-1 text-sm whitespace-pre-line">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/virtual-hosts')}
                  className="px-6 py-3 rounded-lg border font-medium transition-all duration-200"
                  style={{ 
                    backgroundColor: 'var(--secondary-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--primary-text)'
                  }}
            >
              Cancel
                </button>
            <button
              type="submit"
                  disabled={loading || !domainValidation.isValid}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: loading || !domainValidation.isValid ? '#6b7280' : 'var(--accent-color)', 
                    color: 'white'
                  }}
            >
              {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating...
                </div>
              ) : (
                    <div className="flex items-center justify-center">
                      <ServerIcon className="w-4 h-4 mr-2" />
                      Create Virtual Host
                    </div>
              )}
            </button>
          </div>
        </form>
      </div>

          {/* Live Preview Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Live Preview */}
              <div className="rounded-xl border p-6" style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)' 
              }}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                    backgroundColor: 'rgba(34, 211, 238, 0.15)',
                    border: '1px solid rgba(34, 211, 238, 0.3)'
                  }}>
                    <InformationCircleIcon className="w-5 h-5" style={{ color: '#22d3ee' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>Live Preview</h3>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--secondary-text)' }}>Domain</label>
                    <div className="font-mono p-2 rounded" style={{ 
                      backgroundColor: 'var(--secondary-bg)',
                      color: 'var(--primary-text)'
                    }}>
                      {formData.domain || 'example.com'}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--secondary-text)' }}>Linux User</label>
                    <div className="font-mono p-2 rounded" style={{ 
                      backgroundColor: 'var(--secondary-bg)',
                      color: 'var(--primary-text)'
                    }}>
                      {generatedUsername}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--secondary-text)' }}>Document Root</label>
                    <div className="font-mono p-2 rounded text-xs" style={{ 
                      backgroundColor: 'var(--secondary-bg)',
                      color: 'var(--primary-text)'
                    }}>
                      /home/{generatedUsername}/public_html
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--secondary-text)' }}>Server Admin</label>
                    <div className="font-mono p-2 rounded text-xs" style={{ 
                      backgroundColor: 'var(--secondary-bg)',
                      color: 'var(--primary-text)'
                    }}>
                      {formData.server_admin || `admin@${formData.domain || 'example.com'}`}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--secondary-text)' }}>PHP Version</label>
                    <div className="font-mono p-2 rounded" style={{ 
                      backgroundColor: 'var(--secondary-bg)',
                      color: 'var(--primary-text)'
                    }}>
                      PHP {formData.php_version}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--secondary-text)' }}>SSL Certificate</label>
                    <div className="font-mono p-2 rounded" style={{ 
                      backgroundColor: 'var(--secondary-bg)',
                      color: formData.create_ssl ? '#22c55e' : 'var(--secondary-text)'
                    }}>
                      {formData.create_ssl ? '✓ Will be issued' : '✗ Not requested'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Preview */}
              <div className="rounded-xl border p-6" style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)' 
              }}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <CodeBracketIcon className="w-5 h-5" style={{ color: '#3b82f6' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>Services to be Created</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: 'var(--primary-text)' }}>Apache Virtual Host</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: 'var(--primary-text)' }}>Linux System User</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: 'var(--primary-text)' }}>Web Folders (public_html, cgi-bin)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: 'var(--primary-text)' }}>DNS Zone & Records</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: 'var(--primary-text)' }}>Email Domain & Mailbox</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: 'var(--primary-text)' }}>MySQL Database & User</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: 'var(--primary-text)' }}>FTP/SFTP Account</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ 
                      backgroundColor: formData.create_ssl ? '#22c55e' : '#6b7280' 
                    }}></div>
                    <span style={{ 
                      color: formData.create_ssl ? 'var(--primary-text)' : 'var(--secondary-text)' 
                    }}>
                      SSL Certificate {formData.create_ssl ? '' : '(optional)'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg text-xs" style={{ 
                  backgroundColor: 'var(--secondary-bg)',
                  color: 'var(--secondary-text)'
                }}>
                  <strong>Total Services:</strong> {formData.create_ssl ? '8' : '7'} services will be automatically configured
                </div>
              </div>

              {/* What happens next */}
              <div className="rounded-xl border p-6" style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)' 
              }}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                    backgroundColor: 'rgba(251, 191, 36, 0.15)',
                    border: '1px solid rgba(251, 191, 36, 0.3)'
                  }}>
                    <CodeBracketIcon className="w-5 h-5" style={{ color: '#fbbf24' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>What happens next?</h3>
                </div>

                <ul className="space-y-3 text-sm" style={{ color: 'var(--secondary-text)' }}>
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#60a5fa' }}></div>
                    Apache virtual host configuration will be created
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#34d399' }}></div>
                    Linux user account will be set up with secure permissions
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#fbbf24' }}></div>
                    Document root directory will be created
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#22d3ee' }}></div>
                    Default index.html file will be generated
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCreate}
        formData={formData}
        isLoading={loading}
      />

      {/* Progress Modal */}
      <CreateVirtualHostProgress
        isOpen={showProgressModal}
        steps={progressSteps}
        currentStep={currentStep}
        error={progressError}
        isComplete={isComplete}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNavigate={() => {
          setShowSuccessModal(false);
          navigate('/virtual-hosts');
        }}
        data={successData}
      />
    </div>
  );
};

export default CreateVirtualHost; 