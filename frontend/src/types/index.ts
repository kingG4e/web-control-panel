import { ReactNode, ComponentType } from 'react';

// Auth Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// Data Types
export interface VirtualHost {
  id: number;
  domain: string;
  server_name: string;
  document_root: string;
  php_version: string;
  status: string;
  ssl_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  id: number;
  name: string;
  type: string;
  size: number;
  created_at: string;
  updated_at: string;
}

export interface SSLCertificate {
  id: number;
  domain: string;
  issuer: string;
  valid_from: string;
  valid_to: string;
  status: string;
}

// Component Props Types
export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: ComponentType<any>;
  onClick?: () => void;
}

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export interface TableProps {
  children: ReactNode;
  className?: string;
}

// Manager Types
export interface Column {
  key: string;
  label: string;
  render?: (value: any, item: any) => ReactNode;
}

export interface Action {
  icon: ComponentType<any>;
  label: string;
  onClick: (item: any) => void;
}

export interface BaseManagerProps {
  title: string;
  entity: string;
  columns: Column[];
  actions: Action[];
  endpoint: string;
  addModalContent?: ReactNode;
  onAdd?: () => void;
  onDelete?: (id: string | number) => void;
} 