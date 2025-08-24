import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  // Edit/inline states
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openTypeSelect, setOpenTypeSelect] = useState(new Set());

  // Selection
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const headerCheckboxRef = useRef(null);

  // Search / filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // New record form
  const [newRecordData, setNewRecordData] = useState({
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
  });
  const [showNewTypeSelect, setShowNewTypeSelect] = useState(false);

  // Per-row draft edits (used in global edit mode)
  const [editRecordsData, setEditRecordsData] = useState({});

  const recordTypes = [
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

  // Helpers for SOA
  const buildSoaContent = (data) => {
    const m = data.soa_mname || `ns1.${selectedDomain?.domain}.`;
    const r = data.soa_rname || `admin.${selectedDomain?.domain}.`;
    const serial = (data.soa_serial && `${data.soa_serial}`) || dnsZone?.serial || new Date().toISOString().slice(0, 10).replace(/-/g, '') + '01';
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
        soa_minimum: minimum ? parseInt(minimum) : 300,
      };
    } catch (e) {
      return {};
    }
  };

  // Fetch domains and optionally preselect from URL
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const data = await virtualHosts.getAll();
        setDomains(data || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch domains');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, []);

  useEffect(() => {
    const domainParam = searchParams.get('domain');
    if (!domainParam || !domains.length) return;
    const domain = domains.find((d) => d.domain === domainParam);
    if (domain) handleDomainSelect(domain);
  }, [searchParams, domains]);

  useEffect(() => {
    if (!selectedDomain) return;
    const fetchDnsRecords = async () => {
      try {
        setActionLoading((p) => ({ ...p, records: true }));
        const zones = await dns.getZones();
        const existingZone = zones.find((z) => z.domain_name === selectedDomain.domain);
        if (existingZone) {
          setDnsZone(existingZone);
          const records = await dns.getRecords(existingZone.id);
          setDnsRecords(records || []);
        } else {
          const newZone = await dns.createZone({ domain_name: selectedDomain.domain, nameserver_ip: '127.0.0.1' });
          setDnsZone(newZone);
          setDnsRecords([]);
        }
        setError(null);
      } catch (err) {
        setError('Failed to fetch DNS records');
        console.error(err);
      } finally {
        setActionLoading((p) => ({ ...p, records: false }));
      }
    };
    fetchDnsRecords();
  }, [selectedDomain]);

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setDnsZone(null);
    setDnsRecords([]);
    setIsEditingMode(false);
    setSelectedRecords(new Set());
  };

  // Filtering / memo
  const filteredRecords = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    return (dnsRecords || []).filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(term) || r.content.toLowerCase().includes(term);
      const matchesType = filterType === 'all' || r.record_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [dnsRecords, searchTerm, filterType]);

  // Ids selectable (exclude SOA)
  const selectableIds = useMemo(() => filteredRecords.filter((r) => r.record_type !== 'SOA').map((r) => r.id), [filteredRecords]);

  // Header checkbox indeterminate
  useEffect(() => {
    if (!isEditingMode || !headerCheckboxRef.current) return;
    const total = selectableIds.length;
    const selected = Array.from(selectedRecords).filter((id) => selectableIds.includes(id)).length;
    headerCheckboxRef.current.indeterminate = selected > 0 && selected < total;
  }, [isEditingMode, selectedRecords, selectableIds]);

  // Toggle edit mode / save all
  const handleToggleGlobalEdit = async () => {
    if (!dnsZone) return;
    // Enter edit mode -> build drafts
    if (!isEditingMode) {
      const initial = {};
      (dnsRecords || []).forEach((r) => {
        const base = { name: r.name, record_type: r.record_type, content: r.content, ttl: r.ttl, priority: r.priority };
        initial[r.id] = r.record_type === 'SOA' ? { ...base, ...parseSoaContent(r.content) } : base;
      });
      setEditRecordsData(initial);
      setIsEditingMode(true);
      setSelectedRecords(new Set());
      return;
    }
    // Save all
    try {
      setActionLoading((p) => ({ ...p, bulkSave: true }));
      const updates = Object.entries(editRecordsData)
        .filter(([id, data]) => Number.isFinite(Number(id)))
        .filter(([id, data]) => {
          const numericId = Number(id);
          const original = dnsRecords.find((r) => r.id === numericId);
          if (!original) return false;
          // Skip protected types that backend forbids
          if (original.record_type === 'SOA' || original.record_type === 'NS') return false;
          // Only send if something actually changed
          const fields = ['name', 'record_type', 'content', 'ttl', 'priority'];
          return fields.some((f) => (data[f] ?? null) !== (original[f] ?? null));
        })
        .map(([id, data]) => {
          const payload = { ...data };
          if (payload.record_type === 'SOA') {
            payload.name = payload.name || '@';
            payload.content = buildSoaContent(payload);
          }
          // Strip SOA helper fields
          delete payload.soa_mname;
          delete payload.soa_rname;
          delete payload.soa_serial;
          delete payload.soa_refresh;
          delete payload.soa_retry;
          delete payload.soa_expire;
          delete payload.soa_minimum;
          // Remove priority if not MX/SRV
          if (payload.record_type !== 'MX' && payload.record_type !== 'SRV') {
            delete payload.priority;
          }
          const numericId = Number(id);
          return dns.updateRecord(dnsZone.id, numericId, payload);
        });
      if (updates.length) {
        await Promise.all(updates);
      }
      const records = await dns.getRecords(dnsZone.id);
      setDnsRecords(records || []);
      setIsEditingMode(false);
      setEditRecordsData({});
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setActionLoading((p) => ({ ...p, bulkSave: false }));
    }
  };

  // New record create
  const resetNewRecordForm = () => setNewRecordData({
    name: '', record_type: 'A', content: '', ttl: 3600, priority: null,
    soa_mname: '', soa_rname: '', soa_serial: '', soa_refresh: 3600, soa_retry: 1800, soa_expire: 1209600, soa_minimum: 300,
  });

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!dnsZone) return;
    try {
      setActionLoading((p) => ({ ...p, newRecord: true }));
      const payload = { ...newRecordData };
      if (payload.record_type === 'SOA') {
        payload.name = payload.name || '@';
        payload.content = buildSoaContent(payload);
      }
      await dns.createRecord(dnsZone.id, payload);
      const records = await dns.getRecords(dnsZone.id);
      setDnsRecords(records || []);
      setShowInlineForm(false);
      resetNewRecordForm();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create DNS record');
    } finally {
      setActionLoading((p) => ({ ...p, newRecord: false }));
    }
  };

  // Delete single / bulk
  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Delete ${record.record_type} record?`)) return;
    try {
      setActionLoading((p) => ({ ...p, [record.id]: true }));
      await dns.deleteRecord(dnsZone.id, record.id);
      const records = await dns.getRecords(dnsZone.id);
      setDnsRecords(records || []);
      setError(null);
    } catch (err) { setError('Failed to delete DNS record'); }
    finally { setActionLoading((p) => ({ ...p, [record.id]: false })); }
  };

  const handleBulkDelete = async () => {
    if (!selectedRecords.size) return;
    if (!window.confirm(`Delete ${selectedRecords.size} record(s)?`)) return;
    try {
      setActionLoading((p) => ({ ...p, bulkDelete: true }));
      await Promise.all(Array.from(selectedRecords).map((id) => dns.deleteRecord(dnsZone.id, id)));
      const records = await dns.getRecords(dnsZone.id);
      setDnsRecords(records || []);
      setSelectedRecords(new Set());
    } catch (err) { setError('Failed to delete some records'); }
    finally { setActionLoading((p) => ({ ...p, bulkDelete: false })); }
  };

  // Selection helpers
  const toggleSelect = (id) => {
    setSelectedRecords((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    setSelectedRecords((prev) => {
      const visible = selectableIds;
      if (!visible.length) return new Set();
      const allSelected = visible.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(visible);
    });
  };

  // Row click to toggle selection (but not when clicking inputs)
  const rowSelectHandler = (e, id) => {
    if (!isEditingMode) return; // selection visible only in edit mode
    const block = e.target.closest('input,select,button,textarea,a');
    if (block) return; // don't toggle when interacting with inputs

    if (e.shiftKey && lastSelectedId) {
      const ids = selectableIds; // ordered
      const a = ids.indexOf(lastSelectedId);
      const b = ids.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [start, end] = a < b ? [a, b] : [b, a];
        setSelectedRecords((prev) => {
          const s = new Set(prev);
          ids.slice(start, end + 1).forEach((x) => s.add(x));
          return s;
        });
      } else {
        toggleSelect(id);
      }
    } else {
      toggleSelect(id);
      setLastSelectedId(id);
    }
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
      SOA: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const actions = (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm" onClick={() => selectedDomain && setSelectedDomain({ ...selectedDomain })} disabled={!selectedDomain || actionLoading.records} icon={<ArrowPathIcon className="w-4 h-4" />}>Refresh</Button>
      {dnsZone && (
        <>
          <Button variant="secondary" size="sm" onClick={async () => { try { setActionLoading((p)=>({ ...p, zonefile: true })); const r = await dns.getZoneFile(dnsZone.id); alert(r.content); } finally { setActionLoading((p)=>({ ...p, zonefile: false })); } }} disabled={actionLoading.zonefile} icon={<EyeIcon className="w-4 h-4" />}>View Zone File</Button>
          <Button variant="secondary" size="sm" onClick={async () => { try { setActionLoading((p)=>({ ...p, reload: true })); await dns.reloadBind(); } finally { setActionLoading((p)=>({ ...p, reload: false })); } }} disabled={actionLoading.reload} icon={<CommandLineIcon className="w-4 h-4" />}>{actionLoading.reload ? 'Reloading…' : 'Reload BIND'}</Button>
          <Button variant="secondary" size="sm" onClick={async () => { if (!window.confirm('Rebuild all DNS zones?')) return; try { setActionLoading((p)=>({ ...p, rebuild: true })); await dns.rebuildDns(); const rec = await dns.getRecords(dnsZone.id); setDnsRecords(rec||[]); } finally { setActionLoading((p)=>({ ...p, rebuild: false })); } }} disabled={actionLoading.rebuild} icon={<WrenchScrewdriverIcon className="w-4 h-4" />}>{actionLoading.rebuild ? 'Rebuilding…' : 'Rebuild DNS'}</Button>
          {!isEditingMode && selectedRecords.size > 0 && (
            <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={actionLoading.bulkDelete} icon={<TrashIcon className="w-4 h-4" />}>Delete Selected ({selectedRecords.size})</Button>
          )}
        </>
      )}
    </div>
  );

  return (
    <PageLayout title="DNS Management" description="Manage DNS records for your domains" actions={actions}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <InformationCircleIcon className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300">×</button>
            </div>
          </div>
        )}

        {/* Domain cards */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-4">Select Domain</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (<div key={i} className="animate-pulse h-20 bg-[var(--border-color)] rounded-lg"/>))}
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-8">
                <GlobeAltIcon className="w-12 h-12 text-[var(--secondary-text)] mx-auto mb-4" />
                <p className="text-[var(--secondary-text)] mb-4">No domains found</p>
                <p className="text-sm text-[var(--tertiary-text)]">Create a Virtual Host first to manage DNS records</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {domains.map((d) => (
                  <button key={d.id} onClick={() => handleDomainSelect(d)} className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${selectedDomain?.id === d.id ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5' : 'border-[var(--border-color)] hover:border-[var(--accent-color)]/50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--primary-text)]">{d.domain}</h3>
                        <p className="text-sm text-[var(--secondary-text)]">{d.linux_username}</p>
                      </div>
                      <GlobeAltIcon className="w-5 h-5 text-[var(--secondary-text)]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Records */}
        {selectedDomain && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {isEditingMode ? (
                    <div className="flex items-center space-x-2">
                      <button onClick={handleToggleGlobalEdit} disabled={actionLoading.bulkSave} className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${actionLoading.bulkSave ? 'opacity-60 cursor-not-allowed' : ''} border-green-500/30 text-green-400 hover:text-green-300`} title="Save All">
                        {actionLoading.bulkSave ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => { setIsEditingMode(false); setEditRecordsData({}); setSelectedRecords(new Set()); setOpenTypeSelect(new Set()); setShowDeleteConfirm(false); }} className="rounded-md border px-2 py-1 text-xs font-medium transition-colors border-[var(--border-color)] text-[var(--secondary-text)] hover:text-[var(--primary-text)]" title="Cancel Edit">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleToggleGlobalEdit} className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors border-[var(--border-color)] text-[var(--secondary-text)] hover:text-[var(--primary-text)]`} title="Edit">
                      Edit
                    </button>
                  )}
                  <h2 className="text-lg font-semibold text-[var(--primary-text)]">DNS Records for {selectedDomain.domain}</h2>
                  <p className="text-sm text-[var(--secondary-text)]">{dnsRecords.length} record{dnsRecords.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Search & filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondary-text)]" />
                    <input type="text" placeholder="Search records…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="w-5 h-5 text-[var(--secondary-text)]" />
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent">
                    <option value="all">All Types</option>
                    {recordTypes.map((t) => (<option key={t.value} value={t.value}>{t.value}</option>))}
                  </select>
                </div>
              </div>

              {/* Bulk toolbar */}
              {isEditingMode && selectedRecords.size > 0 && (
                <div className="mb-2 flex items-center justify-between bg-[var(--card-bg)]/90 backdrop-blur px-3 py-2 border border-[var(--border-color)] rounded-md">
                  <span className="text-sm text-[var(--secondary-text)]">{selectedRecords.size} selected</span>
                  <div className="flex items-center space-x-2">
                    {!showDeleteConfirm ? (
                      <>
                        <Button variant="secondary" size="sm">Duplicate</Button>
                        <Button variant="secondary" size="sm">Export</Button>
                        <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-[var(--secondary-text)]">Confirm delete?</span>
                        <Button variant="danger" size="sm" onClick={handleBulkDelete}>Delete</Button>
                        <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                    <tr>
                      {/* Select column - only visible in edit mode */}
                      <th className="w-11 px-4 py-3 text-left">
                        {isEditingMode && (
                          <input ref={headerCheckboxRef} type="checkbox" onChange={toggleSelectAll} checked={selectableIds.length > 0 && selectableIds.every((id) => selectedRecords.has(id))} className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]" />
                        )}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">TTL</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Value</th>
                      <th className="w-8 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                    {/* Inline create row */}
                    {showInlineForm && (
                      <tr className="bg-[var(--accent-color)]/5 border-2 border-[var(--accent-color)]/20">
                        <td className="px-4" />
                        <td className="px-6 py-4">
                          {showNewTypeSelect ? (
                            <select autoFocus value={newRecordData.record_type} onChange={(e) => setNewRecordData({ ...newRecordData, record_type: e.target.value })} onBlur={() => setShowNewTypeSelect(false)} className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent">
                              {recordTypes.map((t) => (<option key={t.value} value={t.value}>{t.value}</option>))}
                            </select>
                          ) : (
                            <button onClick={() => setShowNewTypeSelect(true)} className={`px-2 py-1 text-xs font-medium rounded-full ${getRecordTypeColor(newRecordData.record_type)}`}>{newRecordData.record_type}</button>
                          )}
                        </td>
                        <td className="px-6 py-4"><input type="text" value={newRecordData.name} onChange={(e) => setNewRecordData({ ...newRecordData, name: e.target.value })} placeholder="@ or subdomain" className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" /></td>
                        <td className="px-6 py-4"><input type="number" value={newRecordData.ttl} onChange={(e) => setNewRecordData({ ...newRecordData, ttl: parseInt(e.target.value || '0', 10) })} className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" /></td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <input type="text" value={newRecordData.content} onChange={(e) => setNewRecordData({ ...newRecordData, content: e.target.value })} placeholder="Record content" className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" />
                            {(newRecordData.record_type === 'MX' || newRecordData.record_type === 'SRV') && (
                              <input type="number" value={newRecordData.priority || ''} onChange={(e) => setNewRecordData({ ...newRecordData, priority: parseInt(e.target.value || '0', 10) })} placeholder="Priority" className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={handleCreateRecord} disabled={actionLoading.newRecord} className="text-green-600 hover:text-green-800 disabled:opacity-50" title="Save Record">{actionLoading.newRecord ? (<div className="w-4 h-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>) : (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>)}</button>
                            <button onClick={() => { setShowInlineForm(false); resetNewRecordForm(); }} className="text-gray-600 hover:text-gray-800" title="Cancel"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {filteredRecords.map((record) => {
                      const isRowEditable = isEditingMode; // global inline editing
                      const draft = editRecordsData[record.id] || record;
                      const selectable = record.record_type !== 'SOA';
                      const checked = selectedRecords.has(record.id);

                      return (
                        <tr key={record.id} className={`group hover:bg-[var(--hover-bg)] transition-colors ${checked ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`} onClick={(e) => rowSelectHandler(e, record.id)}>
                          {/* Select checkbox */}
                          <td className="px-4 py-4">
                            {isEditingMode && selectable && (
                              <input type="checkbox" checked={checked} onChange={(e) => {
                                // support shift range via native change on checkbox as well
                                if (e.nativeEvent.shiftKey && lastSelectedId) {
                                  const ids = selectableIds; const a = ids.indexOf(lastSelectedId); const b = ids.indexOf(record.id);
                                  if (a !== -1 && b !== -1) {
                                    const [start, end] = a < b ? [a, b] : [b, a];
                                    setSelectedRecords((prev) => { const s = new Set(prev); ids.slice(start, end + 1).forEach((x) => s.add(x)); return s; });
                                  }
                                } else { toggleSelect(record.id); setLastSelectedId(record.id); }
                              }} className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]" />
                            )}
                          </td>

                          {/* Type */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isRowEditable ? (
                              openTypeSelect.has(record.id) ? (
                                <select autoFocus value={draft.record_type} onChange={(e) => setEditRecordsData((p) => ({ ...p, [record.id]: { ...draft, record_type: e.target.value } }))} onBlur={() => { const s = new Set(openTypeSelect); s.delete(record.id); setOpenTypeSelect(s); }} className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent">
                                  {recordTypes.map((t) => (<option key={t.value} value={t.value}>{t.value}</option>))}
                                </select>
                              ) : (
                                <button onClick={() => { const s = new Set(openTypeSelect); s.add(record.id); setOpenTypeSelect(s); }} className={`px-2 py-1 text-xs font-medium rounded-full ${getRecordTypeColor(draft.record_type)}`}>{draft.record_type}</button>
                              )
                            ) : (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRecordTypeColor(record.record_type)}`}>{record.record_type}</span>
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isRowEditable ? (
                              <input type="text" value={draft.name} onChange={(e) => setEditRecordsData((p) => ({ ...p, [record.id]: { ...draft, name: e.target.value } }))} className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" />
                            ) : (
                              <div className="text-sm font-medium text-[var(--primary-text)]">{record.name || '@'}</div>
                            )}
                          </td>

                          {/* TTL */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isRowEditable ? (
                              <input type="number" value={draft.ttl} onChange={(e) => setEditRecordsData((p) => ({ ...p, [record.id]: { ...draft, ttl: parseInt(e.target.value || '0', 10) } }))} className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" />
                            ) : (
                              <span className="text-sm text-[var(--secondary-text)]">{record.ttl}</span>
                            )}
                          </td>

                          {/* Value (+ priority) */}
                          <td className="px-6 py-4">
                            {isRowEditable ? (
                              <div className="space-y-2">
                                <input type="text" value={draft.content} onChange={(e) => setEditRecordsData((p) => ({ ...p, [record.id]: { ...draft, content: e.target.value } }))} className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" />
                                {(draft.record_type === 'MX' || draft.record_type === 'SRV') && (
                                  <input type="number" value={draft.priority || ''} onChange={(e) => setEditRecordsData((p) => ({ ...p, [record.id]: { ...draft, priority: parseInt(e.target.value || '0', 10) } }))} placeholder="Priority" className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--primary-text)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent" />
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-[var(--primary-text)]">
                                <div className="max-w-xs truncate">{record.content}</div>
                                {record.priority && (<div className="text-xs text-[var(--secondary-text)] mt-1">Priority: {record.priority}</div>)}
                              </div>
                            )}
                          </td>

                          {/* Actions (view mode only) */}
                          <td className="px-4 py-4 text-right">
                            {!isEditingMode && record.record_type !== 'SOA' && (
                              <button onClick={() => handleDeleteRecord(record)} className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 rounded text-red-500 hover:text-red-400" title="Delete">✖</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end mt-4">
                <Button variant="primary" size="sm" onClick={() => setShowInlineForm((s) => !s)} icon={<PlusIcon className="w-4 h-4" />}>{showInlineForm ? 'Cancel' : 'Add Record'}</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default DNSManagement;
