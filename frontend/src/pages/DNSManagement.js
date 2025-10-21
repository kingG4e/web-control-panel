import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { dns, virtualHosts } from '../services/api';
import {
  PlusIcon,
  TrashIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  EyeIcon,
  CommandLineIcon,
  WrenchScrewdriverIcon,
  InformationCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Constants และ helper functions แยกออกมา
const RECORD_TYPES = [
  { value: 'A', label: 'A - IPv4 Address' },
  { value: 'AAAA', label: 'AAAA - IPv6 Address' },
  { value: 'CNAME', label: 'CNAME - Canonical Name' },
  { value: 'MX', label: 'MX - Mail Exchange' },
  { value: 'NS', label: 'NS - Name Server' },
  { value: 'TXT', label: 'TXT - Text Record' },
  { value: 'SPF', label: 'SPF - Sender Policy Framework' },
  { value: 'DKIM', label: 'DKIM - DomainKeys Identified Mail' },
  { value: 'PTR', label: 'PTR - Pointer Record' },
  { value: 'SRV', label: 'SRV - Service Record' },
  { value: 'CAA', label: 'CAA - Certificate Authority Authorization' },
  { value: 'SOA', label: 'SOA - Start of Authority' },
];

const RECORD_TYPE_COLORS = {
  A: 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200',
  AAAA: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200',
  CNAME: 'bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200',
  MX: 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
  NS: 'bg-sky-50 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200',
  TXT: 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200',
  SPF: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200',
  DKIM: 'bg-rose-50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200',
  PTR: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
  SRV: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200',
  CAA: 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-200',
  SOA: 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200',
};

const DEFAULT_RECORD_DATA = {
  name: '',
  record_type: 'A',
  content: '',
  ttl: 3600,
  priority: null,
  soa_mname: '',
  soa_rname: '',
  soa_serial: '',
  soa_refresh: 3600,
  soa_retry: 1800,
  soa_expire: 1209600,
  soa_minimum: 300,
};

// Helper functions
const buildSoaContent = (data, selectedDomain, dnsZone) => {
  const m = data.soa_mname || `ns1.${selectedDomain?.domain}.`;
  const r = data.soa_rname || `admin.${selectedDomain?.domain}.`;
  const serial = data.soa_serial || dnsZone?.serial || `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}01`;
  const refresh = data.soa_refresh || 3600;
  const retry = data.soa_retry || 1800;
  const expire = data.soa_expire || 1209600;
  const minimum = data.soa_minimum || 300;
  return `${m} ${r} ${serial} ${refresh} ${retry} ${expire} ${minimum}`;
};

const parseSoaContent = (content) => {
  try {
    const cleaned = (content || '').replace(/\(|\)/g, ' ');
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const [mname, rname, serial, refresh, retry, expire, minimum] = parts;
    return {
      soa_mname: mname || '',
      soa_rname: rname || '',
      soa_serial: serial || '',
      soa_refresh: refresh ? parseInt(refresh) : 3600,
      soa_retry: retry ? parseInt(retry) : 1800,
      soa_expire: expire ? parseInt(expire) : 1209600,
      soa_minimum: minimum ? parseInt(minimum) : 300,
    };
  } catch {
    return { 
      soa_mname: '', 
      soa_rname: '', 
      soa_serial: '', 
      soa_refresh: 3600, 
      soa_retry: 1800, 
      soa_expire: 1209600, 
      soa_minimum: 300 
    };
  }
};

const getRecordTypeColor = (type) => {
  return RECORD_TYPE_COLORS[type] || 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-200';
};

// Sub-components
const ErrorMessage = ({ error, onDismiss }) => {
  if (!error) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
      <div className="flex items-center">
        <InformationCircleIcon className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
        <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
        <button 
          onClick={onDismiss} 
          className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
          aria-label="Dismiss error"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const LoadingSpinner = ({ size = 'w-4 h-4' }) => (
  <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${size}`} />
);

const DomainCards = ({ domains, selectedDomain, onDomainSelect, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse h-20 bg-[var(--border-color)] rounded-lg" />
        ))}
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-8">
        <GlobeAltIcon className="w-12 h-12 text-[var(--secondary-text)] mx-auto mb-4" />
        <p className="text-[var(--secondary-text)] mb-4">No domains found</p>
        <p className="text-sm text-[var(--tertiary-text)]">
          Create a Virtual Host first to manage DNS records
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {domains.map((domain) => (
        <button
          key={domain.id}
          onClick={() => onDomainSelect(domain)}
          className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
            selectedDomain?.id === domain.id
              ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5'
              : 'border-[var(--border-color)] hover:border-[var(--accent-color)]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[var(--primary-text)]">{domain.domain}</h3>
              <p className="text-sm text-[var(--secondary-text)]">{domain.linux_username}</p>
            </div>
            <GlobeAltIcon className="w-5 h-5 text-[var(--secondary-text)]" />
          </div>
        </button>
      ))}
    </div>
  );
};

const RecordTypeBadge = ({ type, isEditing, onTypeChange }) => {
  const colorClass = getRecordTypeColor(type);
  
  if (isEditing) {
    return (
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className={`text-xs font-medium rounded-full px-2 py-1 ${colorClass} border border-transparent focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]`}
      >
        {RECORD_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.value}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
      {type}
    </span>
  );
};

const RecordForm = ({
  record,
  isEditing = false,
  onSave,
  onCancel,
  loading = false,
  selectedDomain,
  dnsZone,
}) => {
  const [formData, setFormData] = useState(() => {
    if (isEditing && record) {
      const baseData = {
        name: record.name,
        record_type: record.record_type,
        content: record.content,
        ttl: record.ttl,
        priority: record.priority,
      };
      return record.record_type === 'SOA' 
        ? { ...baseData, ...parseSoaContent(record.content) }
        : baseData;
    }
    return { ...DEFAULT_RECORD_DATA };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.name.trim() && formData.record_type !== 'SOA') {
        throw new Error('Name is required');
      }
      if (!formData.content.trim() && formData.record_type !== 'SOA') {
        throw new Error('Content is required');
      }

      const payload = { 
        name: formData.name,
        record_type: formData.record_type,
        content: formData.content,
        ttl: parseInt(formData.ttl) || 3600,
      };
      
      // Handle SOA record specially
      if (formData.record_type === 'SOA') {
        payload.name = formData.name || '@';
        payload.content = buildSoaContent(formData, selectedDomain, dnsZone);
        
        // Add SOA-specific fields to payload
        payload.soa_mname = formData.soa_mname;
        payload.soa_rname = formData.soa_rname;
        payload.soa_serial = formData.soa_serial;
        payload.soa_refresh = parseInt(formData.soa_refresh) || 3600;
        payload.soa_retry = parseInt(formData.soa_retry) || 1800;
        payload.soa_expire = parseInt(formData.soa_expire) || 1209600;
        payload.soa_minimum = parseInt(formData.soa_minimum) || 300;
      } else {
        // For non-SOA records, use the provided content
        payload.content = formData.content;
      }

      // Add priority for MX and SRV records
      if (['MX', 'SRV'].includes(formData.record_type) && formData.priority !== null) {
        payload.priority = parseInt(formData.priority) || 0;
      }

      await onSave(payload);
    } catch (err) {
      console.error('Form validation error:', err);
      throw err;
    }
  };

  const requiresPriority = ['MX', 'SRV'].includes(formData.record_type);
  const isSoa = formData.record_type === 'SOA';

  return (
    <tr className="bg-[var(--accent-color)]/5 border-2 border-[var(--accent-color)]/20">
      <td className="px-6 py-4">
        <RecordTypeBadge
          type={formData.record_type}
          isEditing={true}
          onTypeChange={(value) => setFormData(prev => ({ ...prev, record_type: value }))}
        />
      </td>
      
      <td className="px-6 py-4">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder={isSoa ? "@ (default)" : "@ or subdomain"}
          className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
        />
      </td>
      
      <td className="px-6 py-4">
        <input
          type="number"
          value={formData.ttl}
          onChange={(e) => setFormData(prev => ({ ...prev, ttl: parseInt(e.target.value) || 3600 }))}
          min="60"
          className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
        />
      </td>
      
      <td className="px-6 py-4">
        <div className="space-y-3">
          {isSoa ? (
            <div className="space-y-2">
              <input
                type="text"
                value={formData.soa_mname}
                onChange={(e) => setFormData(prev => ({ ...prev, soa_mname: e.target.value }))}
                placeholder={`ns1.${selectedDomain?.domain}.`}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
              />
              <input
                type="text"
                value={formData.soa_rname}
                onChange={(e) => setFormData(prev => ({ ...prev, soa_rname: e.target.value }))}
                placeholder={`admin.${selectedDomain?.domain}.`}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
              />
              <input
                type="text"
                value={formData.soa_serial}
                onChange={(e) => setFormData(prev => ({ ...prev, soa_serial: e.target.value }))}
                placeholder="Serial number"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
              />
            </div>
          ) : (
            <input
              type="text"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Record content"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
            />
          )}
          
          {requiresPriority && (
            <input
              type="number"
              value={formData.priority || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              placeholder="Priority"
              min="0"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
            />
          )}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-green-600 hover:text-green-800 dark:hover:text-green-400 disabled:opacity-50 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
            aria-label="Save record"
          >
            {loading ? <LoadingSpinner /> : <CheckIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={onCancel}
            className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] p-1 rounded hover:bg-[var(--hover-bg)]"
            aria-label="Cancel"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const DNSManagement = () => {
  const [searchParams] = useSearchParams();
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [dnsZone, setDnsZone] = useState(null);
  const [dnsRecords, setDnsRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Simplified loading states
  const [loadingStates, setLoadingStates] = useState({
    domains: false,
    records: false,
    create: false,
    update: false,
    delete: false,
  });

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // UI states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);

  // Load domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoadingStates(prev => ({ ...prev, domains: true }));
        const domainsData = await virtualHosts.getDomains();
        setDomains(domainsData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch domains');
        console.error('Error fetching domains:', err);
      } finally {
        setLoadingStates(prev => ({ ...prev, domains: false }));
        setLoading(false);
      }
    };
    
    fetchDomains();
  }, []);

  // Auto-select domain from URL or first domain
  useEffect(() => {
    const domainFromUrl = searchParams.get('domain');
    if (domainFromUrl && domains.length > 0) {
      const foundDomain = domains.find(d => d.domain === domainFromUrl);
      if (foundDomain) {
        handleDomainSelect(foundDomain);
      }
    } else if (domains.length === 1 && !selectedDomain) {
      handleDomainSelect(domains[0]);
    }
  }, [searchParams, domains]);

  // Load DNS records when domain is selected
  useEffect(() => {
    if (!selectedDomain) return;

    const fetchDnsRecords = async () => {
      try {
        setLoadingStates(prev => ({ ...prev, records: true }));
        const zones = await dns.getZones();
        const existingZone = zones.find(z => z.domain_name === selectedDomain.domain);
        
        if (existingZone) {
          setDnsZone(existingZone);
          const records = await dns.getRecords(existingZone.id);
          setDnsRecords(records || []);
        } else {
          // Create new zone if doesn't exist
          const newZone = await dns.createZone({ 
            domain_name: selectedDomain.domain
          });
          setDnsZone(newZone);
          setDnsRecords([]);
        }
        setError(null);
      } catch (err) {
        setError('Failed to fetch DNS records: ' + (err.response?.data?.error || err.message));
        console.error('Error fetching DNS records:', err);
      } finally {
        setLoadingStates(prev => ({ ...prev, records: false }));
      }
    };

    fetchDnsRecords();
  }, [selectedDomain]);

  const handleDomainSelect = useCallback((domain) => {
    setSelectedDomain(domain);
    setDnsZone(null);
    setDnsRecords([]);
    setEditingRecordId(null);
    setShowCreateForm(false);
    setError(null);
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!dnsRecords) return [];
    
    const term = searchTerm.toLowerCase();
    return dnsRecords.filter(record => {
      const matchesSearch = 
        record.name.toLowerCase().includes(term) || 
        record.content.toLowerCase().includes(term);
      const matchesType = filterType === 'all' || record.record_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [dnsRecords, searchTerm, filterType]);

  // Record operations
  const handleCreateRecord = async (recordData) => {
    if (!dnsZone) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, create: true }));
      
      // Prepare the data for API
      const apiData = {
        name: recordData.name,
        record_type: recordData.record_type,
        content: recordData.content,
        ttl: recordData.ttl
      };

      // Add priority if present
      if (recordData.priority !== undefined && recordData.priority !== null) {
        apiData.priority = recordData.priority;
      }

      // For SOA records, include SOA-specific fields
      if (recordData.record_type === 'SOA') {
        apiData.soa_mname = recordData.soa_mname;
        apiData.soa_rname = recordData.soa_rname;
        apiData.soa_serial = recordData.soa_serial;
        apiData.soa_refresh = recordData.soa_refresh;
        apiData.soa_retry = recordData.soa_retry;
        apiData.soa_expire = recordData.soa_expire;
        apiData.soa_minimum = recordData.soa_minimum;
      }

      console.log('Creating record with data:', apiData);
      await dns.createRecord(dnsZone.id, apiData);
      
      // Refresh records
      const records = await dns.getRecords(dnsZone.id);
      setDnsRecords(records || []);
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create DNS record';
      setError(errorMessage);
      console.error('Error creating record:', err);
      throw err;
    } finally {
      setLoadingStates(prev => ({ ...prev, create: false }));
    }
  };

  const handleUpdateRecord = async (recordId, recordData) => {
    if (!dnsZone) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, update: true }));
      
      // Prepare the data for API
      const apiData = {
        name: recordData.name,
        record_type: recordData.record_type,
        content: recordData.content,
        ttl: recordData.ttl
      };

      // Add priority if present
      if (recordData.priority !== undefined && recordData.priority !== null) {
        apiData.priority = recordData.priority;
      }

      // For SOA records, include SOA-specific fields
      if (recordData.record_type === 'SOA') {
        apiData.soa_mname = recordData.soa_mname;
        apiData.soa_rname = recordData.soa_rname;
        apiData.soa_serial = recordData.soa_serial;
        apiData.soa_refresh = recordData.soa_refresh;
        apiData.soa_retry = recordData.soa_retry;
        apiData.soa_expire = recordData.soa_expire;
        apiData.soa_minimum = recordData.soa_minimum;
      }

      console.log('Updating record with data:', apiData);
      await dns.updateRecord(dnsZone.id, recordId, apiData);
      
      // Refresh records
      const records = await dns.getRecords(dnsZone.id);
      setDnsRecords(records || []);
      setEditingRecordId(null);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update DNS record';
      setError(errorMessage);
      console.error('Error updating record:', err);
      throw err;
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!dnsZone) return;
    
    const isConfirmed = window.confirm(
      `Are you sure you want to delete this ${record.record_type} record?`
    );
    
    if (!isConfirmed) return;

    try {
      setLoadingStates(prev => ({ ...prev, delete: true }));
      await dns.deleteRecord(dnsZone.id, record.id);
      
      // Refresh records
      const records = await dns.getRecords(dnsZone.id);
      setDnsRecords(records || []);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete DNS record';
      setError(errorMessage);
      console.error('Error deleting record:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, delete: false }));
    }
  };

  const startEdit = (recordId) => {
    setEditingRecordId(recordId);
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingRecordId(null);
  };

  return (
    <PageLayout title="DNS Management" description="Manage your DNS zones and records">
      <>
        <ErrorMessage error={error} onDismiss={() => setError(null)} />

        {/* Domain Selection */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-4">
              Select Domain
            </h2>
            <DomainCards
              domains={domains}
              selectedDomain={selectedDomain}
              onDomainSelect={handleDomainSelect}
              loading={loading}
            />
          </div>
        </Card>

        {/* DNS Records */}
        {selectedDomain && (
          <Card>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-[var(--primary-text)]">
                    DNS Records for {selectedDomain.domain}
                  </h2>
                  {loadingStates.records ? (
                    <LoadingSpinner />
                  ) : (
                    <span className="text-sm text-[var(--secondary-text)]">
                      {dnsRecords.length} record{dnsRecords.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <Button
                  onClick={() => {
                    setShowCreateForm(true);
                    setEditingRecordId(null);
                  }}
                  disabled={showCreateForm}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Record</span>
                </Button>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondary-text)]" />
                    <input
                      type="text"
                      placeholder="Search records…"
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
                    {RECORD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                        TTL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                        Value
                      </th>
                      <th className="w-20 px-4 py-3 text-right text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                    {/* Create Form */}
                    {showCreateForm && (
                      <RecordForm
                        onSave={handleCreateRecord}
                        onCancel={() => setShowCreateForm(false)}
                        loading={loadingStates.create}
                        selectedDomain={selectedDomain}
                        dnsZone={dnsZone}
                      />
                    )}

                    {/* Records List */}
                    {filteredRecords.map((record) => {
                      const isEditing = editingRecordId === record.id;
                      // Check if record ID is numeric (database record) or string (zone-only record)
                      const isEditableRecord = typeof record.id === 'number';
                      
                      if (isEditing) {
                        return (
                          <RecordForm
                            key={record.id}
                            record={record}
                            isEditing={true}
                            onSave={(data) => handleUpdateRecord(record.id, data)}
                            onCancel={cancelEdit}
                            loading={loadingStates.update}
                            selectedDomain={selectedDomain}
                            dnsZone={dnsZone}
                          />
                        );
                      }

                      return (
                        <tr 
                          key={record.id} 
                          className="group hover:bg-[var(--hover-bg)] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RecordTypeBadge type={record.record_type} />
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-[var(--primary-text)]">
                              {record.name || '@'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-[var(--secondary-text)]">
                              {record.ttl}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm text-[var(--primary-text)]">
                              <div className="max-w-md break-words">{record.content}</div>
                              {record.priority != null && (
                                <div className="text-xs text-[var(--secondary-text)] mt-1">
                                  Priority: {record.priority}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isEditableRecord && (
                                <button
                                  onClick={() => startEdit(record.id)}
                                  className="p-1 text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  aria-label="Edit record"
                                >
                                  <WrenchScrewdriverIcon className="w-4 h-4" />
                                </button>
                              )}
                              
                              {isEditableRecord && record.record_type !== 'SOA' && (
                                <button
                                  onClick={() => handleDeleteRecord(record)}
                                  disabled={loadingStates.delete}
                                  className="p-1 text-red-600 hover:text-red-800 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                                  aria-label="Delete record"
                                >
                                  {loadingStates.delete ? (
                                    <LoadingSpinner size="w-4 h-4" />
                                  ) : (
                                    <TrashIcon className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              
                              {!isEditableRecord && (
                                <span className="text-xs text-[var(--tertiary-text)] italic px-2">
                                  Read-only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredRecords.length === 0 && !showCreateForm && (
                  <div className="text-center py-8 text-[var(--secondary-text)]">
                    No DNS records found
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </>
    </PageLayout>
  );
};

export default DNSManagement;