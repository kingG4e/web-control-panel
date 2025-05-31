import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  ServerIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const DNSManagement = () => {
  const {
    dnsZones,
    addDNSZone,
    updateDNSZone,
    deleteDNSZone,
    addDNSRecord,
    updateDNSRecord,
    deleteDNSRecord
  } = useData();

  const [selectedZone, setSelectedZone] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [expandedZones, setExpandedZones] = useState({});
  const [showTooltip, setShowTooltip] = useState(null);
  const [zoneFormData, setZoneFormData] = useState({
    domain_name: '',
    nameserver_ip: '127.0.0.1'
  });
  const [recordFormData, setRecordFormData] = useState({
    name: '',
    record_type: 'A',
    content: '',
    ttl: 3600,
    priority: null
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setIsLoading(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setError(null);
    } catch (err) {
      setError('Failed to fetch DNS zones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addDNSZone(zoneFormData);
      setShowZoneForm(false);
      setZoneFormData({ domain_name: '', nameserver_ip: '127.0.0.1' });
    } catch (err) {
      setError('Failed to create DNS zone');
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!selectedZone) return;

    try {
      setError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      addDNSRecord(selectedZone.id, recordFormData);
      setShowRecordForm(false);
      setRecordFormData({
        name: '',
        record_type: 'A',
        content: '',
        ttl: 3600,
        priority: null
      });
    } catch (err) {
      setError('Failed to create DNS record');
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      deleteDNSZone(zoneId);
      } catch (err) {
        setError('Failed to delete DNS zone');
    }
  };

  const handleDeleteRecord = async (zoneId, recordId) => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      deleteDNSRecord(zoneId, recordId);
      } catch (err) {
        setError('Failed to delete DNS record');
      }
  };

  const getRecordTypeColor = (type) => {
    if (!type) return 'bg-gray-500/10 text-gray-500';
    
    switch (type.toUpperCase()) {
      case 'A':
        return 'bg-blue-500/10 text-blue-500';
      case 'AAAA':
        return 'bg-purple-500/10 text-purple-500';
      case 'CNAME':
        return 'bg-green-500/10 text-green-500';
      case 'MX':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'TXT':
        return 'bg-pink-500/10 text-pink-500';
      case 'NS':
        return 'bg-orange-500/10 text-orange-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getRecordTypeIcon = (type) => {
    if (!type) return null;
    
    switch (type.toUpperCase()) {
      case 'A':
      case 'AAAA':
        return <ServerIcon className="w-4 h-4" />;
      case 'CNAME':
        return <DocumentDuplicateIcon className="w-4 h-4" />;
      case 'MX':
        return <ArrowPathIcon className="w-4 h-4" />;
      case 'TXT':
        return <ShieldCheckIcon className="w-4 h-4" />;
      case 'NS':
        return <GlobeAltIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const groupRecordsByType = (records) => {
    if (!Array.isArray(records)) return {};
    
    return records.reduce((groups, record) => {
      if (!record || !record.record_type) return groups;
      
      const type = record.record_type.toUpperCase();
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(record);
      return groups;
    }, {});
  };

  const toggleZoneExpansion = (zoneId) => {
    setExpandedZones(prev => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  const filteredZones = dnsZones.filter(zone => {
    const matchesSearch = zone.domain_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.records.some(record => 
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.content.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (!matchesSearch) return false;
    if (selectedTypes.length === 0) return true;

    return zone.records.some(record => selectedTypes.includes(record.record_type));
  });

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

  const getTooltipContent = (type) => {
    switch (type) {
      case 'A':
        return 'Maps a domain to IPv4 address';
      case 'AAAA':
        return 'Maps a domain to IPv6 address';
      case 'CNAME':
        return 'Creates an alias pointing to another domain';
      case 'MX':
        return 'Specifies mail servers for the domain';
      case 'TXT':
        return 'Stores text information (SPF, DKIM, etc.)';
      case 'NS':
        return 'Specifies authoritative nameservers';
      default:
        return '';
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)]"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 text-red-500 p-4 rounded-lg border border-red-500/20">
      {error}
    </div>
  );

  return (
    <PageLayout
      title="DNS Management"
      description="Manage DNS records for your domains"
    >
      <div className="space-y-6">
        {/* Search and Filters Bar */}
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--secondary-text)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search domains, records, or content..."
                    className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] placeholder-[var(--secondary-text)]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap gap-2">
                  {recordTypes.map(type => (
                    <div
                      key={type}
                      className="relative"
                      onMouseEnter={() => setShowTooltip(type)}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <button
                        onClick={() => setSelectedTypes(prev => 
                          prev.includes(type) 
                            ? prev.filter(t => t !== type)
                            : [...prev, type]
                        )}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTypes.includes(type)
                            ? getRecordTypeColor(type)
                            : 'bg-[var(--border-color)] text-[var(--secondary-text)]'
                        }`}
                      >
                        {getRecordTypeIcon(type)}
                        <span className="ml-1">{type}</span>
                      </button>
                      {showTooltip === type && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/75 text-white text-xs rounded whitespace-nowrap">
                          {getTooltipContent(type)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => setShowZoneForm(true)}
                >
                  Add Zone
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* DNS Zones */}
        {filteredZones.length > 0 ? (
          <div className="space-y-4">
            {filteredZones.map((zone) => (
              <Card key={zone.id} className="overflow-hidden">
                <div 
                  className="p-4 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--hover-bg)] transition-colors"
                  onClick={() => toggleZoneExpansion(zone.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <GlobeAltIcon className="w-6 h-6 text-[var(--accent-color)]" />
        <div>
                        <h3 className="text-lg font-medium text-[var(--primary-text)]">{zone.domain_name}</h3>
                        <p className="text-sm text-[var(--secondary-text)]">
                          {zone.records.length} records · Serial: {zone.serial}
          </p>
        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<DocumentDuplicateIcon className="w-4 h-4" />}
                      >
                        Export
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<PlusIcon className="w-4 h-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedZone(zone);
                          setShowRecordForm(true);
                        }}
                      >
                        Add Record
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<TrashIcon className="w-4 h-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteZone(zone.id);
                        }}
                      >
                        Delete Zone
                      </Button>
                      {expandedZones[zone.id] ? (
                        <ChevronUpIcon className="w-5 h-5 text-[var(--secondary-text)]" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-[var(--secondary-text)]" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedZones[zone.id] && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Content</th>
                          <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">TTL</th>
                          <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {Array.isArray(zone.records) && zone.records.length > 0 ? (
                          zone.records
                            .filter(record => selectedTypes.length === 0 || selectedTypes.includes(record.record_type))
                            .sort((a, b) => {
                              // Sort by record type first
                              const typeOrder = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
                              const typeA = typeOrder.indexOf(a.record_type);
                              const typeB = typeOrder.indexOf(b.record_type);
                              if (typeA !== typeB) return typeA - typeB;
                              
                              // Then sort by name
                              const nameA = a.name || '@';
                              const nameB = b.name || '@';
                              return nameA.localeCompare(nameB);
                            })
                            .map((record) => (
                              <tr key={record.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-[var(--primary-text)]">{record.name || '@'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium space-x-1 ${getRecordTypeColor(record.record_type)}`}>
                                    {getRecordTypeIcon(record.record_type)}
                                    <span>{record.record_type}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <code className="text-sm text-[var(--primary-text)] font-mono bg-[var(--border-color)]/20 px-2 py-0.5 rounded">
                                      {record.content}
                                    </code>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(record.content);
                                        // TODO: Show copy success toast
                                      }}
                                      className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                                    >
                                      <DocumentDuplicateIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--border-color)] text-[var(--secondary-text)]">
                                    {record.ttl}s
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {record.priority ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                                      {record.priority}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--secondary-text)]">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => {
                                        setSelectedRecord(record);
                                        setRecordFormData({
                                          ...record,
                                          name: record.name || '',
                                        });
                                        setShowRecordForm(true);
                                      }}
                                      className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                                    >
                                      <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(zone.id, record.id)}
                                      className="text-[var(--danger-color)] hover:text-[var(--danger-color)]/80 transition-colors"
                                    >
                                      <TrashIcon className="w-5 h-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-[var(--secondary-text)]">
                              No DNS records found. Click "Add Record" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--secondary-text)]">
            {searchTerm || selectedTypes.length > 0 ? (
              <div>
                <p className="mb-2">No DNS zones or records match your search criteria.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTypes([]);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div>
                <p className="mb-2">No DNS zones found. Click "Add Zone" to create one.</p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => setShowZoneForm(true)}
                >
                  Add Zone
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone Form Modal */}
      {showZoneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">Add New DNS Zone</h2>
            <form onSubmit={handleCreateZone}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={zoneFormData.domain_name}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, domain_name: e.target.value })}
                    className="input-field"
                    placeholder="example.com"
                  required
                />
              </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Nameserver IP
                </label>
                <input
                  type="text"
                  value={zoneFormData.nameserver_ip}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, nameserver_ip: e.target.value })}
                    className="input-field"
                    placeholder="127.0.0.1"
                  required
                />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowZoneForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Form Modal */}
      {showRecordForm && selectedZone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">Add New DNS Record</h2>
            <form onSubmit={handleCreateRecord}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={recordFormData.name}
                  onChange={(e) => setRecordFormData({ ...recordFormData, name: e.target.value })}
                    className="input-field"
                    placeholder="@"
                  required
                />
              </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Record Type
                </label>
                <select
                  value={recordFormData.record_type}
                  onChange={(e) => setRecordFormData({ ...recordFormData, record_type: e.target.value })}
                    className="input-field"
                  required
                >
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                </select>
              </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Content
                </label>
                <input
                  type="text"
                  value={recordFormData.content}
                  onChange={(e) => setRecordFormData({ ...recordFormData, content: e.target.value })}
                    className="input-field"
                    placeholder="192.168.1.1"
                  required
                />
              </div>
              {recordFormData.record_type === 'MX' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={recordFormData.priority || ''}
                    onChange={(e) => setRecordFormData({ ...recordFormData, priority: parseInt(e.target.value) })}
                      className="input-field"
                      placeholder="10"
                    required
                  />
                </div>
              )}
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowRecordForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default DNSManagement; 