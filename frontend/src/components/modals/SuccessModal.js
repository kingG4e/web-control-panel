import React from 'react';
import {
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  ServerIcon,
  CircleStackIcon,
  EnvelopeIcon,
  LockClosedIcon,
  FolderIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const SuccessModal = ({ isOpen, onClose, onNavigate, data }) => {
  if (!isOpen || !data) return null;

  const getServiceIcon = (serviceName) => {
    if (serviceName.includes('Linux User')) return <ServerIcon className="w-5 h-5" />;
    if (serviceName.includes('Apache') || serviceName.includes('VirtualHost')) return <GlobeAltIcon className="w-5 h-5" />;
    if (serviceName.includes('DNS')) return <GlobeAltIcon className="w-5 h-5" />;
    if (serviceName.includes('Email') || serviceName.includes('Maildir')) return <EnvelopeIcon className="w-5 h-5" />;
    if (serviceName.includes('MySQL') || serviceName.includes('Database')) return <CircleStackIcon className="w-5 h-5" />;
    if (serviceName.includes('FTP') || serviceName.includes('SFTP')) return <FolderIcon className="w-5 h-5" />;
    if (serviceName.includes('SSL')) return <LockClosedIcon className="w-5 h-5" />;
    return <CheckCircleIcon className="w-5 h-5" />;
  };

  const handleViewSite = () => {
    if (data.domain) {
      window.open(`http://${data.domain}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
           style={{ backgroundColor: 'var(--primary-bg)', borderColor: 'var(--border-color)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" 
             style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-500 mr-3" />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>
              {data.title || 'Virtual Host Created Successfully!'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            style={{ backgroundColor: 'transparent' }}
          >
            <XMarkIcon className="w-6 h-6" style={{ color: 'var(--secondary-text)' }} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Steps Completed */}
          {data.steps_completed && data.steps_completed.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center" 
                  style={{ color: 'var(--primary-text)' }}>
                <CheckCircleIcon className="w-6 h-6 text-green-500 mr-2" />
                Steps Completed ({data.steps_completed.length})
              </h3>
              <div className="grid gap-3">
                {data.steps_completed.map((step, index) => (
                  <div key={index} 
                       className="flex items-center p-3 rounded-lg border"
                       style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <span style={{ color: 'var(--primary-text)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Created */}
          {data.services_created && data.services_created.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center" 
                  style={{ color: 'var(--primary-text)' }}>
                <ServerIcon className="w-6 h-6 text-blue-500 mr-2" />
                Services Created ({data.services_created.length})
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {data.services_created.map((service, index) => (
                  <div key={index} 
                       className="flex items-center p-3 rounded-lg border"
                       style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="text-blue-500 mr-3">
                      {getServiceIcon(service)}
                    </div>
                    <span style={{ color: 'var(--primary-text)' }}>{service}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center" 
                style={{ color: 'var(--primary-text)' }}>
              <ServerIcon className="w-6 h-6 text-purple-500 mr-2" />
              Access Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Basic Info */}
              <div className="p-4 rounded-lg border space-y-3"
                   style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <h4 className="font-semibold" style={{ color: 'var(--primary-text)' }}>Server Details</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Domain:</strong> {data.domain}</div>
                  <div><strong>Linux User:</strong> {data.linux_username}</div>
                  <div><strong>Password:</strong> 
                    <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {data.linux_password}
                    </code>
                  </div>
                  <div><strong>Document Root:</strong> {data.document_root}</div>
                </div>
              </div>

              {/* Email Info */}
              {data.default_email && (
                <div className="p-4 rounded-lg border space-y-3"
                     style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <h4 className="font-semibold flex items-center" style={{ color: 'var(--primary-text)' }}>
                    <EnvelopeIcon className="w-4 h-4 mr-2" />
                    Email Account
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Address:</strong> {data.default_email}</div>
                    <div><strong>Password:</strong> 
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {data.email_password}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Database Info */}
              {data.database_name && (
                <div className="p-4 rounded-lg border space-y-3"
                     style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                     <h4 className="font-semibold flex items-center" style={{ color: 'var(--primary-text)' }}>
                     <CircleStackIcon className="w-4 h-4 mr-2" />
                     MySQL Database
                   </h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Database:</strong> {data.database_name}</div>
                    <div><strong>User:</strong> {data.database_user}</div>
                    <div><strong>Password:</strong> 
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {data.database_password}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* FTP Info */}
              {data.ftp_username && (
                <div className="p-4 rounded-lg border space-y-3"
                     style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <h4 className="font-semibold flex items-center" style={{ color: 'var(--primary-text)' }}>
                    <FolderIcon className="w-4 h-4 mr-2" />
                    FTP/SFTP Access
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Username:</strong> {data.ftp_username}</div>
                    <div><strong>Password:</strong> 
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {data.ftp_password}
                      </code>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* SSL Certificate Info */}
          {data.ssl_certificate_id && (
            <div className="p-4 rounded-lg border"
                 style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold flex items-center mb-3" style={{ color: 'var(--primary-text)' }}>
                <LockClosedIcon className="w-5 h-5 text-green-500 mr-2" />
                SSL Certificate
              </h4>
              <div className="text-sm">
                <div><strong>Status:</strong> <span className="text-green-600">Issued successfully</span></div>
                {data.ssl_valid_until && (
                  <div><strong>Valid Until:</strong> {new Date(data.ssl_valid_until).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {data.errors && data.errors.length > 0 && (
            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
              <h4 className="font-semibold text-yellow-800 mb-3">
                ⚠️ Warnings ({data.errors.length})
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {data.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
            <h4 className="font-semibold text-blue-800 mb-3">🚀 Next Steps</h4>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Upload your website files to: <code className="bg-blue-100 px-1 rounded">{data.document_root}</code></li>
              <li>• Configure your domain DNS to point to this server</li>
              {!data.ssl_certificate_id && (
                <li>• Consider getting an SSL certificate for security</li>
              )}
              <li>• Test your website at: 
                <button 
                  onClick={handleViewSite}
                  className="ml-1 text-blue-600 hover:text-blue-800 underline"
                >
                  http://{data.domain}
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t" 
             style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={handleViewSite}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
          >
            <GlobeAltIcon className="w-4 h-4 mr-2" />
            View Website
          </button>
          
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--secondary-text)' }}
            >
              Close
            </button>
            <button
              onClick={onNavigate}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
            >
              Go to Virtual Hosts
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuccessModal; 