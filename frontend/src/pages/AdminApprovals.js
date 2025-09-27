import React, { useEffect, useMemo, useState } from 'react';
import { signup } from '../services/api';
import BaseModal, { ModalSection, ModalButton } from '../components/modals/BaseModal';
import { FaSync, FaSearch, FaCheck, FaTimes, FaSpinner, FaChevronDown, FaEdit } from 'react-icons/fa';
import { CgSpinner } from 'react-icons/cg';

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editFormData, setEditFormData] = useState({});

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
      await new Promise(resolve => setTimeout(resolve, 150));
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

  const openEditModal = (item) => {
    setEditTarget(item);
    setEditFormData({
      username: item.username,
      email: item.email,
      domain: item.domain,
      full_name: item.full_name,
      storage_quota_mb: item.storage_quota_mb,
      options: {
          want_ssl: item.want_ssl,
          want_dns: item.want_dns,
          want_email: item.want_email,
          want_mysql: item.want_mysql
      }
    });
    setEditModalOpen(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('options.')) {
        const optionName = name.split('.')[1];
        setEditFormData(prev => ({
            ...prev,
            options: { ...prev.options, [optionName]: checked }
        }));
    } else {
        setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    setProcessingIds(prev => new Set([...prev, editTarget.id]));
    try {
        const { data } = await signup.update(editTarget.id, editFormData);
        // Update item in local state to reflect changes immediately
        setItems(prevItems => prevItems.map(item => item.id === data.id ? data : item));
        setEditModalOpen(false);
        setEditTarget(null);
    } catch (e) {
        setError(e.message || 'Failed to update request');
    } finally {
        setProcessingIds(prev => {
            const next = new Set(prev);
            next.delete(editTarget.id);
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

  const StatusBadge = ({ status }) => {
    const statusClasses = {
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-error',
    };
    return <span className={`badge ${statusClasses[status] || ''}`}>{status}</span>;
  };

  return (
    <div className="bg-[var(--primary-bg)] text-[var(--primary-text)] p-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 text-[var(--primary-text)]">Signup Approvals</h1>
        <p className="text-sm text-[var(--secondary-text)]">
          Review and process system access requests from new users.
        </p>
      </div>

      {/* Controls and Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--secondary-bg)] p-1">
            {['pending', 'approved', 'rejected'].map((key) => {
              const labelMap = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
              const active = filter === key;
              return (
                <button
                  key={key}
                  aria-pressed={active}
                  onClick={() => { setFilter(key); setPage(1); }}
                  className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--focus-border)] focus:ring-offset-2 focus:ring-offset-[var(--secondary-bg)]
                    ${active
                      ? 'bg-[var(--accent-color)] text-white shadow-sm'
                      : 'text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--primary-text)]'}
                  `}
                >
                  {labelMap[key]}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--tertiary-text)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search requests..."
                className="input-field pl-10 w-full"
              />
            </div>
            <button 
              onClick={load}
              className="btn-secondary flex items-center gap-2 px-3 py-2"
              disabled={loading}
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--danger-bg)] border border-[var(--error-border)] text-[var(--error-text)] px-4 py-3 rounded-lg flex items-center justify-between mb-6">
          <span>{String(error)}</span>
          <button onClick={load} className="btn-secondary border-[var(--error-border)] text-[var(--error-text)] hover:bg-[var(--error-bg)]">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-[var(--border-color)] rounded-full" />
                  <div>
                    <div className="h-4 w-48 bg-[var(--border-color)] rounded" />
                    <div className="mt-2 h-3 w-64 bg-[var(--border-color)] rounded" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-[var(--border-color)] rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* List */}
          <div className="space-y-4">
            {visibleItems.map((r) => (
              <div key={r.id} className="card p-0 overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--hover-bg)]"
                  onClick={() => toggleExpand(r.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-[var(--secondary-bg)]`}>
                        <span className="text-xl font-bold text-[var(--secondary-text)]">
                            {r.username ? r.username.charAt(0).toUpperCase() : '?'}
                        </span>
                    </div>
                    <div>
                      <div className="font-medium text-[var(--primary-text)]">{r.username || 'No Username'}</div>
                      <div className="text-sm text-[var(--secondary-text)]">{r.domain || 'No domain specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={r.status} />
                    <FaChevronDown className={`text-[var(--secondary-text)] transition-transform duration-300 ${expanded[r.id] ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {expanded[r.id] && (
                  <div className="border-t border-[var(--border-color)] p-4 bg-[var(--secondary-bg)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div><strong className="text-[var(--secondary-text)]">Full Name:</strong> {r.full_name || '-'}</div>
                      <div><strong className="text-[var(--secondary-text)]">Email:</strong> {r.email || '-'}</div>
                      <div><strong className="text-[var(--secondary-text)]">Storage:</strong> {r.storage_quota_mb ? `${r.storage_quota_mb} MB` : '-'}</div>
                      <div><strong className="text-[var(--secondary-text)]">Services:</strong> {['SSL','DNS','Email','MySQL'].filter((_, i) => [r.want_ssl, r.want_dns, r.want_email, r.want_mysql][i]).join(', ') || 'None'}</div>
                      <div><strong className="text-[var(--secondary-text)]">Submitted:</strong> {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</div>
                       {r.approved_at && (
                        <div><strong className="text-[var(--secondary-text)]">Processed:</strong> {new Date(r.approved_at).toLocaleString()}</div>
                      )}
                    </div>
                    {r.admin_comment && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                        <strong className="text-[var(--secondary-text)]">Note:</strong> {r.admin_comment}
                      </div>
                    )}
                    {r.status === 'pending' && (
                       <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-end gap-3">
                          <button 
                            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-transparent border border-[var(--secondary-text)] text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] transition-colors duration-200"
                            onClick={(e) => { e.stopPropagation(); openEditModal(r); }}
                            disabled={processingIds.has(r.id)}
                           >
                              <FaEdit /> Edit
                           </button>
                          <button 
                            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-transparent border border-[var(--danger-color)] text-[var(--danger-color)] hover:bg-[var(--danger-bg)] transition-colors duration-200" 
                            onClick={(e) => { e.stopPropagation(); openRejectModal(r.id); }}
                            disabled={processingIds.has(r.id)}
                          >
                             <FaTimes /> Reject
                          </button>
                           <button 
                            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[var(--success-color)] text-white hover:opacity-90 transition-opacity duration-200"
                            onClick={(e) => { e.stopPropagation(); onApprove(r.id); }}
                            disabled={processingIds.has(r.id)}
                          >
                            {processingIds.has(r.id) ? (
                              <>
                                <CgSpinner className="animate-spin" /> Approving...
                              </>
                            ) : (
                               <><FaCheck/> Approve</>
                            )}
                          </button>
                       </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-[var(--secondary-text)]">No items match your filters.</p>
            </div>
          )}

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between pt-6 text-sm">
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <div className="text-[var(--secondary-text)]">Page {page} of {pageCount}</div>
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Reject Modal */}
      <BaseModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Request"
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
              disabled={processingIds.has(rejectTargetId)}
            >
              {processingIds.has(rejectTargetId) ? 'Rejecting…' : 'Confirm Reject'}
            </ModalButton>
          </div>
        )}
      >
        <ModalSection>
          <div className="space-y-4">
            {rejectTarget && (
              <div className="text-sm text-[var(--secondary-text)]">
                You are about to reject <strong className="text-[var(--primary-text)]">{rejectTarget.username}</strong>'s request.
              </div>
            )}
            <div>
              <label htmlFor="rejectReason" className="block text-sm mb-2 text-[var(--secondary-text)]">
                Reason (optional)
              </label>
              <textarea
                id="rejectReason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for the rejection..."
                className="input-field w-full"
              />
            </div>
          </div>
        </ModalSection>
      </BaseModal>

      {/* Edit Modal */}
      <BaseModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Request"
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-2">
            <ModalButton variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </ModalButton>
            <ModalButton variant="primary" onClick={confirmEdit} disabled={processingIds.has(editTarget?.id)}>
              {processingIds.has(editTarget?.id) ? 'Saving...' : 'Save Changes'}
            </ModalButton>
          </div>
        )}
      >
        <ModalSection>
            {editTarget && (
                 <form onSubmit={confirmEdit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Username" name="username" value={editFormData.username} onChange={handleEditFormChange} />
                        <InputField label="Domain" name="domain" value={editFormData.domain} onChange={handleEditFormChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Full Name" name="full_name" value={editFormData.full_name} onChange={handleEditFormChange} />
                        <InputField label="Email" name="email" value={editFormData.email} onChange={handleEditFormChange} type="email" />
                    </div>
                    <InputField label="Storage Quota (MB)" name="storage_quota_mb" value={editFormData.storage_quota_mb} onChange={handleEditFormChange} type="number" />
                    <div className="pt-2">
                        <label className="block text-sm mb-2 text-[var(--secondary-text)]">Requested Services</label>
                        <div className="grid grid-cols-2 gap-2">
                            <CheckboxField label="SSL" name="options.want_ssl" checked={editFormData.options?.want_ssl} onChange={handleEditFormChange} />
                            <CheckboxField label="DNS" name="options.want_dns" checked={editFormData.options?.want_dns} onChange={handleEditFormChange} />
                            <CheckboxField label="Email" name="options.want_email" checked={editFormData.options?.want_email} onChange={handleEditFormChange} />
                            <CheckboxField label="MySQL" name="options.want_mysql" checked={editFormData.options?.want_mysql} onChange={handleEditFormChange} />
                        </div>
                    </div>
                 </form>
            )}
        </ModalSection>
      </BaseModal>
    </div>
  );
};

const InputField = ({ label, name, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm mb-2 text-[var(--secondary-text)]">{label}</label>
        <input id={name} name={name} {...props} className="input-field w-full" />
    </div>
);

const CheckboxField = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-[var(--hover-bg)] cursor-pointer">
        <input
            type="checkbox"
            name={name}
            checked={!!checked}
            onChange={onChange}
            className="form-checkbox h-5 w-5 text-[var(--accent-color)] bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-[var(--focus-border)]"
        />
        <span className="text-[var(--primary-text)]">{label}</span>
    </label>
);

export default AdminApprovals;