import React, { useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  CircleStackIcon,
  FolderIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import BaseModal, { ModalSection, ModalSectionTitle, ModalInfoBox } from './BaseModal';

const CreateVirtualHostProgress = ({ isOpen, steps, currentStep, error, isComplete }) => {
  const [animatedStep, setAnimatedStep] = useState(-1);

  useEffect(() => {
    if (currentStep !== animatedStep) {
      const timer = setTimeout(() => {
        setAnimatedStep(currentStep);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, animatedStep]);

  const getStepIcon = (stepIndex, stepTitle) => {
    const icons = {
      'Linux user': <ServerIcon className="w-5 h-5" />,
      'Nginx': <GlobeAltIcon className="w-5 h-5" />,
      'DNS': <GlobeAltIcon className="w-5 h-5" />,
      'email': <EnvelopeIcon className="w-5 h-5" />,
      'maildir': <EnvelopeIcon className="w-5 h-5" />,
      'database': <CircleStackIcon className="w-5 h-5" />,
      'MySQL': <CircleStackIcon className="w-5 h-5" />,
  
      'SSL': <LockClosedIcon className="w-5 h-5" />,
      'Save': <ServerIcon className="w-5 h-5" />
    };

    const iconKey = Object.keys(icons).find(key => 
      stepTitle.toLowerCase().includes(key.toLowerCase())
    );
    
    return iconKey ? icons[iconKey] : <ServerIcon className="w-5 h-5" />;
  };

  const getStepStatus = (stepIndex) => {
    if (error && stepIndex === currentStep) {
      return 'error';
    } else if (stepIndex < currentStep) {
      return 'completed';
    } else if (stepIndex === currentStep && !error) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  const getStatusIcon = (status, stepIndex, stepTitle) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'active':
        return (
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <ClockIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'active':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-800 dark:text-green-300';
      case 'error':
        return 'text-red-800 dark:text-red-300';
      case 'active':
        return 'text-blue-800 dark:text-blue-300';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTitleIcon = () => {
    if (error) {
      return <XCircleIcon className="w-6 h-6 text-red-500" />;
    } else if (isComplete) {
      return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
    } else {
      return <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getTitle = () => {
    if (error) {
      return 'Virtual Host Creation Failed';
    } else if (isComplete) {
      return 'Virtual Host Created Successfully!';
    } else {
      return 'Creating Virtual Host...';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={null} // Disable close during creation
      title={getTitle()}
      titleIcon={getTitleIcon()}
      disableOverlayClick={true}
      disableEscapeKey={true}
      maxWidth="max-w-2xl"
    >
      <ModalSection>
        {/* Progress Info */}
        {!error && !isComplete && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Processing step {currentStep + 1} of {steps.length}
            </p>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2 text-gray-600 dark:text-gray-400">
                <span>Progress</span>
                <span>{Math.round(((currentStep + (isComplete ? 1 : 0)) / steps.length) * 100)}%</span>
              </div>
              <div className="w-full rounded-full h-2 bg-gray-200 dark:bg-gray-700">
                <div 
                  className="h-2 rounded-full transition-all duration-500 ease-out bg-blue-600"
                  style={{ 
                    width: `${((currentStep + (isComplete ? 1 : 0)) / steps.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        <ModalSectionTitle>Processing Steps</ModalSectionTitle>
        <div className="space-y-3 mb-6">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <div 
                key={index}
                className={`flex items-start p-4 rounded-lg border transition-all duration-300 ${getStatusColor(status)}`}
              >
                <div className="flex items-center mr-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 text-white"
                       style={{
                         backgroundColor: status === 'completed' ? '#10b981' :
                                        status === 'error' ? '#ef4444' :
                                        status === 'active' ? '#3b82f6' : '#9ca3af'
                       }}>
                    {index + 1}
                  </div>
                  {getStatusIcon(status, index, step.title || step)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${getStatusTextColor(status)}`}>
                      {step.title || step}
                    </h4>
                    <div className="text-xs text-gray-500">
                      {status === 'completed' && '✓ Completed'}
                      {status === 'error' && '✗ Failed'}
                      {status === 'active' && 'Processing...'}
                      {status === 'pending' && 'Pending'}
                    </div>
                  </div>
                  
                  {step.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                  )}
                  
                  {/* Show error details if this step failed */}
                  {status === 'error' && error && (
                    <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">Error:</p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Summary */}
        {error && (
          <ModalInfoBox variant="error">
            <div className="flex items-start">
              <XCircleIcon className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-2">Virtual Host Creation Failed</h4>
                <p className="text-sm mb-2">{error}</p>
                <p className="text-sm opacity-80">
                  The system will attempt to clean up the resources created if this continues.
                </p>
              </div>
            </div>
          </ModalInfoBox>
        )}

        {/* Success Summary */}
        {isComplete && !error && (
          <ModalInfoBox variant="success">
            <div className="flex items-start">
              <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-2">Virtual Host Created Successfully!</h4>
                <p className="text-sm">
                  Your Virtual Host has been created and is ready to use immediately.
                </p>
              </div>
            </div>
          </ModalInfoBox>
        )}
      </ModalSection>
    </BaseModal>
  );
};

export default CreateVirtualHostProgress; 