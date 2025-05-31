export const mockDNSZones = [
  {
    id: 1,
    domain_name: 'example.com',
    serial: '2024031001',
    refresh: 3600,
    retry: 1800,
    expire: 604800,
    minimum: 86400,
    status: 'active',
    records: [
      {
        id: 1,
        zone_id: 1,
        name: '@',
        record_type: 'A',
        content: '192.168.1.1',
        ttl: 3600,
        priority: null,
        status: 'active'
      },
      {
        id: 2,
        zone_id: 1,
        name: 'www',
        record_type: 'CNAME',
        content: '@',
        ttl: 3600,
        priority: null,
        status: 'active'
      },
      {
        id: 3,
        zone_id: 1,
        name: '@',
        record_type: 'MX',
        content: 'mail.example.com',
        ttl: 3600,
        priority: 10,
        status: 'active'
      },
      {
        id: 4,
        zone_id: 1,
        name: '@',
        record_type: 'TXT',
        content: 'v=spf1 ip4:192.168.1.1 ~all',
        ttl: 3600,
        priority: null,
        status: 'active'
      },
      {
        id: 5,
        zone_id: 1,
        name: '@',
        record_type: 'NS',
        content: 'ns1.example.com',
        ttl: 3600,
        priority: null,
        status: 'active'
      },
      {
        id: 6,
        zone_id: 1,
        name: '@',
        record_type: 'AAAA',
        content: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        ttl: 3600,
        priority: null,
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
        id: 7,
        zone_id: 2,
        name: '@',
        record_type: 'A',
        content: '192.168.1.2',
        ttl: 3600,
        priority: null,
        status: 'active'
      },
      {
        id: 8,
        zone_id: 2,
        name: 'mail',
        record_type: 'A',
        content: '192.168.1.3',
        ttl: 3600,
        priority: null,
        status: 'active'
      },
      {
        id: 9,
        zone_id: 2,
        name: '@',
        record_type: 'MX',
        content: 'mail.test.com',
        ttl: 3600,
        priority: 10,
        status: 'active'
      },
      {
        id: 10,
        zone_id: 2,
        name: '_dmarc',
        record_type: 'TXT',
        content: 'v=DMARC1; p=reject; rua=mailto:dmarc@test.com',
        ttl: 3600,
        priority: null,
        status: 'active'
      }
    ]
  },
  {
    id: 3,
    domain_name: 'blog.com',
    serial: '2024031503',
    refresh: 3600,
    retry: 1800,
    expire: 604800,
    minimum: 86400,
    status: 'active',
    records: []
  }
];

export const mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'administrator',
  firstName: 'System',
  lastName: 'Administrator',
  status: 'active',
  permissions: {
    dns: ['view', 'create', 'edit', 'delete'],
    virtualHosts: ['view', 'create', 'edit', 'delete'],
    email: ['view', 'create', 'edit', 'delete'],
    databases: ['view', 'create', 'edit', 'delete'],
    ssl: ['view', 'create', 'edit', 'delete'],
    ftp: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete']
  }
};

export const mockUsers = [mockUser];
export const mockVirtualHosts = [];
export const mockEmailAccounts = [];
export const mockDatabases = [];
export const mockSSLCertificates = [];
export const mockFTPAccounts = []; 