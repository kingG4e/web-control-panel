import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { dns, virtualHosts } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ServerIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  CommandLineIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

const DNSManagement = () => {
  const [searchParams] = useSearchParams();
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [dnsZone, setDnsZone] = useState(null);
  const [dnsRecords, setDnsRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  
  // Modals and forms
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showZoneFile, setShowZoneFile] = useState(false);
  const [zoneFileContent, setZoneFileContent] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Form data
  const [recordFormData, setRecordFormData] = useState({
    name: '',
    record_type: 'A',
    content: '',
    ttl: 3600,
    priority: null,
    // SOA helpers
    soa_mname: '',
    soa_rname: '',
    soa_serial: '',
    soa_refresh: 3600,
    soa_retry: 1800,
    soa_expire: 1209600,
    soa_minimum: 300
  });

  const recordTypes = [
    { value: 'A', label: 'A - IPv4 Address', description: 'Maps domain to IPv4 address' },
    { value: 'AAAA', label: 'AAAA - IPv6 Address', description: 'Maps domain to IPv6 address' },
    { value: 'CNAME', label: 'CNAME - Canonical Name', description: 'Maps domain to another domain' },
    { value: 'MX', label: 'MX - Mail Exchange', description: 'Mail server for domain' },
    { value: 'NS', label: 'NS - Name Server', description: 'Authoritative name server' },
    { value: 'TXT', label: 'TXT - Text Record', description: 'Text information' },
    { value: 'SPF', label: 'SPF - Sender Policy Framework', description: 'Email authentication' },
    { value: 'DKIM', label: 'DKIM - DomainKeys Identified Mail', description: 'Email signing' },
    { value: 'PTR', label: 'PTR - Pointer Record', description: 'Reverse DNS lookup' },
    { value: 'SRV', label: 'SRV - Service Record', description: 'Service location specification' },
    { value: 'CAA', label: 'CAA - Certificate Authority Authorization', description: 'SSL certificate authority authorization' },
    { value: 'SOA', label: 'SOA - Start of Authority', description: 'Zone authority information' }
  ];

  // Helpers for SOA
  const buildSoaContent = (data) => {
    const m = data.soa_mname || `ns1.${selectedDomain?.domain}.`;
    const r = data.soa_rname || `admin.${selectedDomain?.domain}.`;
    const serial = (data.soa_serial && `${data.soa_serial}`) || dnsZone?.serial || '';
    const refresh = data.soa_refresh || 3600;
    const retry = data.soa_retry || 1800;
    const expire = data.soa_expire || 1209600;
    const minimum = data.soa_minimum || 300;
    return `${m} ${r} ( ${serial} ${refresh} ${retry} ${expire} ${minimum} )`;
  };

  const parseSoaContent = (content) => {
    try {
      const cleaned = (content || '').replace('(', ' ').replace(')', ' ');
      const parts = cleaned.split(/\s+/).filter(Boolean);
      const [mname, rname, serial, refresh, retry, expire, minimum] = parts;
      return {
        soa_mname: mname || '',
        soa_rname: rname || '',
        soa_serial: serial || '',
        soa_refresh: refresh ? parseInt(refresh) : 3600,
        soa_retry: retry ? parseInt(retry) : 1800,
        soa_expire: expire ? parseInt(expire) : 1209600,
        soa_minimum: minimum ? parseInt(minimum) : 300
      };
    } catch (e) {
      return {};
    }
  };

  useEffect(() => {
    fetchDomains();
    
    // Check for domain parameter from URL
    const domainParam = searchParams.get('domain');
    if (domainParam) {
      // Wait for domains to load, then select the domain
      setTimeout(() => {
        const domain = domains.find(d => d.domain === domainParam);
        if (domain) {
          handleDomainSelect(domain);
        }
      }, 1000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedDomain) {
      fetchDnsRecords();
    }
  }, [selectedDomain]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const data = await virtualHosts.getAll();
      setDomains(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch domains');
      console.error('Failed to fetch domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDnsRecords = async () => {
    if (!selectedDomain) return;
    
    try {
      setActionLoading(prev => ({ ...prev, records: true }));
      
      // Try to get existing DNS zone
      const zones = await dns.getZones();
      const existingZone = zones.find(z => z.domain_name === selectedDomain.domain);
      
      if (existingZone) {
        setDnsZone(existingZone);
        const records = await dns.getRecords(existingZone.id);
        setDnsRecords(records || []);
      } else {
        // Create DNS zone if it doesn't exist
        const newZone = await dns.createZone({
          domain_name: selectedDomain.domain,
          nameserver_ip: '127.0.0.1'
        });
        setDnsZone(newZone);
        setDnsRecords([]);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch DNS records');
      console.error('Failed to fetch DNS records:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, records: false }));
    }
  };

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setDnsRecords([]);
    setDnsZone(null);
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!dnsZone) return;

    try {
      setActionLoading(prev => ({ ...prev, form: true }));
      
      const payload = { ...recordFormData };
      if (payload.record_type === 'SOA') {
        payload.name = payload.name || '@';
        payload.content = buildSoaContent(payload);
      }

      if (editingRecord && editingRecord.id) {
        // Update existing record
        await dns.updateRecord(dnsZone.id, editingRecord.id, payload);
      } else {
        // Create new record
        await dns.createRecord(dnsZone.id, payload);
      }
      
      await fetchDnsRecords();
      setShowRecordForm(false);
      setEditingRecord(null);
      resetForm();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save DNS record');
    } finally {
      setActionLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    const base = {
      name: record.name,
      record_type: record.record_type,
      content: record.content,
      ttl: record.ttl,
      priority: record.priority
    };
    if (record.record_type === 'SOA') {
      const parsed = parseSoaContent(record.content);
      setRecordFormData({ ...recordFormData, ...base, ...parsed });
    } else {
      setRecordFormData({ ...recordFormData, ...base });
    }
    setShowRecordForm(true);
  };

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Are you sure you want to delete this ${record.record_type} record?`)) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [record.id]: true }));
      await dns.deleteRecord(dnsZone.id, record.id);
      await fetchDnsRecords();
      setError(null);
    } catch (err) {
      setError('Failed to delete DNS record');
    } finally {
      setActionLoading(prev => ({ ...prev, [record.id]: false }));
    }
  };

  const handleViewZoneFile = async () => {
    if (!dnsZone) return;

    try {
      setActionLoading(prev => ({ ...prev, zonefile: true }));
      const response = await dns.getZoneFile(dnsZone.id);
      setZoneFileContent(response.content);
      setShowZoneFile(true);
    } catch (err) {
      setError('Failed to load zone file');
    } finally {
      setActionLoading(prev => ({ ...prev, zonefile: false }));
    }
  };

  const handleReloadBind = async () => {
    try {
      setActionLoading(prev => ({ ...prev, reload: true }));
      await dns.reloadBind();
      setError(null);
      // Show success message
      setTimeout(() => {
        setActionLoading(prev => ({ ...prev, reload: false }));
      }, 2000);
    } catch (err) {
      setError('Failed to reload BIND');
      setActionLoading(prev => ({ ...prev, reload: false }));
    }
  };

  const handleRebuildDns = async () => {
    if (!window.confirm('This will rebuild all DNS zones. Continue?')) return;

    try {
      setActionLoading(prev => ({ ...prev, rebuild: true }));
      await dns.rebuildDns();
      await fetchDnsRecords();
      setError(null);
    } catch (err) {
      setError('Failed to rebuild DNS');
    } finally {
      setActionLoading(prev => ({ ...prev, rebuild: false }));
    }
  };

  const resetForm = () => {
    setRecordFormData({
      name: '',
      record_type: 'A',
      content: '',
      ttl: 3600,
      priority: null
    });
  };

  const getRecordTypeColor = (type) => {
    const colors = {
      A: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      AAAA: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      CNAME: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      MX: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      NS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      TXT: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      SPF: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      DKIM: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      PTR: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      SRV: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      CAA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      SOA: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  // Filter records
  const filteredRecords = dnsRecords.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || record.record_type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Group records by type
  const groupedRecords = filteredRecords.reduce((groups, record) => {
    const type = record.record_type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(record);
    return groups;
  }, {});

  const actions = (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={fetchDnsRecords}
        disabled={!selectedDomain || actionLoading.records}
        icon={<ArrowPathIcon className="w-4 h-4" />}
      >
        Refresh
      </Button>
      
      {dnsZone && (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewZoneFile}
            disabled={actionLoading.zonefile}
            icon={<EyeIcon className="w-4 h-4" />}
          >
            View Zone File
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReloadBind}
            disabled={actionLoading.reload}
            icon={<CommandLineIcon className="w-4 h-4" />}
          >
            {actionLoading.reload ? 'Reloading...' : 'Reload BIND'}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRebuildDns}
            disabled={actionLoading.rebuild}
            icon={<WrenchScrewdriverIcon className="w-4 h-4" />}
          >
            {actionLoading.rebuild ? 'Rebuilding...' : 'Rebuild DNS'}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingRecord(null);
              resetForm();
              setShowRecordForm(true);
            }}
            icon={<PlusIcon className="w-4 h-4" />}
          >
            Add Record
          </Button>
        </>
      )}
    </div>
  );

  return (
    <PageLayout
      title="DNS Management"
      description="Manage DNS records for your domains"
      actions={actions}
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <InformationCircleIcon className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Domain Selection */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-4">
              Select Domain
            </h2>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-[var(--border-color)] rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-8">
                <GlobeAltIcon className="w-12 h-12 text-[var(--secondary-text)] mx-auto mb-4" />
                <p className="text-[var(--secondary-text)] mb-4">No domains found</p>
                <p className="text-sm text-[var(--tertiary-text)]">
                  Create a Virtual Host first to manage DNS records
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {domains.map((domain) => (
                  <button
                    key={domain.id}
                    onClick={() => handleDomainSelect(domain)}
                    className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                      selectedDomain?.id === domain.id
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5'
                        : 'border-[var(--border-color)] hover:border-[var(--accent-color)]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--primary-text)]">
                          {domain.domain}
                        </h3>
                        <p className="text-sm text-[var(--secondary-text)]">
                          {domain.linux_username}
                        </p>
                      </div>
                      <GlobeAltIcon className="w-5 h-5 text-[var(--secondary-text)]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* DNS Records Management */}
        {selectedDomain && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--primary-text)]">
                    DNS Records for {selectedDomain.domain}
                  </h2>
                  <p className="text-sm text-[var(--secondary-text)]">
                    {dnsRecords.length} record{dnsRecords.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)]" />
                    <input
                      type="text"
                      placeholder="Search records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="w-5 h-5 text-[var(--secondary-text)]" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    {recordTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Records Table */}
              {actionLoading.records ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)] mx-auto mb-4"></div>
                  <p className="text-[var(--secondary-text)]">Loading DNS records...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-8">
                  <ServerIcon className="w-12 h-12 text-[var(--secondary-text)] mx-auto mb-4" />
                  <p className="text-[var(--secondary-text)] mb-4">
                    {dnsRecords.length === 0 ? 'No DNS records found' : 'No records match your search'}
                  </p>
                  {dnsRecords.length === 0 && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setEditingRecord(null);
                        resetForm();
                        setShowRecordForm(true);
                      }}
                      icon={<PlusIcon className="w-4 h-4" />}
                    >
                      Add First Record
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                          Content
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                          TTL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-[var(--primary-text)]">
                              {record.name || '@'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRecordTypeColor(record.record_type)}`}>
                              {record.record_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-[var(--primary-text)] max-w-xs truncate">
                              {record.content}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--secondary-text)]">
                            {record.ttl}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--secondary-text)]">
                            {record.priority || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors"
                                title="Edit Record"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record)}
                                disabled={actionLoading[record.id]}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                                title="Delete Record"
                              >
                                {actionLoading[record.id] ? (
                                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                                ) : (
                                  <TrashIcon className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Record Form Modal */}
        {showRecordForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md my-8">
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
                {editingRecord ? 'Edit DNS Record' : 'Add DNS Record'}
              </h2>
              
              <form onSubmit={handleCreateRecord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={recordFormData.name}
                    onChange={(e) => setRecordFormData({ ...recordFormData, name: e.target.value })}
                    placeholder="@ or subdomain"
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-[var(--tertiary-text)] mt-1">
                    Use @ for root domain or enter subdomain name
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Record Type
                  </label>
                  <select
                    value={recordFormData.record_type}
                    onChange={(e) => setRecordFormData({ ...recordFormData, record_type: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                  >
                    {recordTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--tertiary-text)] mt-1">
                    {recordTypes.find(t => t.value === recordFormData.record_type)?.description}
                  </p>
                </div>

                {recordFormData.record_type !== 'SOA' ? (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      Content
                    </label>
                    <input
                      type="text"
                      value={recordFormData.content}
                      onChange={(e) => setRecordFormData({ ...recordFormData, content: e.target.value })}
                      placeholder={
                        recordFormData.record_type === 'A' ? '192.168.1.1' :
                        recordFormData.record_type === 'AAAA' ? '2001:db8::1' :
                        recordFormData.record_type === 'CNAME' ? 'example.com' :
                        recordFormData.record_type === 'MX' ? 'mail.example.com' :
                        recordFormData.record_type === 'NS' ? 'ns1.example.com' :
                        recordFormData.record_type === 'TXT' ? 'v=spf1 include:_spf.google.com ~all' :
                        recordFormData.record_type === 'SPF' ? 'v=spf1 include:_spf.google.com ~all' :
                        recordFormData.record_type === 'DKIM' ? 'v=DKIM1; k=rsa; p=...' :
                        recordFormData.record_type === 'PTR' ? 'example.com' :
                        recordFormData.record_type === 'SRV' ? '10 5 80 target.example.com' :
                        recordFormData.record_type === 'CAA' ? '0 issue "letsencrypt.org"' :
                        'Record content'
                      }
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Primary NS (mname)</label>
                        <input
                          type="text"
                          value={recordFormData.soa_mname}
                          onChange={(e) => setRecordFormData({ ...recordFormData, soa_mname: e.target.value })}
                          placeholder={`ns1.${selectedDomain?.domain}.`}
                          className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Admin Email (rname)</label>
                        <input
                          type="text"
                          value={recordFormData.soa_rname}
                          onChange={(e) => setRecordFormData({ ...recordFormData, soa_rname: e.target.value })}
                          placeholder={`admin.${selectedDomain?.domain}.`}
                          className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Serial</label>
                        <input type="text" value={recordFormData.soa_serial} onChange={(e)=>setRecordFormData({ ...recordFormData, soa_serial: e.target.value })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Refresh</label>
                        <input type="number" value={recordFormData.soa_refresh} onChange={(e)=>setRecordFormData({ ...recordFormData, soa_refresh: parseInt(e.target.value||'0') })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Retry</label>
                        <input type="number" value={recordFormData.soa_retry} onChange={(e)=>setRecordFormData({ ...recordFormData, soa_retry: parseInt(e.target.value||'0') })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Expire</label>
                        <input type="number" value={recordFormData.soa_expire} onChange={(e)=>setRecordFormData({ ...recordFormData, soa_expire: parseInt(e.target.value||'0') })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Minimum TTL</label>
                        <input type="number" value={recordFormData.soa_minimum} onChange={(e)=>setRecordFormData({ ...recordFormData, soa_minimum: parseInt(e.target.value||'0') })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"/>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      TTL (seconds)
                    </label>
                    <input
                      type="number"
                      value={recordFormData.ttl}
                      onChange={(e) => setRecordFormData({ ...recordFormData, ttl: parseInt(e.target.value) })}
                      min="60"
                      max="86400"
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>

                  {(recordFormData.record_type === 'MX' || recordFormData.record_type === 'SRV') && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                        Priority
                      </label>
                      <input
                        type="number"
                        value={recordFormData.priority || ''}
                        onChange={(e) => setRecordFormData({ ...recordFormData, priority: parseInt(e.target.value) })}
                        min="0"
                        max="65535"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-[var(--tertiary-text)] mt-1">
                        {recordFormData.record_type === 'MX' ? 'Lower values have higher priority' : 'Service priority (lower = higher priority)'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowRecordForm(false);
                      setEditingRecord(null);
                      resetForm();
                    }}
                    disabled={actionLoading.form}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={actionLoading.form}
                  >
                    {actionLoading.form ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                        {editingRecord ? 'Updating...' : 'Creating...'}
                      </div>
                    ) : (
                      editingRecord ? 'Update Record' : 'Create Record'
                    )}
                  </Button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}

        {/* Zone File Modal */}
        {showZoneFile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[125] overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-4xl my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--primary-text)]">
                  Zone File: {selectedDomain?.domain}
                </h2>
                <button
                  onClick={() => setShowZoneFile(false)}
                  className="text-[var(--secondary-text)] hover:text-[var(--primary-text)]"
                >
                  <ChevronUpIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-[var(--code-bg)] border border-[var(--border-color)] rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-[var(--code-text)] whitespace-pre-wrap font-mono">
                  {zoneFileContent}
                </pre>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowZoneFile(false)}
                >
                  Close
                </Button>
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DNSManagement; 