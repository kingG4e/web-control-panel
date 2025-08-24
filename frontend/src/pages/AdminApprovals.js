import React, { useEffect, useMemo, useState } from 'react';
import { signup } from '../services/api';
import BaseModal, { ModalSection, ModalSectionTitle, ModalButton } from '../components/modals/BaseModal';

// Minimal transition styles - only what's needed
const transitionStyles = `
  .smooth-transition {
    transition: all 0.2s ease;
  }
`;

// Inject minimal styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = transitionStyles;
  document.head.appendChild(styleElement);
}

const AdminApprovals = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [processingIds, setProcessingIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const rejectTarget = useMemo(() => items.find((i) => i.id === rejectTargetId) || null, [items, rejectTargetId]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await signup.list(filter);
      setItems(data.data || []);
      setExpanded({});
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { 
    const loadWithTransition = async () => {
      setIsTransitioning(true);
      await new Promise(resolve => setTimeout(resolve, 150)); // Small delay for smooth transition
      await load();
      setIsTransitioning(false);
    };
    loadWithTransition();
  }, [filter]);

  const onApprove = async (id) => {
    setProcessingIds((prev) => new Set([...prev, id]));
    try {
      await signup.approve(id);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to approve');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const openRejectModal = (id) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (rejectTargetId == null) return;
    const id = rejectTargetId;
    const comment = rejectReason.trim();
    setProcessingIds((prev) => new Set([...prev, id]));
    try {
      await signup.reject(id, comment);
      await load();
      setRejectModalOpen(false);
      setRejectTargetId(null);
      setRejectReason('');
    } catch (e) {
      setError(e.message || 'Failed to reject');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const filteredItems = useMemo(() => {
    if (!debouncedQuery) return items;
    return items.filter((r) => {
      const q = debouncedQuery;
      return (
        (r.username || '').toLowerCase().includes(q) ||
        (r.domain || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q)
      );
    });
  }, [items, debouncedQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredItems.length);
  const visibleItems = filteredItems.slice(startIdx, endIdx);


  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--primary-text)' }}>
            Signup Approvals
          </h1>
          <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
            Review and approve system access requests
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--secondary-bg)] p-0.5">
                {['pending','approved','rejected'].map((key) => {
                  const labelMap = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
                  const active = filter === key;
                  return (
                    <button
                      key={key}
                      aria-pressed={active}
                      onClick={() => { setFilter(key); setPage(1); }}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors duration-200
                        ${active
                          ? 'bg-[var(--card-bg)] text-[var(--primary-text)] border border-[var(--border-color)] shadow-sm'
                          : 'text-[var(--secondary-text)] hover:text-[var(--primary-text)]'}
                        ${isTransitioning && active ? 'opacity-70' : ''}
                      `}
                    >
                      {labelMap[key]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search user, domain, or email"
                  className="px-3 py-2 rounded-lg border bg-[var(--input-bg)] text-[var(--primary-text)] border-[var(--border-color)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/30 focus:border-[var(--accent-color)] placeholder:text-[var(--secondary-text)]"
                />
                <select 
                  value={pageSize} 
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-3 py-2 rounded-lg border bg-[var(--input-bg)] text-[var(--primary-text)] border-[var(--border-color)] text-sm
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/30 focus:border-[var(--accent-color)]"
                >
                  <option value={10}>10/page</option>
                  <option value={20}>20/page</option>
                  <option value={50}>50/page</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={load}
                  className="px-3 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/30"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-6 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-between">
              <span className="text-sm">{String(error)}</span>
              <button 
                onClick={load} 
                className="px-3 py-1.5 text-xs rounded border border-red-300 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}


          {loading || isTransitioning ? (
            <div className="space-y-6" style={{ opacity: isTransitioning ? 0.5 : 1 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-[var(--secondary-bg)] rounded" />
                      <div>
                        <div className="h-4 w-48 bg-[var(--secondary-bg)] rounded" />
                        <div className="mt-2 h-3 w-64 bg-[var(--secondary-bg)] rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-24 bg-[var(--secondary-bg)] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 transition-opacity duration-300" style={{ opacity: isTransitioning ? 0.5 : 1 }}>
              <div className="flex items-center justify-between text-xs text-[var(--secondary-text)] pb-3">
                <div className="flex items-center gap-2" />
                <div>
                  Showing {filteredItems.length === 0 ? 0 : startIdx + 1}-{endIdx} of {filteredItems.length}
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-1">
              {visibleItems.map((r, index) => (
                <div 
                  key={r.id} 
                  className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 hover:border-[var(--accent-color)]/30 transition-colors duration-200 mb-4"
                  style={{
                    opacity: isTransitioning ? 0.5 : 1,
                    transition: 'opacity 0.3s ease, border-color 0.2s ease'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0
                        ${r.status === 'pending' ? 'bg-yellow-500' : ''}
                        ${r.status === 'approved' ? 'bg-green-500' : ''}
                        ${r.status === 'rejected' ? 'bg-red-500' : ''}
                      `}></div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-[var(--primary-text)]">{r.username}</h3>
                          <span className="text-[var(--secondary-text)]">•</span>
                          <span className="font-medium text-[var(--primary-text)]">{r.domain || 'No domain'}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-[var(--secondary-text)] mt-1">
                          {r.full_name && (
                            <span>{r.full_name}</span>
                          )}
                          <span>{r.email || 'No email'}</span>
                          {(r.want_ssl || r.want_dns || r.want_email || r.want_mysql) && (
                            <div className="flex space-x-1">
                              {r.want_ssl && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="SSL"></span>}
                              {r.want_dns && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="DNS"></span>}
                              {r.want_email && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Email"></span>}
                              {r.want_mysql && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="MySQL"></span>}
                            </div>
                          )}
                          {r.storage_quota_mb && (
                            <span>{r.storage_quota_mb} MB</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {r.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button 
                            className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500/30" 
                            onClick={() => onApprove(r.id)}
                            disabled={processingIds.has(r.id) || loading}
                          >
                            {processingIds.has(r.id) ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Approving…
                              </span>
                            ) : (
                              'Approve'
                            )}
                          </button>
                          <button 
                            className="px-3 py-1.5 text-xs border border-red-500 text-red-500 rounded hover:bg-red-500/10 transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                            onClick={() => openRejectModal(r.id)}
                            disabled={processingIds.has(r.id) || loading}
                          >
                            {processingIds.has(r.id) ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Rejecting…
                              </span>
                            ) : (
                              'Reject'
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-medium transition-colors duration-200
                          ${r.status === 'approved' ? 'text-green-600 bg-green-100' : ''}
                          ${r.status === 'rejected' ? 'text-red-600 bg-red-100' : ''}
                        `}>
                          {r.status === 'approved' && 'Approved'}
                          {r.status === 'rejected' && 'Rejected'}
                        </span>
                      )}
                      <button 
                        onClick={() => toggleExpand(r.id)} 
                        className="px-2 py-1 text-xs text-[var(--secondary-text)] hover:text-[var(--primary-text)] inline-flex items-center gap-1 focus:outline-none transition-colors duration-200"
                      >
                        <span>{expanded[r.id] ? 'Hide details' : 'Show details'}</span>
                        <svg 
                          aria-hidden="true" 
                          viewBox="0 0 20 20" 
                          className={`w-3 h-3 transition-transform duration-200 ${expanded[r.id] ? 'rotate-180' : ''}`}
                        >
                          <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18Z" />
                        </svg>
                      </button>
                    </div>
                </div>

                  {expanded[r.id] && (
                    <div className="mt-3 border-t border-[var(--border-color)] pt-3 transition-opacity duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="p-3 bg-[var(--secondary-bg)] rounded">
                          <div className="text-[var(--secondary-text)] text-xs mb-1">Username</div>
                          <div className="text-[var(--primary-text)] break-all">{r.username || '-'}</div>
                        </div>
                        <div className="p-3 bg-[var(--secondary-bg)] rounded">
                          <div className="text-[var(--secondary-text)] text-xs mb-1">Full Name</div>
                          <div className="text-[var(--primary-text)] break-all">{r.full_name || '-'}</div>
                        </div>
                        <div className="p-3 bg-[var(--secondary-bg)] rounded">
                          <div className="text-[var(--secondary-text)] text-xs mb-1">Domain</div>
                          <div className="text-[var(--primary-text)] break-all">{r.domain || '-'}</div>
                        </div>
                        <div className="p-3 bg-[var(--secondary-bg)] rounded">
                          <div className="text-[var(--secondary-text)] text-xs mb-1">Services</div>
                          <div className="text-[var(--primary-text)]">{['SSL','DNS Zone','Email','MySQL'].filter((label, i) => [r.want_ssl, r.want_dns, r.want_email, r.want_mysql][i]).join(', ') || '-'}</div>
                        </div>
                        <div className="p-3 bg-[var(--secondary-bg)] rounded">
                          <div className="text-[var(--secondary-text)] text-xs mb-1">Storage</div>
                          <div className="text-[var(--primary-text)]">{r.storage_quota_mb ? `${r.storage_quota_mb} MB` : '-'}</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-[var(--secondary-text)] mb-2">Timeline</div>
                        <ol className="text-xs space-y-1 text-[var(--primary-text)]">
                          <li>Submitted: {r.created_at ? new Date(r.created_at).toLocaleString('en-US') : '-'}</li>
                          {r.approved_at && (
                            <li>Processed: {new Date(r.approved_at).toLocaleString('en-US')}</li>
                          )}
                        </ol>
                      </div>
                      {r.admin_comment && (
                        <div className="mt-3 p-2 bg-[var(--secondary-bg)] rounded text-xs">
                          <span className="text-[var(--secondary-text)]">Note: </span>
                          <span className="text-[var(--primary-text)]">{r.admin_comment}</span>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="p-12 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-[var(--secondary-text)] text-center">
                  No items match your filters.
                </div>
              )}

              {filteredItems.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <button
                    className="px-3 py-1.5 text-xs border border-[var(--border-color)] rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <div className="text-xs text-[var(--secondary-text)]">Page {page} of {pageCount}</div>
                  <button
                    className="px-3 py-1.5 text-xs border border-[var(--border-color)] rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Reject Modal */}
      <BaseModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject request"
        maxWidth="max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <ModalButton
              variant="secondary"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={confirmReject}
              disabled={processingIds.has(rejectTargetId) || loading}
            >
              {processingIds.has(rejectTargetId) ? 'Rejecting…' : 'Confirm reject'}
            </ModalButton>
          </div>
        )}
      >
        <ModalSection>
          <div className="space-y-3">
            {rejectTarget && (
              <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                Rejecting <span className="font-medium" style={{ color: 'var(--primary-text)' }}>{rejectTarget.username}</span>
                {rejectTarget.domain && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="font-medium" style={{ color: 'var(--primary-text)' }}>{rejectTarget.domain}</span>
                  </>
                )}
              </div>
            )}
            <label className="block text-sm mb-1" style={{ color: 'var(--secondary-text)' }}>
              Reason (optional)
            </label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Add a note for the requester..."
              className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] text-[var(--primary-text)] border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/30 focus:border-[var(--accent-color)]"
            />
          </div>
        </ModalSection>
      </BaseModal>
    </div>
  );
};

export default AdminApprovals;