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

  if (!isOpen) return null;

  const getStepIcon = (stepIndex, stepTitle) => {
    const icons = {
      'Linux user': <ServerIcon className="w-5 h-5" />,
      'Apache': <GlobeAltIcon className="w-5 h-5" />,
      'DNS': <GlobeAltIcon className="w-5 h-5" />,
      'email': <EnvelopeIcon className="w-5 h-5" />,
      'maildir': <EnvelopeIcon className="w-5 h-5" />,
      'database': <CircleStackIcon className="w-5 h-5" />,
      'MySQL': <CircleStackIcon className="w-5 h-5" />,
      'FTP': <FolderIcon className="w-5 h-5" />,
      'SSL': <LockClosedIcon className="w-5 h-5" />,
      'บันทึก': <ServerIcon className="w-5 h-5" />
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
           style={{ backgroundColor: 'var(--primary-bg)', borderColor: 'var(--border-color)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" 
             style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center">
            {error ? (
              <XCircleIcon className="w-8 h-8 text-red-500 mr-3" />
            ) : isComplete ? (
              <CheckCircleIcon className="w-8 h-8 text-green-500 mr-3" />
            ) : (
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            )}
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--primary-text)' }}>
                {error ? 'Virtual Host Creation Failed' :
                 isComplete ? 'Virtual Host Created Successfully!' :
                 'Creating Virtual Host...'}
              </h2>
              {!error && !isComplete && (
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                  Processing step {currentStep + 1} of {steps.length}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--secondary-text)' }}>
              <span>Progress</span>
              <span>{Math.round(((currentStep + (isComplete ? 1 : 0)) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border-color)' }}>
              <div 
                className="h-2 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${((currentStep + (isComplete ? 1 : 0)) / steps.length) * 100}%`,
                  backgroundColor: 'var(--accent-color)'
                }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              return (
                <div 
                  key={index}
                  className={`flex items-start p-4 rounded-lg border transition-all duration-300 ${getStatusColor(status)}`}
                >
                  <div className="flex items-center mr-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3" 
                         style={{
                           backgroundColor: status === 'completed' ? 'var(--success-color, #10b981)' :
                                          status === 'error' ? 'var(--error-color, #ef4444)' :
                                          status === 'active' ? 'var(--accent-color, #3b82f6)' : 'var(--secondary-text, #9ca3af)',
                           color: 'white'
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
                      <p className="text-sm text-gray-600 mt-1">
                        {step.description}
                      </p>
                    )}
                    
                    {/* Show error details if this step failed */}
                    {status === 'error' && error && (
                      <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Error:</p>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
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
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <XCircleIcon className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800 mb-2">Virtual Host Creation Failed</h4>
                  <p className="text-sm text-red-700">{error}</p>
                  <p className="text-sm text-red-600 mt-2">
                    The system will attempt to clean up the resources created if this continues.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Summary */}
          {isComplete && !error && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Virtual Host Created Successfully!</h4>
                  <p className="text-sm text-green-700">
                    Your Virtual Host has been created and is ready to use immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default CreateVirtualHostProgress; 