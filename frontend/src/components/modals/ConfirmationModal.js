import React from 'react';
import {
  ExclamationTriangleIcon,
  ServerIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  CircleStackIcon,
  FolderIcon,
  LockClosedIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import BaseModal, { ModalSection, ModalSectionTitle, ModalInfoBox, ModalButton } from './BaseModal';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, formData, isLoading }) => {
  // Ensure formData exists with default values
  const safeFormData = formData || {
    domain: '',
    php_version: '',
    server_admin: '',
    create_ssl: false
  };

  const generatedUsername = safeFormData.domain ? 
    safeFormData.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 
    'example';

  const steps = [
    {
      icon: <ServerIcon className="w-5 h-5" />,
      title: "Create Linux user",
      description: `User: ${generatedUsername}`,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: <GlobeAltIcon className="w-5 h-5" />,
      title: "Configure Nginx & DNS", 
      description: safeFormData.domain || 'example.com',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: <EnvelopeIcon className="w-5 h-5" />,
      title: "Setup Email",
      description: `admin@${safeFormData.domain || 'example.com'}`,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: <CircleStackIcon className="w-5 h-5" />,
      title: "Create Database",
      description: "MySQL database",
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: <FolderIcon className="w-5 h-5" />,

      color: 'text-cyan-600 dark:text-cyan-400'
    }
  ];

  if (safeFormData.create_ssl) {
    steps.push({
      icon: <LockClosedIcon className="w-5 h-5" />,
      title: "Request SSL Certificate",
      description: "Let's Encrypt SSL",
      color: 'text-emerald-600 dark:text-emerald-400'
    });
  }

  const footer = (
    <div className="flex justify-end gap-3">
      <ModalButton 
        variant="ghost" 
        onClick={onClose}
        disabled={isLoading}
      >
        Cancel
      </ModalButton>
      <ModalButton 
        variant="primary" 
        onClick={onConfirm}
        disabled={isLoading}
        className="min-w-[150px]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Creating...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <CheckIcon className="w-4 h-4 mr-2" />
            Confirm & Create
          </div>
        )}
      </ModalButton>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Virtual Host Creation"
      titleIcon={<ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />}
      footer={footer}
      disableOverlayClick={isLoading}
      disableEscapeKey={isLoading}
    >
      <ModalSection>
        {/* Summary Card */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Configuration Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Domain:</span>
              <p className="font-medium text-gray-900 dark:text-white">{safeFormData.domain || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">PHP Version:</span>
              <p className="font-medium text-gray-900 dark:text-white">{safeFormData.php_version || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Server Admin:</span>
              <p className="font-medium text-gray-900 dark:text-white">{safeFormData.server_admin || `admin@${safeFormData.domain}` || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">SSL Certificate:</span>
              <p className="font-medium text-gray-900 dark:text-white">{safeFormData.create_ssl ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <ModalSectionTitle icon="🚀">What will happen</ModalSectionTitle>
        <div className="space-y-2 mb-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
              <div className={`${step.color} mr-3`}>
                {step.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{step.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Info Boxes */}
        <div className="space-y-3">
          <ModalInfoBox variant="warning">
            <p className="text-sm font-medium mb-1">⏱️ Processing Time</p>
            <p className="text-sm">This process may take 2-3 minutes to complete. Please don't close this window.</p>
          </ModalInfoBox>

          {!safeFormData.create_ssl && (
            <ModalInfoBox variant="info">
              <p className="text-sm">💡 You can add an SSL certificate later from the SSL Management page.</p>
            </ModalInfoBox>
          )}
        </div>
      </ModalSection>
    </BaseModal>
  );
};

export default ConfirmationModal; 