import React from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ServerIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  CircleStackIcon,
  FolderIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, formData, isLoading }) => {
  if (!isOpen) return null;

  const generatedUsername = formData.domain ? 
    formData.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 
    'example';

  const steps = [
    {
      icon: <ServerIcon className="w-5 h-5" />,
      title: "สร้าง Linux user + home directory",
      description: `สร้างผู้ใช้ ${generatedUsername} พร้อม home directory และ public_html`
    },
    {
      icon: <GlobeAltIcon className="w-5 h-5" />,
      title: "สร้าง Apache VirtualHost + DNS zone", 
      description: `กำหนดค่า Apache สำหรับ ${formData.domain} และสร้าง DNS records`
    },
    {
      icon: <EnvelopeIcon className="w-5 h-5" />,
      title: "สร้าง maildir + email mapping",
      description: `สร้าง email account admin@${formData.domain} พร้อม maildir structure`
    },
         {
       icon: <CircleStackIcon className="w-5 h-5" />,
       title: "สร้างฐานข้อมูล + user",
       description: "สร้าง MySQL database และ user สำหรับเว็บไซต์"
     },
    {
      icon: <FolderIcon className="w-5 h-5" />,
      title: "สร้าง FTP user",
      description: "สร้าง FTP/SFTP account สำหรับอัปโหลดไฟล์"
    }
  ];

  if (formData.create_ssl) {
    steps.push({
      icon: <LockClosedIcon className="w-5 h-5" />,
      title: "ขอ SSL certificate",
      description: "ออกใบรับรอง SSL สำหรับการเข้ารหัส HTTPS"
    });
  }

  steps.push({
    icon: <ServerIcon className="w-5 h-5" />,
    title: "บันทึกทั้งหมดในระบบ",
    description: "บันทึกข้อมูลทั้งหมดลงฐานข้อมูลและทำการตั้งค่าสุดท้าย"
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
           style={{ backgroundColor: 'var(--primary-bg)', borderColor: 'var(--border-color)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" 
             style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-500 mr-3" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--primary-text)' }}>
              ยืนยันการสร้าง Virtual Host
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" style={{ color: 'var(--secondary-text)' }} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Summary */}
          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
            <h3 className="font-semibold text-blue-800 mb-3">📋 สรุปการตั้งค่า</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
              <div><strong>Domain:</strong> {formData.domain}</div>
              <div><strong>Linux User:</strong> {generatedUsername}</div>
              <div><strong>Server Admin:</strong> {formData.server_admin || `admin@${formData.domain}`}</div>
              <div><strong>PHP Version:</strong> {formData.php_version}</div>
              <div><strong>SSL Certificate:</strong> {formData.create_ssl ? 'จะออกใบรับรอง' : 'ไม่ออกใบรับรอง'}</div>
            </div>
          </div>

          {/* Steps Process */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-text)' }}>
              🔄 ขั้นตอนที่จะดำเนินการ ({steps.length} ขั้นตอน)
            </h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} 
                     className="flex items-start p-3 rounded-lg border"
                     style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="text-blue-500 mr-3 mt-1">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: 'var(--primary-text)' }}>
                      {step.title}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
            <h4 className="font-semibold text-orange-800 mb-2">⚠️ คำเตือน</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• การสร้าง Virtual Host จะใช้เวลาสักครู่ กรุณารอจนกว่าจะเสร็จสิ้น</li>
              <li>• หากมีข้อผิดพลาด ระบบจะลบข้อมูลที่สร้างไปแล้วโดยอัตโนมัติ</li>
              <li>• โปรดตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ</li>
              {!formData.create_ssl && (
                <li>• คุณสามารถขอ SSL certificate ภายหลังได้ในหน้า SSL Management</li>
              )}
            </ul>
          </div>

          {/* Expected Results */}
          <div className="p-4 rounded-lg border border-green-200 bg-green-50">
            <h4 className="font-semibold text-green-800 mb-2">✅ ผลลัพธ์ที่คาดหวัง</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• เว็บไซต์ {formData.domain} พร้อมใช้งาน</li>
              <li>• Linux user account สำหรับจัดการไฟล์</li>
              <li>• Email account admin@{formData.domain}</li>
              <li>• MySQL database สำหรับเก็บข้อมูล</li>
              <li>• FTP/SFTP access สำหรับอัปโหลดไฟล์</li>
              {formData.create_ssl && <li>• SSL certificate สำหรับ HTTPS</li>}
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t space-x-3" 
             style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--secondary-text)' }}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                กำลังสร้าง...
              </div>
            ) : (
              <div className="flex items-center">
                <ServerIcon className="w-4 h-4 mr-2" />
                ยืนยันและสร้าง Virtual Host
              </div>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal; 