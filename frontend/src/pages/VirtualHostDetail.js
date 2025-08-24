import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { virtualHosts } from '../services/api';

const VirtualHostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await virtualHosts.get(id);
        setHost(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load virtual host');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const actions = useMemo(() => (
    <>
      <Button variant="secondary" onClick={() => navigate('/virtual-hosts')}>Back</Button>
      {host && (
        <Button onClick={() => navigate(`/virtual-hosts/${host.id}/edit`)}>Edit</Button>
      )}
    </>
  ), [host, navigate]);

  return (
    <PageLayout title="Virtual Host Detail" description="รายละเอียดของ Virtual Host" actions={actions}>
      {loading && (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="xl" />
        </div>
      )}
      {error && !loading && (
        <ErrorAlert message={error} />
      )}
      {!loading && !error && host && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">Domain</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.domain}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">Document Root</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.document_root}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">Linux Username</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.linux_username}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">Server Admin</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.server_admin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">PHP Version</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.php_version || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">Status</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.status}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">Created At</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.created_at}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--secondary-text)]">Updated At</p>
                  <p className="text-[var(--primary-text)] font-medium">{host.updated_at}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-text)' }}>Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => window.open(`http://${host.domain}`, '_blank')}>Open Site</Button>
                <Button variant="secondary" onClick={() => navigate(`/ssl?domain=${encodeURIComponent(host.domain)}`)}>SSL Settings</Button>
                <Button variant="secondary" onClick={() => navigate(`/files?domain=${encodeURIComponent(host.domain)}`)}>Open File Manager</Button>
                <Button variant="secondary" onClick={() => navigate(`/dns?domain=${encodeURIComponent(host.domain)}`)}>DNS Records</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default VirtualHostDetail;


