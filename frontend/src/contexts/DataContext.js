import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // State
  const [dnsZones, setDNSZones] = useState([]);
  const [virtualHosts, setVirtualHosts] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [sslCertificates, setSSLCertificates] = useState([]);
  
  const [users, setUsers] = useState([]);

  // DNS Zones Functions
  const addDNSZone = (zoneData) => {
    const newZone = {
      id: Math.max(0, ...dnsZones.map(z => z.id)) + 1,
      ...zoneData,
      serial: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 10),
      refresh: 3600,
      retry: 1800,
      expire: 604800,
      minimum: 86400,
      status: 'active',
      records: []
    };
    setDNSZones([...dnsZones, newZone]);
    return newZone;
  };

  const updateDNSZone = (zoneId, zoneData) => {
    setDNSZones(dnsZones.map(zone => 
      zone.id === zoneId ? { ...zone, ...zoneData } : zone
    ));
  };

  const deleteDNSZone = (zoneId) => {
    setDNSZones(dnsZones.filter(zone => zone.id !== zoneId));
  };

  const addDNSRecord = (zoneId, recordData) => {
    const newRecord = {
      id: Math.max(0, ...dnsZones.flatMap(z => z.records.map(r => r.id))) + 1,
      zone_id: zoneId,
      ...recordData,
      status: 'active'
    };

    setDNSZones(dnsZones.map(zone => {
      if (zone.id === zoneId) {
        return {
          ...zone,
          records: [...zone.records, newRecord]
        };
      }
      return zone;
    }));

    return newRecord;
  };

  const updateDNSRecord = (zoneId, recordId, recordData) => {
    setDNSZones(dnsZones.map(zone => {
      if (zone.id === zoneId) {
        return {
          ...zone,
          records: zone.records.map(record =>
            record.id === recordId ? { ...record, ...recordData } : record
          )
        };
      }
      return zone;
    }));
  };

  const deleteDNSRecord = (zoneId, recordId) => {
    setDNSZones(dnsZones.map(zone => {
      if (zone.id === zoneId) {
        return {
          ...zone,
          records: zone.records.filter(record => record.id !== recordId)
        };
      }
      return zone;
    }));
  };

  // Virtual Hosts Functions
  const addVirtualHost = (hostData) => {
    const newHost = {
      id: Math.max(0, ...virtualHosts.map(h => h.id)) + 1,
      ...hostData,
      status: 'active'
    };
    setVirtualHosts([...virtualHosts, newHost]);
    return newHost;
  };

  const updateVirtualHost = (hostId, hostData) => {
    setVirtualHosts(virtualHosts.map(host =>
      host.id === hostId ? { ...host, ...hostData } : host
    ));
  };

  const deleteVirtualHost = (hostId) => {
    setVirtualHosts(virtualHosts.filter(host => host.id !== hostId));
  };

  // Email Accounts Functions
  const addEmailAccount = (domainId, accountData) => {
    const newAccount = {
      id: Math.max(0, ...emailAccounts.flatMap(d => d.accounts.map(a => a.id))) + 1,
      ...accountData,
      status: 'active'
    };

    setEmailAccounts(emailAccounts.map(domain => {
      if (domain.id === domainId) {
        return {
          ...domain,
          accounts: [...domain.accounts, newAccount]
        };
      }
      return domain;
    }));

    return newAccount;
  };

  const updateEmailAccount = (domainId, accountId, accountData) => {
    setEmailAccounts(emailAccounts.map(domain => {
      if (domain.id === domainId) {
        return {
          ...domain,
          accounts: domain.accounts.map(account =>
            account.id === accountId ? { ...account, ...accountData } : account
          )
        };
      }
      return domain;
    }));
  };

  const deleteEmailAccount = (domainId, accountId) => {
    setEmailAccounts(emailAccounts.map(domain => {
      if (domain.id === domainId) {
        return {
          ...domain,
          accounts: domain.accounts.filter(account => account.id !== accountId)
        };
      }
      return domain;
    }));
  };

  // Database Functions
  const addDatabase = (dbData) => {
    const newDb = {
      id: Math.max(0, ...databases.map(db => db.id)) + 1,
      ...dbData,
      status: 'active',
      users: []
    };
    setDatabases([...databases, newDb]);
    return newDb;
  };

  const updateDatabase = (dbId, dbData) => {
    setDatabases(databases.map(db =>
      db.id === dbId ? { ...db, ...dbData } : db
    ));
  };

  const deleteDatabase = (dbId) => {
    setDatabases(databases.filter(db => db.id !== dbId));
  };

  // SSL Certificates Functions
  const addSSLCertificate = (certData) => {
    const newCert = {
      id: Math.max(0, ...sslCertificates.map(cert => cert.id)) + 1,
      ...certData,
      status: 'active'
    };
    setSSLCertificates([...sslCertificates, newCert]);
    return newCert;
  };

  const updateSSLCertificate = (certId, certData) => {
    setSSLCertificates(sslCertificates.map(cert =>
      cert.id === certId ? { ...cert, ...certData } : cert
    ));
  };

  const deleteSSLCertificate = (certId) => {
    setSSLCertificates(sslCertificates.filter(cert => cert.id !== certId));
  };



  // Users Functions
  const addUser = (userData) => {
    const newUser = {
      id: Math.max(0, ...users.map(user => user.id)) + 1,
      ...userData,
      status: 'active',
      last_login: null
    };
    setUsers([...users, newUser]);
    return newUser;
  };

  const updateUser = (userId, userData) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, ...userData } : user
    ));
  };

  const deleteUser = (userId) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const value = {
    // Data
    dnsZones,
    virtualHosts,
    emailAccounts,
    databases,
    sslCertificates,

    users,

    // DNS Functions
    addDNSZone,
    updateDNSZone,
    deleteDNSZone,
    addDNSRecord,
    updateDNSRecord,
    deleteDNSRecord,

    // Virtual Hosts Functions
    addVirtualHost,
    updateVirtualHost,
    deleteVirtualHost,

    // Email Functions
    addEmailAccount,
    updateEmailAccount,
    deleteEmailAccount,

    // Database Functions
    addDatabase,
    updateDatabase,
    deleteDatabase,
    setDatabases,

    // SSL Functions
    addSSLCertificate,
    updateSSLCertificate,
    deleteSSLCertificate,



    // User Functions
    addUser,
    updateUser,
    deleteUser,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataProvider; 