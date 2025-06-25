import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  CogIcon, 
  ExternalLinkIcon,
  ServerIcon,
  DatabaseIcon,
  GlobeAltIcon,
  RefreshIcon
} from '@heroicons/react/outline';

const RoundcubeManager = () => {
  const [status, setStatus] = useState(null);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Configuration form
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    db_host: 'localhost',
    db_name: 'roundcube',
    db_user: 'roundcube',
    db_password: ''
  });

  useEffect(() => {
    checkRoundcubeStatus();
    fetchWebmailDomains();
  }, []);

  const checkRoundcubeStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/roundcube/status');
      setStatus(response.data.data);
    } catch (err) {
      setError('ไม่สามารถตรวจสอบสถานะ Roundcube ได้');
      console.error('Error checking Roundcube status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebmailDomains = async () => {
    try {
      const response = await axios.get('/api/roundcube/domains');
      setDomains(response.data.data);
    } catch (err) {
      console.error('Error fetching webmail domains:', err);
    }
  };

  const configureRoundcube = async () => {
    try {
      setConfiguring(true);
      const response = await axios.post('/api/roundcube/configure', configForm);
      
      if (response.data.success) {
        setSuccess('กำหนดค่า Roundcube สำเร็จ');
        setShowConfigModal(false);
        checkRoundcubeStatus();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถกำหนดค่า Roundcube ได้');
    } finally {
      setConfiguring(false);
    }
  };

  const testConnection = async (domain = null) => {
    try {
      setTesting(true);
      const response = await axios.post('/api/roundcube/test-connection', { domain });
      
      if (response.data.success) {
        setSuccess('ทดสอบการเชื่อมต่อ Roundcube สำเร็จ');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'การทดสอบการเชื่อมต่อล้มเหลว');
    } finally {
      setTesting(false);
    }
  };

  const configureDomainWebmail = async (domain) => {
    try {
      const response = await axios.post('/api/roundcube/configure-domain', { domain });
      
      if (response.data.success) {
        setSuccess(`กำหนดค่า Webmail สำหรับโดเมน ${domain} สำเร็จ`);
        fetchWebmailDomains();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถกำหนดค่า Webmail สำหรับโดเมนได้');
    }
  };

  const openWebmail = async (domain, email = null) => {
    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (domain) params.append('domain', domain);
      
      const response = await axios.get(`/api/roundcube/webmail-url?${params.toString()}`);
      
      if (response.data.success) {
        const url = Array.isArray(response.data.data.url) 
          ? response.data.data.url[0] 
          : response.data.data.url;
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error getting webmail URL:', error);
      // Fallback
      window.open('/roundcube', '_blank');
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-500';
    if (status.installed && status.configured) return 'text-green-600';
    if (status.installed) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status) => {
    if (!status) return React.createElement(ServerIcon, { className: "w-6 h-6 text-gray-400" });
    if (status.installed && status.configured) return React.createElement(CheckCircleIcon, { className: "w-6 h-6 text-green-600" });
    if (status.installed) return React.createElement(CogIcon, { className: "w-6 h-6 text-yellow-600" });
    return React.createElement(XCircleIcon, { className: "w-6 h-6 text-red-600" });
  };

  const getStatusText = (status) => {
    if (!status) return 'กำลังตรวจสอบ...';
    if (status.installed && status.configured) return 'พร้อมใช้งาน';
    if (status.installed) return 'ต้องกำหนดค่า';
    return 'ไม่ได้ติดตั้ง';
  };

  if (loading) {
    return (
      React.createElement('div', { className: "flex items-center justify-center h-64" },
        React.createElement('div', { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" })
      )
    );
  }

  return (
    React.createElement('div', { className: "p-6 max-w-7xl mx-auto" },
      // Header
      React.createElement('div', { className: "flex justify-between items-center mb-6" },
        React.createElement('h1', { className: "text-3xl font-bold text-gray-900" }, 'จัดการ Roundcube Webmail'),
        React.createElement('div', { className: "flex space-x-3" },
          React.createElement('button', {
            onClick: checkRoundcubeStatus,
            className: "bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          },
            React.createElement(RefreshIcon, { className: "w-5 h-5 mr-2" }),
            'รีเฟรช'
          ),
          status && !status.configured && React.createElement('button', {
            onClick: () => setShowConfigModal(true),
            className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          },
            React.createElement(CogIcon, { className: "w-5 h-5 mr-2" }),
            'กำหนดค่า'
          )
        )
      ),

      // Error/Success Messages
      error && React.createElement('div', { className: "mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center" },
        React.createElement(XCircleIcon, { className: "w-5 h-5 mr-2" }),
        error,
        React.createElement('button', { 
          onClick: () => setError(null), 
          className: "ml-auto text-red-500 hover:text-red-700" 
        }, '×')
      ),

      success && React.createElement('div', { className: "mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center" },
        React.createElement(CheckCircleIcon, { className: "w-5 h-5 mr-2" }),
        success,
        React.createElement('button', { 
          onClick: () => setSuccess(null), 
          className: "ml-auto text-green-500 hover:text-green-700" 
        }, '×')
      ),

      // Status Card
      React.createElement('div', { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6" },
        React.createElement('div', { className: "flex items-center justify-between" },
          React.createElement('div', { className: "flex items-center" },
            getStatusIcon(status),
            React.createElement('div', { className: "ml-4" },
              React.createElement('h2', { className: "text-xl font-semibold text-gray-900" }, 'สถานะ Roundcube'),
              React.createElement('p', { className: `text-sm ${getStatusColor(status)}` }, getStatusText(status))
            )
          ),
          React.createElement('div', { className: "text-right" },
            status && React.createElement('div', { className: "text-sm text-gray-500" },
              React.createElement('p', null, `เวอร์ชัน: ${status.version || 'ไม่ทราบ'}`),
              status.path && React.createElement('p', null, `ตำแหน่ง: ${status.path}`)
            )
          )
        ),

        status && status.installed && status.configured && React.createElement('div', { className: "mt-4 flex space-x-3" },
          React.createElement('button', {
            onClick: () => openWebmail(),
            className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          },
            React.createElement(ExternalLinkIcon, { className: "w-5 h-5 mr-2" }),
            'เปิด Webmail'
          ),
          React.createElement('button', {
            onClick: () => testConnection(),
            disabled: testing,
            className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors disabled:opacity-50"
          },
            React.createElement(ServerIcon, { className: "w-5 h-5 mr-2" }),
            testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'
          )
        )
      ),

      // Domains List
      domains.length > 0 && React.createElement('div', { className: "bg-white rounded-lg shadow-sm border border-gray-200" },
        React.createElement('div', { className: "px-6 py-4 border-b border-gray-200" },
          React.createElement('h2', { className: "text-xl font-semibold text-gray-900" }, 'โดเมนที่มี Webmail'),
          React.createElement('p', { className: "text-sm text-gray-500" }, 'รายการโดเมนทั้งหมดที่สามารถใช้งาน Webmail ได้')
        ),
        React.createElement('div', { className: "p-6" },
          React.createElement('div', { className: "grid gap-4" },
            domains.map((domain) =>
              React.createElement('div', { 
                key: domain.id, 
                className: "border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" 
              },
                React.createElement('div', { className: "flex justify-between items-center" },
                  React.createElement('div', { className: "flex items-center" },
                    React.createElement(GlobeAltIcon, { className: "w-6 h-6 text-blue-500 mr-3" }),
                    React.createElement('div', null,
                      React.createElement('h3', { className: "text-lg font-medium text-gray-900" }, domain.domain),
                      React.createElement('p', { className: "text-sm text-gray-500" }, 
                        `${domain.email_accounts} บัญชีอีเมล | สถานะ: ${domain.status}`
                      )
                    )
                  ),
                  React.createElement('div', { className: "flex space-x-2" },
                    React.createElement('button', {
                      onClick: () => configureDomainWebmail(domain.domain),
                      className: "bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-2 rounded-lg flex items-center transition-colors",
                      title: "กำหนดค่า Webmail สำหรับโดเมน"
                    },
                      React.createElement(CogIcon, { className: "w-4 h-4 mr-1" }),
                      'กำหนดค่า'
                    ),
                    React.createElement('button', {
                      onClick: () => openWebmail(domain.domain),
                      className: "bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg flex items-center transition-colors",
                      title: "เปิด Webmail"
                    },
                      React.createElement(ExternalLinkIcon, { className: "w-4 h-4 mr-1" }),
                      'เปิด Webmail'
                    )
                  )
                )
              )
            )
          )
        )
      ),

      // Configuration Modal
      showConfigModal && React.createElement('div', { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto" },
        React.createElement('div', { className: "min-h-full flex items-center justify-center p-4" },
        React.createElement('div', { className: "bg-white rounded-lg p-6 w-full max-w-md" },
          React.createElement('h3', { className: "text-lg font-semibold mb-4" }, 'กำหนดค่า Roundcube'),
          
          React.createElement('div', { className: "space-y-4" },
            React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Database Host'),
              React.createElement('input', {
                type: "text",
                value: configForm.db_host,
                onChange: (e) => setConfigForm({...configForm, db_host: e.target.value}),
                className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                placeholder: "localhost"
              })
            ),
            
            React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Database Name'),
              React.createElement('input', {
                type: "text",
                value: configForm.db_name,
                onChange: (e) => setConfigForm({...configForm, db_name: e.target.value}),
                className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                placeholder: "roundcube"
              })
            ),
            
            React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Database User'),
              React.createElement('input', {
                type: "text",
                value: configForm.db_user,
                onChange: (e) => setConfigForm({...configForm, db_user: e.target.value}),
                className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                placeholder: "roundcube"
              })
            ),
            
            React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Database Password'),
              React.createElement('input', {
                type: "password",
                value: configForm.db_password,
                onChange: (e) => setConfigForm({...configForm, db_password: e.target.value}),
                className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                placeholder: "ปล่อยว่างเพื่อสร้างรหัสผ่านอัตโนมัติ"
              })
            )
          ),
          
          React.createElement('div', { className: "flex justify-end space-x-3 mt-6" },
            React.createElement('button', {
              onClick: () => setShowConfigModal(false),
              className: "px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            }, 'ยกเลิก'),
            React.createElement('button', {
              onClick: configureRoundcube,
              disabled: configuring,
              className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            }, configuring ? 'กำลังกำหนดค่า...' : 'กำหนดค่า')
          )
        )
      )
    )
  );
};

export default RoundcubeManager; 