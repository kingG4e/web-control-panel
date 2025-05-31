import React from 'react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  KeyIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const FTPManagement = () => {
  const { ftpAccounts } = useData();

  return (
    <PageLayout
      title="FTP Management"
      description="Create and manage FTP accounts"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            variant="primary"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => {}}
          >
            Create FTP Account
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ftpAccounts.map((account) => (
            <Card key={account.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <FolderIcon className="w-5 h-5 text-[var(--accent-color)]" />
                    <h3 className="text-lg font-medium text-[var(--primary-text)]">
                      {account.name}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-[var(--secondary-text)]">
                    {account.directory}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {}}
                    className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {}}
                    className="text-[var(--danger-color)] hover:text-[var(--danger-color)]/80 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--secondary-text)]">Permissions:</span>
                  <span className="text-[var(--primary-text)] font-medium">
                    {account.permissions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--secondary-text)]">Quota:</span>
                  <span className="text-[var(--primary-text)] font-medium">
                    {account.quota} MB
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--secondary-text)]">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    account.active
                      ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                      : 'bg-[var(--border-color)] text-[var(--secondary-text)]'
                  }`}>
                    {account.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<KeyIcon className="w-4 h-4" />}
                  className="w-full"
                  onClick={() => {}}
                >
                  Reset Password
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default FTPManagement; 