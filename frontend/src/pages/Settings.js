import React from 'react';
import {
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  SwatchIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import Card from '../components/ui/Card';

const Settings = () => {
  const categories = [
    {
      name: 'Profile Settings',
      icon: UserIcon,
      description: 'Update your personal information and preferences',
      items: [
        { name: 'Personal Information', description: 'Update your name, email, and profile picture' },
        { name: 'Password', description: 'Change your password and security settings' },
        { name: 'Two-Factor Authentication', description: 'Enable or disable 2FA for your account' },
      ],
    },
    {
      name: 'Notifications',
      icon: BellIcon,
      description: 'Configure how you receive alerts and notifications',
      items: [
        { name: 'Email Notifications', description: 'Choose which emails you want to receive' },
        { name: 'System Alerts', description: 'Configure system-level notification preferences' },
        { name: 'Maintenance Updates', description: 'Get notified about system maintenance' },
      ],
    },
    {
      name: 'Security',
      icon: ShieldCheckIcon,
      description: 'Manage your security settings and access controls',
      items: [
        { name: 'Login History', description: 'View your recent login activity' },
        { name: 'API Keys', description: 'Manage your API keys and access tokens' },
        { name: 'IP Whitelist', description: 'Control which IPs can access your account' },
      ],
    },
    {
      name: 'Domain Settings',
      icon: GlobeAltIcon,
      description: 'Configure domain-related settings and DNS',
      items: [
        { name: 'Domain Management', description: 'Manage your domain names and DNS records' },
        { name: 'SSL Certificates', description: 'Configure SSL/TLS certificates' },
        { name: 'Redirects', description: 'Set up domain redirects and forwarding' },
      ],
    },
    {
      name: 'Appearance',
      icon: SwatchIcon,
      description: 'Customize the look and feel of your control panel',
      items: [
        { name: 'Theme', description: 'Choose between light, dark, or system theme' },
        { name: 'Layout', description: 'Customize the dashboard layout' },
        { name: 'Sidebar', description: 'Configure sidebar visibility and items' },
      ],
    },
    {
      name: 'Language & Region',
      icon: LanguageIcon,
      description: 'Set your preferred language and regional settings',
      items: [
        { name: 'Language', description: 'Choose your preferred language' },
        { name: 'Time Zone', description: 'Set your local time zone' },
        { name: 'Date Format', description: 'Configure how dates are displayed' },
      ],
    },
  ];

  return (
    <PageLayout
      title="Settings"
      description="Manage your system preferences and configurations"
    >
      <div className="grid grid-cols-1 gap-8">
        {categories.map((category) => (
          <Card key={category.name}>
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center">
                <category.icon className="w-5 h-5 text-[var(--accent-color)] mr-3" />
                <h2 className="text-lg font-medium text-[var(--primary-text)]">{category.name}</h2>
              </div>
              <p className="mt-1 text-sm text-[var(--secondary-text)]">{category.description}</p>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {category.items.map((item) => (
                <div
                  key={item.name}
                  className="p-6 flex items-center justify-between hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                >
                  <div>
                    <h3 className="text-base font-medium text-[var(--primary-text)]">{item.name}</h3>
                    <p className="mt-1 text-sm text-[var(--secondary-text)]">{item.description}</p>
                  </div>
                  <svg
                    className="h-5 w-5 text-[var(--tertiary-text)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
};

export default Settings; 