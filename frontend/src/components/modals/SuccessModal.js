import React from 'react';
import {
  CheckCircleIcon,
  ArrowRightIcon,
  ServerIcon,
  CircleStackIcon,
  EnvelopeIcon,
  LockClosedIcon,
  FolderIcon,
  GlobeAltIcon,
  ClipboardIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import BaseModal, { ModalSection, ModalSectionTitle, ModalInfoBox, ModalButton } from './BaseModal';

const SuccessModal = ({ isOpen, onClose, onNavigate, data }) => {
  const [showPasswords, setShowPasswords] = React.useState({});

  if (!isOpen || !data) return null;

  const togglePassword = (key) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      if (window.showToast) {
        window.showToast('success', 'Copied!', 'Text copied to clipboard', 2000);
      }
    }
  };

  const getServiceIcon = (serviceName) => {
    const iconClass = "w-5 h-5";
    if (serviceName.includes('Linux User')) return <ServerIcon className={iconClass} />;
    if (serviceName.includes('Apache') || serviceName.includes('VirtualHost')) return <GlobeAltIcon className={iconClass} />;
    if (serviceName.includes('DNS')) return <GlobeAltIcon className={iconClass} />;
    if (serviceName.includes('Email') || serviceName.includes('Maildir')) return <EnvelopeIcon className={iconClass} />;
    if (serviceName.includes('MySQL') || serviceName.includes('Database')) return <CircleStackIcon className={iconClass} />;
    if (serviceName.includes('FTP') || serviceName.includes('SFTP')) return <FolderIcon className={iconClass} />;
    if (serviceName.includes('SSL')) return <LockClosedIcon className={iconClass} />;
    return <CheckCircleIcon className={iconClass} />;
  };

  const InfoCard = ({ icon, title, children }) => (
    <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <div className="space-y-2 text-sm">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value, isPassword = false, copyable = false }) => {
    const passwordKey = `${label}-${value}`;
    const showPassword = showPasswords[passwordKey];

    return (
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-400">{label}:</span>
        <div className="flex items-center gap-2">
          {isPassword && !showPassword ? (
            <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
              ••••••••
            </code>
          ) : (
            <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
              {value}
            </code>
          )}
          {isPassword && (
            <button
              onClick={() => togglePassword(passwordKey)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          )}
          {copyable && (
            <button
              onClick={() => copyToClipboard(value)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ClipboardIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleViewSite = () => {
    if (data && data.domain) {
      const protocol = data.ssl_certificate_id ? 'https' : 'http';
      window.open(`${protocol}://${data.domain}`, '_blank');
    }
  };

  const footer = (
    <div className="flex justify-between items-center">
      {data && data.domain ? (
        <ModalButton variant="secondary" onClick={handleViewSite}>
          <GlobeAltIcon className="w-4 h-4 mr-2" />
          View Website
        </ModalButton>
      ) : (
        <div />
      )}
      <div className="flex gap-3">
        <ModalButton variant="ghost" onClick={onClose}>
          Close
        </ModalButton>
        <ModalButton variant="success" onClick={onNavigate}>
          Go to Virtual Hosts
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </ModalButton>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={data.title || 'Virtual Host Created Successfully!'}
      titleIcon={<CheckCircleIcon className="w-6 h-6 text-green-500" />}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      <ModalSection>
        {/* Success Message */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Your virtual host has been created successfully. Here's everything you need to get started.
          </p>
        </div>

        {/* Services Created */}
        {data.services_created && data.services_created.length > 0 && (
          <div className="mb-6">
            <ModalSectionTitle>Services Activated</ModalSectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.services_created.map((service, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <div className="text-blue-600 dark:text-blue-400">
                    {getServiceIcon(service)}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{service}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Access Information */}
        <ModalSectionTitle>Access Credentials</ModalSectionTitle>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Server Access */}
          <InfoCard icon={<ServerIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />} title="Server Access">
            <InfoRow label="Domain" value={data.domain} copyable />
            <InfoRow label="Username" value={data.linux_username} copyable />
            <InfoRow label="Password" value={data.linux_password} isPassword copyable />
            {data.document_root && (
              <InfoRow label="Document Root" value={data.document_root} copyable />
            )}
          </InfoCard>

          {/* Email Access */}
          {data.default_email && (
            <InfoCard icon={<EnvelopeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />} title="Email Account">
              <InfoRow label="Email" value={data.default_email} copyable />
              <InfoRow label="Password" value={data.email_password} isPassword copyable />
            </InfoCard>
          )}

          {/* Database Access */}
          {data.database_name && (
            <InfoCard icon={<CircleStackIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />} title="MySQL Database">
              <InfoRow label="Database" value={data.database_name} copyable />
              <InfoRow label="Username" value={data.database_user} copyable />
              <InfoRow label="Password" value={data.database_password} isPassword copyable />
              <InfoRow label="Host" value="localhost" copyable />
            </InfoCard>
          )}

          {/* FTP Access */}
          {data.ftp_username && (
            <InfoCard icon={<FolderIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />} title="FTP/SFTP Access">
              <InfoRow label="Username" value={data.ftp_username} copyable />
              <InfoRow label="Password" value={data.ftp_password} isPassword copyable />
              <InfoRow label="Port" value="22 (SFTP) / 21 (FTP)" />
            </InfoCard>
          )}
        </div>

        {/* SSL Certificate Info */}
        {data.ssl_certificate_id && (
          <div className="mb-6">
            <ModalInfoBox variant="success">
              <div className="flex items-center gap-2">
                <LockClosedIcon className="w-5 h-5" />
                <span className="font-medium">SSL Certificate Active</span>
              </div>
              <p className="text-sm mt-1">
                Your website is secured with HTTPS. 
                {data.ssl_valid_until && ` Certificate valid until ${new Date(data.ssl_valid_until).toLocaleDateString()}.`}
              </p>
            </ModalInfoBox>
          </div>
        )}

        {/* Warnings */}
        {data.errors && data.errors.length > 0 && (
          <ModalInfoBox variant="warning" className="mb-6">
            <p className="font-medium mb-2">⚠️ Some services had issues:</p>
            <ul className="text-sm space-y-1">
              {data.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </ModalInfoBox>
        )}

        {/* Next Steps */}
        <ModalInfoBox variant="info">
          <p className="font-medium mb-2">🚀 Next Steps:</p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Upload your website files via FTP/SFTP</li>
            <li>Configure your domain's DNS records to point to this server</li>
            {!data.ssl_certificate_id && <li>Consider enabling SSL for security</li>}
            <li>Test your website and email functionality</li>
          </ol>
        </ModalInfoBox>
      </ModalSection>
    </BaseModal>
  );
};

export default SuccessModal; 