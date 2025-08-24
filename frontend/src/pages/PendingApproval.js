import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signup } from '../services/api';
import { Link } from 'react-router-dom';

const PendingApproval = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (user?.username) {
        try {
          const result = await signup.status(user.username);
          setStatus(result.data);
        } catch (e) {
          console.error('Failed to check status:', e);
        }
      }
      setLoading(false);
    };
    checkStatus();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
          <div className="text-center mb-6">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center
              ${status?.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'}
            `}>
              <div className={`w-6 h-6 rounded-full
                ${status?.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'}
              `}></div>
            </div>
            <h2 className="text-xl font-semibold text-[var(--primary-text)] mb-1">Account Status</h2>
            <p className="text-sm text-[var(--secondary-text)]">
              {status?.status === 'pending' && 'Waiting for admin approval'}
              {status?.status === 'approved' && 'Your account has been approved'}
              {status?.status === 'rejected' && 'Your request was rejected'}
              {!status && 'Loading your status...'}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-color)] mx-auto"></div>
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[var(--secondary-bg)] rounded">
                <span className="text-sm text-[var(--secondary-text)]">Username</span>
                <span className="font-medium text-[var(--primary-text)]">{user?.username}</span>
              </div>
              
              {status.domain && (
                <div className="flex items-center justify-between p-3 bg-[var(--secondary-bg)] rounded">
                  <span className="text-sm text-[var(--secondary-text)]">Domain</span>
                  <span className="font-medium text-[var(--primary-text)]">{status.domain}</span>
                </div>
              )}

              {(status.want_ssl || status.want_dns || status.want_email || status.want_mysql) && (
                <div className="p-3 bg-[var(--secondary-bg)] rounded">
                  <div className="text-sm text-[var(--secondary-text)] mb-2">Requested Services</div>
                  <div className="flex space-x-1">
                    {status.want_ssl && <span className="w-2 h-2 rounded-full bg-blue-500" title="SSL"></span>}
                    {status.want_dns && <span className="w-2 h-2 rounded-full bg-purple-500" title="DNS"></span>}
                    {status.want_email && <span className="w-2 h-2 rounded-full bg-green-500" title="Email"></span>}
                    {status.want_mysql && <span className="w-2 h-2 rounded-full bg-orange-500" title="MySQL"></span>}
                  </div>
                </div>
              )}

              {status.admin_comment && (
                <div className="p-3 bg-[var(--secondary-bg)] rounded">
                  <div className="text-sm text-[var(--secondary-text)] mb-1">Admin Notes</div>
                  <div className="text-sm text-[var(--primary-text)]">{status.admin_comment}</div>
                </div>
              )}

              {/* Expert details and timeline */}
              <div className="border-t border-[var(--border-color)] pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--secondary-text)]">Details & Timeline</div>
                  <button
                    onClick={() => setShowDetails((v) => !v)}
                    className="text-xs px-2 py-1 border border-[var(--border-color)] rounded hover:bg-[var(--hover-bg)]"
                  >
                    {showDetails ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showDetails && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="p-3 bg-[var(--secondary-bg)] rounded">
                        <div className="text-[var(--secondary-text)] text-xs mb-1">Domain</div>
                        <div className="text-[var(--primary-text)] break-all">{status.domain || '-'}</div>
                      </div>
                      <div className="p-3 bg-[var(--secondary-bg)] rounded">
                        <div className="text-[var(--secondary-text)] text-xs mb-1">Services</div>
                        <div className="text-[var(--primary-text)]">
                          {['SSL','DNS Zone','Email','MySQL'].filter((label, i) => [status.want_ssl, status.want_dns, status.want_email, status.want_mysql][i]).join(', ') || '-'}
                        </div>
                      </div>
                      <div className="p-3 bg-[var(--secondary-bg)] rounded">
                        <div className="text-[var(--secondary-text)] text-xs mb-1">Status</div>
                        <div className="text-[var(--primary-text)] capitalize">{status.status}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--secondary-text)] mb-2">Timeline</div>
                      <ol className="text-xs space-y-1 text-[var(--primary-text)]">
                        <li>Submitted: {status.created_at ? new Date(status.created_at).toLocaleString('en-US') : '-'}</li>
                        {status.approved_at && (
                          <li>Processed: {new Date(status.approved_at).toLocaleString('en-US')}</li>
                        )}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-[var(--secondary-text)]">
              No application data found
            </div>
          )}

          <div className="flex justify-center space-x-3 mt-6 pt-4 border-t border-[var(--border-color)]">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 text-sm bg-[var(--accent-color)] text-white rounded hover:bg-[var(--accent-color)]/90 transition-colors"
            >
              Refresh
            </button>
            <Link 
              to="/dashboard" 
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
