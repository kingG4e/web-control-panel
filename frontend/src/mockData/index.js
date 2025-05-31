// Mock user data
export const mockUser = {
  username: 'admin',
  role: 'admin'
};

// Mock Users
export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    last_login: '2024-03-10 15:30:00'
  },
  {
    id: 2,
    username: 'user1',
    email: 'user1@example.com',
    role: 'user',
    status: 'active',
    last_login: '2024-03-09 12:45:00'
  },
  {
    id: 3,
    username: 'user2',
    email: 'user2@example.com',
    role: 'user',
    status: 'inactive',
    last_login: '2024-03-01 09:15:00'
  }
];

// Mock DNS zones data
export const mockDNSZones = [
  {
    id: 1,
    name: 'example.com',
    status: 'active',
    serial: '2024031001',
    refresh: 3600,
    retry: 1800,
    expire: 604800,
    minimum: 86400,
    records: [
      {
        id: 1,
        zone_id: 1,
        name: '@',
        type: 'A',
        content: '192.168.1.1',
        ttl: 3600,
        status: 'active'
      },
      {
        id: 2,
        zone_id: 1,
        name: 'www',
        type: 'CNAME',
        content: '@',
        ttl: 3600,
        status: 'active'
      }
    ]
  },
  {
    id: 2,
    domain_name: 'test.com',
    serial: '2024031502',
    refresh: 3600,
    retry: 1800,
    expire: 604800,
    minimum: 86400,
    status: 'active',
    records: [
      {
        id: 4,
        zone_id: 2,
        name: '@',
        record_type: 'A',
        content: '192.168.1.2',
        ttl: 3600,
        priority: null,
        status: 'active'
      }
    ]
  }
];

// Mock virtual hosts data
export const mockVirtualHosts = [
  {
    id: 1,
    domain: 'example.com',
    root_dir: '/var/www/example.com',
    php_version: '8.2',
    status: 'active'
  },
  {
    id: 2,
    domain: 'test.com',
    document_root: '/var/www/test.com',
    server_admin: 'admin@test.com',
    php_version: '8.1',
    status: 'active'
  }
];

// Mock email accounts data
export const mockEmailAccounts = [
  {
    id: 1,
    domain: 'example.com',
    accounts: [
      {
        id: 1,
        email: 'info@example.com',
        quota: 1000,
        used: 250,
        forwards_to: null,
        auto_reply: false
      }
    ]
  }
];

// Mock database data
export const mockDatabases = [
  {
    id: 1,
    name: 'example_db',
    type: 'mysql',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    users: [
      {
        id: 1,
        username: 'example_user',
        host: 'localhost'
      }
    ]
  }
];

// Mock SSL certificates data
export const mockSSLCertificates = [
  {
    id: 1,
    domain: 'example.com',
    type: 'lets_encrypt',
    status: 'valid',
    expiry: '2024-06-10',
    auto_renew: true
  },
  {
    id: 2,
    domain: 'test.com',
    type: 'custom',
    status: 'expiring_soon',
    expiry: '2024-03-25',
    auto_renew: false
  },
  {
    id: 3,
    domain: 'demo.com',
    type: 'lets_encrypt',
    status: 'expired',
    expiry: '2024-03-01',
    auto_renew: true
  }
];

// Mock FTP accounts data
export const mockFTPAccounts = [
  {
    id: 1,
    username: 'ftp_user',
    directory: '/var/www/example.com',
    status: 'active'
  }
]; 