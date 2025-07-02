import React from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ServerIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  CircleStackIcon,
  FolderIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, formData, isLoading }) => {
  if (!isOpen) return null;

  const generatedUsername = formData.domain ? 
    formData.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 
    'example';

  const steps = [
    {
      icon: <ServerIcon className="w-5 h-5" />,
      title: "Create Linux user + home directory",
      description: `Creating user ${generatedUsername} with home directory and public_html`
    },
    {
      icon: <GlobeAltIcon className="w-5 h-5" />,
      title: "Create Apache VirtualHost + DNS zone", 
      description: `Configure Apache for ${formData.domain} and create DNS records`
    },
    {
      icon: <EnvelopeIcon className="w-5 h-5" />,
      title: "Create maildir + email mapping",
      description: `Create email account admin@${formData.domain} with maildir structure`
    },
         {
       icon: <CircleStackIcon className="w-5 h-5" />,
       title: "Create database + user",
       description: "Create MySQL database and user for the website"
     },
    {
      icon: <FolderIcon className="w-5 h-5" />,
      title: "Create FTP user",
      description: "Create FTP/SFTP account for file uploads"
    }
  ];

  if (formData.create_ssl) {
    steps.push({
      icon: <LockClosedIcon className="w-5 h-5" />,
      title: "Request SSL certificate",
      description: "Issue SSL certificate for HTTPS encryption"
    });
  }

  steps.push({
    icon: <ServerIcon className="w-5 h-5" />,
    title: "Save everything to database",
    description: "Save all data to database and perform final setup"
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
           style={{ backgroundColor: 'var(--primary-bg)', borderColor: 'var(--border-color)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" 
             style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-500 mr-3" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--primary-text)' }}>
              Confirm Virtual Host Creation
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" style={{ color: 'var(--secondary-text)' }} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Summary */}
          <div className="p-4 rounded-lg border" style={{ 
            backgroundColor: 'var(--info-bg, rgba(59, 130, 246, 0.1))',
            borderColor: 'var(--info-border, rgba(59, 130, 246, 0.3))'
          }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--info-text, #1e40af)' }}>📋 Configuration Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm" style={{ color: 'var(--info-text-light, #1e3a8a)' }}>
              <div><strong>Domain:</strong> {formData.domain}</div>
              <div><strong>Linux User:</strong> {generatedUsername}</div>
              <div><strong>Server Admin:</strong> {formData.server_admin || `admin@${formData.domain}`}</div>
              <div><strong>PHP Version:</strong> {formData.php_version}</div>
              <div><strong>SSL Certificate:</strong> {formData.create_ssl ? 'Will be issued' : 'Not requested'}</div>
            </div>
          </div>

          {/* Steps Process */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-text)' }}>
              🔄 Steps to Perform ({steps.length} steps)
            </h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} 
                     className="flex items-start p-3 rounded-lg border"
                     style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5"
                       style={{ 
                         backgroundColor: 'var(--accent-color, #3b82f6)',
                         color: 'white'
                       }}>
                    {index + 1}
                  </div>
                  <div className="mr-3 mt-1" style={{ color: 'var(--accent-color, #3b82f6)' }}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: 'var(--primary-text)' }}>
                      {step.title}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 rounded-lg border" style={{ 
            backgroundColor: 'var(--warning-bg, rgba(245, 158, 11, 0.1))',
            borderColor: 'var(--warning-border, rgba(245, 158, 11, 0.3))'
          }}>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--warning-text, #92400e)' }}>⚠️ Warning</h4>
            <ul className="text-sm space-y-1" style={{ color: 'var(--warning-text-light, #a16207)' }}>
              <li>• Creating Virtual Host may take a few minutes, please wait until it's complete</li>
              <li>• If there's an error, the system will delete the data automatically</li>
              <li>• Please check the information carefully before proceeding</li>
              {!formData.create_ssl && (
                <li>• You can request SSL certificate later in SSL Management</li>
              )}
            </ul>
          </div>

          {/* Expected Results */}
          <div className="p-4 rounded-lg border" style={{ 
            backgroundColor: 'var(--success-bg, rgba(16, 185, 129, 0.1))',
            borderColor: 'var(--success-border, rgba(16, 185, 129, 0.3))'
          }}>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--success-text, #065f46)' }}>✅ Expected Results</h4>
            <ul className="text-sm space-y-1" style={{ color: 'var(--success-text-light, #047857)' }}>
              <li>• Website {formData.domain} is ready to use</li>
              <li>• Linux user account for file management</li>
              <li>• Email account admin@{formData.domain}</li>
              <li>• MySQL database for storing data</li>
              <li>• FTP/SFTP access for uploading files</li>
              {formData.create_ssl && <li>• SSL certificate for HTTPS</li>}
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t space-x-3" 
             style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--secondary-text)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
            style={{ 
              backgroundColor: 'var(--accent-color, #3b82f6)',
              '&:hover': { backgroundColor: 'var(--accent-color-hover, #2563eb)' }
            }}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Creating...
              </div>
            ) : (
              <div className="flex items-center">
                <ServerIcon className="w-4 h-4 mr-2" />
                Confirm and Create Virtual Host
              </div>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal; 