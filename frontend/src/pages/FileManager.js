import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FolderIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  InformationCircleIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  CheckIcon,
  ServerIcon,
  HomeIcon,
  FolderOpenIcon,
  CubeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { fileApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { loader } from '@monaco-editor/react';
import MonacoEditor from '@monaco-editor/react';
import ErrorBoundary from '../components/ErrorBoundary';

// Configure Monaco Editor loader to prevent CDN errors
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
  }
});

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const FileManager = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  // Global error state for the component
  const [globalError, setGlobalError] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [currentDomain, setCurrentDomain] = useState(searchParams.get('domain') || '');
  const [domains, setDomains] = useState([]);
  const [domainStructure, setDomainStructure] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showFileProperties, setShowFileProperties] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/']));
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const contextMenuRef = useRef(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [editorLoading, setEditorLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'size', 'modified', 'type'
  const [sortOrder, setSortOrder] = useState('asc');
  const [clipboardItem, setClipboardItem] = useState(null);
  const [clipboardAction, setClipboardAction] = useState(null); // 'copy' or 'cut'
  const dropZoneRef = useRef(null);



  // Memoize admin check
  const isAdminUser = useMemo(() => {
    return user?.role === 'admin' || user?.is_admin;
  }, [user]);

  // Memoize filtered and sorted files
  const filteredFiles = useMemo(() => {
    let filtered = files.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort files
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'size':
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case 'modified':
          aVal = new Date(a.modifiedAt);
          bVal = new Date(b.modifiedAt);
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        default: // name
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      // Folders first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      let result = 0;
      if (aVal < bVal) result = -1;
      if (aVal > bVal) result = 1;
      
      return sortOrder === 'desc' ? -result : result;
    });

    return filtered;
  }, [files, searchQuery, sortBy, sortOrder]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  // Load user domains on mount with caching
  const loadDomains = useCallback(async () => {
    try {
      const domainList = await fileApi.getUserDomains();
      setDomains(domainList);
      
      // Auto-select first domain for non-admins
      if (!isAdminUser && !currentDomain && domainList.length > 0) {
        setCurrentDomain(domainList[0].domain);
      }
    } catch (err) {
      console.error('Error loading domains:', err);
      setError('Failed to load domains');
    }
  }, [isAdminUser, currentDomain]);

  useEffect(() => {
    if (!authLoading) {
      loadDomains();
    }
  }, [authLoading, loadDomains]);

  // Load domain structure with caching
  const loadDomainStructure = useCallback(async () => {
    if (!currentDomain) {
      setDomainStructure(null);
      return;
    }
    
    try {
      const structure = await fileApi.getDomainStructure(currentDomain);
      setDomainStructure(structure);
    } catch (err) {
      console.error('Error loading domain structure:', err);
      setError(`Failed to load structure for domain: ${currentDomain}`);
    }
  }, [currentDomain]);

  useEffect(() => {
    loadDomainStructure();
  }, [loadDomainStructure]);

  // Update URL when domain changes
  useEffect(() => {
    if (!authLoading && !isAdminUser && currentDomain === '' && user) {
      if (domains.length > 0) {
        setCurrentDomain(domains[0].domain);
        return;
      }
    }
    
    if (currentDomain) {
      setSearchParams({ domain: currentDomain });
    } else {
      setSearchParams({});
    }
  }, [currentDomain, setSearchParams, user, domains, authLoading, isAdminUser]);

  // Optimized directory loading with caching
  const loadDirectory = useCallback(async (path) => {
    if (!isConnected) return;

    // Prevent non-admin users from querying system root before a domain is selected
    if (!isAdminUser && !currentDomain) {
      return;
    }
    
    const normalizedPath = path ? normalizePath(path) : '';
    
    try {
      setLoading(true);
      setError(null);
      setSelectedFiles(new Set());
      
      // Add timeout for the request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const response = await Promise.race([
        fileApi.listDirectory(normalizedPath || '/', currentDomain),
        timeoutPromise
      ]);
      
      // Handle different response formats
      let fileList = [];
      if (Array.isArray(response)) {
        fileList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        fileList = response.data;
      } else if (response?.success && Array.isArray(response.data)) {
        fileList = response.data;
      } else if (response?.files && Array.isArray(response.files)) {
        fileList = response.files;
      } else {
        console.error('Invalid response format:', response);
        setFiles([]);
        setError('Invalid response format from server');
        return;
      }
      
      // Validate file objects
      const validFiles = fileList.filter(file => 
        file && typeof file === 'object' && file.name
      );
      
      setFiles(validFiles);
      setError(null);
    } catch (err) {
      console.error('Error loading directory:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load directory';
      setError(errorMessage);
      setFiles([]);
      
      // Handle directory not found
      if (errorMessage.includes('not found') || errorMessage.includes('Directory not found')) {
        const pathParts = normalizedPath.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const parentPath = pathParts.slice(0, -1).join('/');
          setCurrentPath(parentPath);
        } else {
          setCurrentPath('');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isConnected, currentDomain, isAdminUser]);

  // Initial load
  useEffect(() => {
    if (isConnected) {
      loadDirectory(currentPath);
    }
  }, [currentPath, currentDomain, isConnected, loadDirectory]);

  // Check connection once
  useEffect(() => {
    const checkConnection = async () => {
      // Skip the check for non-admin users until a domain has been resolved
      if (!isAdminUser && !currentDomain) {
        return;
      }
      try {
        await fileApi.listDirectory('/', currentDomain);
        setIsConnected(true);
        setError(null);
        setGlobalError(null);
      } catch (err) {
        console.error('Connection check error:', err);
        setIsConnected(false);
        const errorMsg = 'Could not connect to the file server. Please check your connection.';
        setError(errorMsg);
        setGlobalError(errorMsg);
      }
    };

    checkConnection();
  }, [currentDomain, isAdminUser]);

  const handleDomainChange = (domain) => {
    // Prevent non-admin users from selecting system files
    if (!isAdminUser && domain === '') {
      return; // Do nothing, don't allow system file access
    }
    
    setCurrentDomain(domain);
    setCurrentPath(''); // Reset to root when switching domains
    setSelectedFile(null);
    setSelectedFiles(new Set());
  };

  // Domain Selector Component
  const DomainSelector = () => (
    <div className="flex items-center space-x-4 mb-6">
      <div className="flex items-center space-x-2">
        <ServerIcon className="w-5 h-5" style={{ color: 'var(--secondary-text)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--secondary-text)' }}>
          Domain:
        </span>
      </div>
      <select
        value={currentDomain}
        onChange={(e) => handleDomainChange(e.target.value)}
        className="px-3 py-2 rounded-md border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        style={{
          backgroundColor: 'var(--input-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--primary-text)'
        }}
      >
        {/* Show "All Files (System)" option only for admin users */}
        {isAdminUser && <option value="">All Files (System)</option>}
        
        {/* Show message if no admin and no domains */}
        {!isAdminUser && domains.length === 0 && (
          <option value="" disabled>No domains available</option>
        )}
        
        {domains.map(domain => (
          <option key={domain.id} value={domain.domain}>
            {domain.domain} ({domain.linux_username})
          </option>
        ))}
      </select>
      
      {currentDomain && domainStructure && (
        <div className="flex items-center space-x-2 text-sm px-3 py-1 rounded-md border"
             style={{ 
               backgroundColor: 'var(--secondary-bg)', 
               borderColor: 'var(--border-color)',
               color: 'var(--secondary-text)' 
             }}>
          <GlobeAltIcon className="w-4 h-4" />
          <span>/{domainStructure.linux_username}</span>
        </div>
      )}
    </div>
  );

  // Enhanced Breadcrumbs with domain context
  const Breadcrumbs = () => {
    const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];
    
    return (
      <nav className="flex items-center space-x-2 text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
        <button
          onClick={() => setCurrentPath('')}
          className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-opacity-20 transition-colors"
          style={{ 
            backgroundColor: !currentPath ? 'var(--accent-color)' : 'transparent',
            color: !currentPath ? 'white' : 'var(--secondary-text)'
          }}
        >
          <HomeIcon className="w-4 h-4" />
          <span>{currentDomain ? 'Home' : 'Root'}</span>
        </button>
        
        {pathParts.map((part, index) => {
          const partPath = pathParts.slice(0, index + 1).join('/');
          const isLast = index === pathParts.length - 1;
          
          return (
            <React.Fragment key={index}>
              <span>/</span>
              <button
                onClick={() => !isLast && setCurrentPath(partPath)}
                className={`px-2 py-1 rounded transition-colors ${
                  isLast 
                    ? 'font-medium' 
                    : 'hover:bg-opacity-20'
                }`}
                style={{ 
                  backgroundColor: isLast ? 'var(--accent-color)' : 'transparent',
                  color: isLast ? 'white' : 'var(--secondary-text)'
                }}
                disabled={isLast}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    );
  };

  // Quick access buttons for common directories
  const QuickAccessButtons = () => {
    if (!currentDomain || !domainStructure) return null;

    const quickDirs = [
      { name: 'public_html', icon: GlobeAltIcon, color: 'text-blue-500' },
      { name: 'logs', icon: DocumentTextIcon, color: 'text-yellow-500' },
      { name: 'mail', icon: DocumentIcon, color: 'text-green-500' },
      { name: 'cgi-bin', icon: CubeIcon, color: 'text-purple-500' }
    ];

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {quickDirs.map(({ name, icon: Icon, color }) => {
          const dirInfo = domainStructure.directories[name];
          if (!dirInfo?.exists) return null;

          return (
            <button
              key={name}
              onClick={() => setCurrentPath(name)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md border transition-colors hover:opacity-80 ${
                currentPath === name ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{
                backgroundColor: 'var(--secondary-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--primary-text)'
              }}
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-sm">{name}</span>
              {dirInfo.size && (
                <span className="text-xs px-1 py-0.5 rounded" style={{ 
                  backgroundColor: 'var(--tertiary-bg)', 
                  color: 'var(--secondary-text)' 
                }}>
                  {formatSize(dirInfo.size)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Enhanced File Actions
  const handleSaveFile = async () => {
    try {
      setEditorLoading(true);
      const filePath = selectedFile.path || (currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name);
      await fileApi.writeFile(normalizePath(filePath), fileContent, currentDomain);
      setShowFileEditor(false);
      setError(null);
      await loadDirectory(currentPath);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save file');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleCreateFolder = async (folderName) => {
    try {
      setLoading(true);
      setError(null);
      
      const path = currentPath ? `${currentPath}/${folderName}` : folderName;
      await fileApi.createDirectory(path, currentDomain);
      
      setShowNewFolderModal(false);
      setNewFolderName('');
      await loadDirectory(currentPath);
    } catch (err) {
      console.error('Create folder error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create folder';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    try {
      setLoading(true);
      setError(null);
      
      const uploadPromises = Array.from(files).map(file => 
        fileApi.uploadFile(currentPath, file, currentDomain)
      );
      
      await Promise.all(uploadPromises);
      await loadDirectory(currentPath);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to upload files';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced File Info Modal
  const FilePropertiesModal = () => {
    const [fileInfo, setFileInfo] = useState(null);
    const [infoLoading, setInfoLoading] = useState(false);

    useEffect(() => {
      if (showFileProperties && selectedFile) {
        const loadFileInfo = async () => {
          try {
            setInfoLoading(true);
            const info = await fileApi.getFileInfo(selectedFile.path, currentDomain);
            setFileInfo(info);
          } catch (err) {
            setError('Failed to load file information');
          } finally {
            setInfoLoading(false);
          }
        };
        
        loadFileInfo();
      }
    }, [showFileProperties, selectedFile]);

    if (!showFileProperties || !selectedFile) return null;

    return (
              <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowFileProperties(false)}
          />
          
          <div className="relative rounded-xl shadow-2xl w-full max-w-md" 
               style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between p-6 border-b" 
                 style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--primary-text)' }}>
                File Properties
              </h3>
              <button
                onClick={() => setShowFileProperties(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  color: 'var(--secondary-text)',
                  ':hover': { backgroundColor: 'var(--hover-bg)' }
                }}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {infoLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : fileInfo ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(fileInfo.type)}
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--primary-text)' }}>
                        {fileInfo.name}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                        {fileInfo.type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {[
                      { label: 'Size', value: formatSize(fileInfo.size) },
                      { label: 'Owner', value: fileInfo.owner },
                      { label: 'Group', value: fileInfo.group },
                      { label: 'Permissions', value: fileInfo.permissions, mono: true },
                      { label: 'Created', value: formatDate(fileInfo.createdAt) },
                      { label: 'Modified', value: formatDate(fileInfo.modifiedAt) },
                      { label: 'Accessed', value: formatDate(fileInfo.accessedAt) }
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="flex justify-between items-center py-1">
                        <span style={{ color: 'var(--secondary-text)' }}>{label}:</span>
                        <span 
                          className={mono ? 'font-mono' : ''}
                          style={{ color: 'var(--primary-text)' }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {fileInfo.isSymlink && (
                    <div className="p-3 rounded border" 
                         style={{ 
                           backgroundColor: 'var(--secondary-bg)', 
                           borderColor: 'var(--border-color)' 
                         }}>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--secondary-text)' }}>Link Target:</span>
                        <span className="font-mono" style={{ color: 'var(--primary-text)' }}>
                          {fileInfo.linkTarget}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--secondary-text)' }}>
                  Failed to load file information
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isTextFile = (filename) => {
    const textExtensions = ['.txt', '.html', '.css', '.js', '.json', '.md', '.xml', '.csv', '.log', '.conf', '.ini', '.yml', '.yaml'];
    return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const normalizePath = (path) => {
    if (!path) return '';
    // Remove leading/trailing slashes and normalize multiple slashes
    path = path.replace(/^\/+|\/+$/g, '');
    path = path.replace(/\/+/g, '/');
    // Remove any ./ or ../ for security
    path = path.replace(/\/\.\//g, '/');
    path = path.replace(/\/\.\.$/, '');
    path = path.replace(/\/\.\.\//g, '/');
    return path;
  };

  const openFileEditor = async (file) => {
    try {
      setEditorLoading(true);
      setError(null);
      
      const filePath = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
      
      // Add timeout for the read operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Read operation timeout')), 30000)
      );
      
      const response = await Promise.race([
        fileApi.readFile(normalizePath(filePath), currentDomain),
        timeoutPromise
      ]);
      
      // Handle different response formats
      let content = '';
      if (typeof response === 'string') {
        content = response;
      } else if (response?.content) {
        content = response.content;
      } else if (response?.data?.content) {
        content = response.data.content;
      } else if (response?.success && response?.data) {
        content = response.data;
      }
      
      setFileContent(content);
      setSelectedFile(file);
      setShowFileEditor(true);
    } catch (err) {
      console.error('Error opening file:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to read file';
      setError(errorMsg);
      
      // Don't show editor if file can't be read
      setShowFileEditor(false);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleFileClick = async (file, event) => {
    // Handle multi-select (only for file list, not tree view)
    if (event?.ctrlKey || event?.metaKey) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.name)) {
        newSelected.delete(file.name);
      } else {
        newSelected.add(file.name);
      }
      setSelectedFiles(newSelected);
      return;
    }

    setSelectedFiles(new Set());
    setSelectedFile(file);

    if (file.type === 'folder') {
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      const normalizedNewPath = normalizePath(newPath);
      // Navigating to new path
      setCurrentPath(normalizedNewPath);
    } else if (isTextFile(file.name)) {
      await openFileEditor(file);
    }
  };

  const handleDoubleClick = async (file) => {
    if (file.type === 'folder') {
      return; // Already handled by single click
    }

    if (isImageFile(file.name) || isTextFile(file.name)) {
      if (isImageFile(file.name)) {
        setShowFilePreview(true);
      } else {
        await openFileEditor(file);
      }
    } else {
      // Try to download the file
      handleDownload(file);
    }
  };

  const handleContextMenu = (event, item) => {
    event.preventDefault();
    setSelectedFile(item);
    setContextMenu({
      visible: true,
      x: event.pageX,
      y: event.pageY,
      item
    });
  };

  const handleDownload = async (file) => {
    try {
      setLoading(true);
      const filePath = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
      const response = await fileApi.downloadFile(normalizePath(filePath), currentDomain);
      
      // Handle different response formats
      let blob;
      if (response.data instanceof Blob) {
        blob = response.data;
      } else if (response instanceof Blob) {
        blob = response;
      } else {
        blob = new Blob([response.data || response]);
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      console.error('Download error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to download file';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (file) => {
    setClipboardItem(file);
    setClipboardAction('copy');
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleCut = (file) => {
    setClipboardItem(file);
    setClipboardAction('cut');
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handlePaste = async () => {
    if (!clipboardItem) return;

    try {
      setLoading(true);
      setError(null);
      
      if (clipboardAction === 'copy') {
        // Generate a unique name for the copy
        let copyName = `${clipboardItem.name}_copy`;
        let counter = 1;
        
        // Check if the copy name already exists and increment counter if needed
        while (files.some(file => file.name === copyName)) {
          copyName = `${clipboardItem.name}_copy_${counter}`;
          counter++;
        }
        
        const sourcePath = clipboardItem.path || (currentPath ? `${currentPath}/${clipboardItem.name}` : clipboardItem.name);
        const newPath = currentPath ? `${currentPath}/${copyName}` : copyName;
        await fileApi.copyItem(normalizePath(sourcePath), normalizePath(newPath), currentDomain);
      } else if (clipboardAction === 'cut') {
        const sourcePath = clipboardItem.path || (currentPath ? `${currentPath}/${clipboardItem.name}` : clipboardItem.name);
        const newPath = currentPath ? `${currentPath}/${clipboardItem.name}` : clipboardItem.name;
        await fileApi.renameItem(normalizePath(sourcePath), normalizePath(newPath), currentDomain);
        setClipboardItem(null);
        setClipboardAction(null);
      }
      
      await loadDirectory(currentPath);
    } catch (err) {
      console.error('Paste error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to paste item';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedFiles.size > 1) {
        // Delete multiple files
        const deletePromises = Array.from(selectedFiles).map(fileName => {
          const file = files.find(f => f.name === fileName);
          if (file) {
            const filePath = file.path || (currentPath ? `${currentPath}/${fileName}` : fileName);
            return fileApi.deleteItem(normalizePath(filePath), currentDomain);
          }
        }).filter(Boolean); // Remove undefined promises
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      } else if (selectedFile) {
        // Delete single file
        const filePath = selectedFile.path || (currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name);
        await fileApi.deleteItem(normalizePath(filePath), currentDomain);
      }
      
      setShowDeleteConfirm(false);
      setSelectedFile(null);
      setSelectedFiles(new Set());
      await loadDirectory(currentPath);
    } catch (err) {
      console.error('Delete error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete item(s)';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (newName) => {
    if (!selectedFile || !newName || newName === selectedFile.name) return;

    try {
      setLoading(true);
      setError(null);
      
      const oldPath = selectedFile.path || (currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name);
      const newPath = currentPath ? `${currentPath}/${newName}` : newName;
      await fileApi.renameItem(normalizePath(oldPath), normalizePath(newPath), currentDomain);
      
      setShowRenameModal(false);
      setNewFileName('');
      setSelectedFile(null);
      await loadDirectory(currentPath);
    } catch (err) {
      console.error('Rename error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to rename item';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  };

  // Context Menu Component
  const ContextMenu = () => {
    if (!contextMenu.visible) return null;

    return (
      <div
        ref={contextMenuRef}
        className="fixed bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-lg py-2 z-[85]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button
          onClick={() => {
            setShowFilePreview(true);
            setContextMenu({ ...contextMenu, visible: false });
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          disabled={contextMenu.item?.type === 'folder'}
        >
          <EyeIcon className="w-4 h-4 mr-2" />
          Preview
        </button>
        <button
          onClick={() => {
            setNewFileName(contextMenu.item?.name || '');
            setShowRenameModal(true);
            setContextMenu({ ...contextMenu, visible: false });
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          Rename
        </button>
        <button
          onClick={() => handleCopy(contextMenu.item)}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
          Copy
        </button>
        <button
          onClick={() => handleCut(contextMenu.item)}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <ClipboardIcon className="w-4 h-4 mr-2" />
          Cut
        </button>
        {clipboardItem && (
          <button
            onClick={handlePaste}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <ClipboardIcon className="w-4 h-4 mr-2" />
            Paste
          </button>
        )}
        <button
          onClick={() => handleDownload(contextMenu.item)}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          disabled={contextMenu.item?.type === 'folder'}
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Download
        </button>
        <button
          onClick={() => {
            setShowFileProperties(true);
            setContextMenu({ ...contextMenu, visible: false });
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <InformationCircleIcon className="w-4 h-4 mr-2" />
          Properties
        </button>
        <hr className="my-1 border-gray-200 dark:border-gray-700" />
        <button
          onClick={() => {
            setShowDeleteConfirm(true);
            setContextMenu({ ...contextMenu, visible: false });
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center"
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>
    );
  };

  // helper function for language detection
  function getLanguageFromFilename(filename) {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'php': return 'php';
      case 'sh': return 'shell';
      case 'yml':
      case 'yaml': return 'yaml';
      case 'xml': return 'xml';
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      case 'h': return 'cpp';
      case 'java': return 'java';
      case 'go': return 'go';
      case 'rb': return 'ruby';
      case 'pl': return 'perl';
      case 'sql': return 'sql';
      case 'ini': return 'ini';
      case 'conf': return 'ini';
      case 'log': return 'log';
      default: return 'plaintext';
    }
  }

  const FileEditor = React.memo(() => {
    const [localContent, setLocalContent] = useState('');
    const [editorError, setEditorError] = useState(null);
    
    // Initialize local content when editor opens
    useEffect(() => {
      if (showFileEditor && selectedFile) {
        setLocalContent(fileContent || '');
        setEditorError(null);
      }
    }, [showFileEditor, selectedFile, fileContent]);

    const handleEditorClose = useCallback(() => {
      setShowFileEditor(false);
      setLocalContent('');
      setEditorError(null);
      
      // Enhanced Monaco editor cleanup
      try {
        if (window.currentMonacoEditor) {
          try {
            window.currentMonacoEditor.dispose();
          } catch (err) {
            // Suppress disposal errors
            if (err?.message?.includes('Canceled') || 
                err?.message?.includes('cancelled') ||
                err?.name === 'AbortError') {
              console.debug('Monaco editor disposal error suppressed:', err);
            } else {
              console.debug('Monaco editor disposal error:', err);
            }
          }
          window.currentMonacoEditor = null;
        }
        
        if (window.monaco && window.monaco.editor) {
          try {
            const models = window.monaco.editor.getModels();
            models.forEach(model => {
              try {
                model.dispose();
              } catch (err) {
                // Suppress model disposal errors
                if (err?.message?.includes('Canceled') || 
                    err?.message?.includes('cancelled') ||
                    err?.name === 'AbortError') {
                  console.debug('Model dispose error suppressed:', err);
                } else {
                  console.debug('Model dispose error:', err);
                }
              }
            });
          } catch (err) {
            // Suppress getModels errors
            if (err?.message?.includes('Canceled') || 
                err?.message?.includes('cancelled') ||
                err?.name === 'AbortError') {
              console.debug('Monaco getModels error suppressed:', err);
            } else {
              console.debug('Monaco getModels error:', err);
            }
          }
        }
      } catch (err) {
        // Suppress general cleanup errors
        if (err?.message?.includes('Canceled') || 
            err?.message?.includes('cancelled') ||
            err?.name === 'AbortError') {
          console.debug('Monaco cleanup error suppressed:', err);
        } else {
          console.debug('Monaco cleanup error:', err);
        }
      }
    }, []);

    const handleSave = useCallback(async () => {
      try {
        setEditorLoading(true);
        setEditorError(null);
        const filePath = selectedFile.path || (currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name);
        
        // Add timeout for the save operation
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Save operation timeout')), 30000)
        );
        
        await Promise.race([
          fileApi.writeFile(normalizePath(filePath), localContent, currentDomain),
          timeoutPromise
        ]);
        
        setFileContent(localContent);
        setShowFileEditor(false);
        setLocalContent('');
        setError(null);
        await loadDirectory(currentPath);
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to save file';
        setEditorError(errorMsg);
        setError(errorMsg);
      } finally {
        setEditorLoading(false);
      }
    }, [localContent, selectedFile, currentPath, currentDomain, loadDirectory]);

    // Handle keyboard shortcuts (Ctrl+S, Esc) for Monaco
    useEffect(() => {
      const handler = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleEditorClose();
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [handleSave, handleEditorClose]);

    const language = getLanguageFromFilename(selectedFile?.name);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
        <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Editing: {selectedFile?.name}
            </h3>
            <button
              onClick={handleEditorClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

          </div>
          {editorError && (
            <div className="mx-4 p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-center text-red-600 dark:text-red-400">
                <InformationCircleIcon className="w-4 h-4 mr-2" />
                <span className="text-sm">{editorError}</span>
              </div>
            </div>
          )}
          
          <div className="p-4 flex-1 overflow-auto" style={{ minHeight: 500 }}>
            <React.Suspense 
              fallback={
                <div className="flex justify-center items-center h-96">
                  <LoadingSpinner />
                  <span className="ml-2">Loading editor...</span>
                </div>
              }
              onError={(error) => {
                // Suppress Monaco-related errors in Suspense
                const isMonacoError = (err) => {
                  if (!err) return false;
                  
                  const errorString = typeof err === 'string' ? err : 
                                     err.message || err.toString() || '';
                  const stackString = err?.stack || '';
                  
                  const monacoPatterns = [
                    'Canceled', 'cancelled', 'monaco-editor', 'editor.main.js',
                    'vs/editor/editor.main.js', 'cdn.jsdelivr.net', 'monaco-editor@0.52.2',
                    '667', '17865', '633:12368', 'AbortError', 'ERR_CANCELED',
                    'Script error', 'handleError', 'bundle.js'
                  ];
                  
                  return monacoPatterns.some(pattern => 
                    errorString.includes(pattern) || stackString.includes(pattern)
                  );
                };

                if (isMonacoError(error)) {
                  console.debug('Monaco Suspense error suppressed:', error);
                  return;
                }
                
                console.error('Editor Suspense error:', error);
              }}
            >
              <ErrorBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center h-96">
                    <div className="text-red-500 mb-4">
                      <DocumentTextIcon className="w-12 h-12" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Editor failed to load</p>
                    <button
                      onClick={() => {
                        setEditorError(null);
                        setShowFileEditor(false);
                        setTimeout(() => setShowFileEditor(true), 100);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Retry Editor
                    </button>
                  </div>
                }
                onError={(error, errorInfo) => {
                  // Suppress Monaco-related errors in ErrorBoundary
                  const isMonacoError = (err) => {
                    if (!err) return false;
                    
                    const errorString = typeof err === 'string' ? err : 
                                       err.message || err.toString() || '';
                    const stackString = err?.stack || errorInfo?.componentStack || '';
                    
                    const monacoPatterns = [
                      'Canceled', 'cancelled', 'monaco-editor', 'editor.main.js',
                      'vs/editor/editor.main.js', 'cdn.jsdelivr.net', 'monaco-editor@0.52.2',
                      '667', '17865', '633:12368', 'AbortError', 'ERR_CANCELED',
                      'Script error', 'handleError', 'bundle.js'
                    ];
                    
                    return monacoPatterns.some(pattern => 
                      errorString.includes(pattern) || stackString.includes(pattern)
                    );
                  };

                  if (isMonacoError(error)) {
                    console.debug('Monaco ErrorBoundary error suppressed:', error);
                    return;
                  }
                  
                  console.error('Editor ErrorBoundary error:', error, errorInfo);
                }}
              >
                                <MonacoEditor
                  height="500px"
                  language={language}
                  theme="vs-dark"
                  value={localContent}
                  onChange={(value) => setLocalContent(value ?? '')}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'none',
                    folding: true,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    selectOnLineNumbers: true,
                    readOnly: false,
                    cursorStyle: 'line',
                    theme: 'vs-dark',
                    // Add more stable options
                    contextmenu: true,
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: 'on',
                    tabCompletion: 'on',
                    wordBasedSuggestions: true,
                    parameterHints: {
                      enabled: true
                    },
                    hover: {
                      enabled: true
                    }
                  }}
                  loading={
                    <div className="flex justify-center items-center h-96">
                      <LoadingSpinner />
                      <span className="ml-2">Loading editor...</span>
                    </div>
                  }
                  onMount={(editor, monaco) => {
                    try {
                      // Focus the editor
                      editor.focus();
                      
                      // Set up error handling for Monaco
                      monaco.editor.onDidCreateModel((model) => {
                        model.onDidChangeContent(() => {
                          // Clear any previous errors when user starts typing
                          if (editorError) {
                            setEditorError(null);
                          }
                        });
                      });
                      
                      // Enhanced error handling for editor operations
                      const originalDispose = editor.dispose;
                      editor.dispose = () => {
                        try {
                          return originalDispose.call(editor);
                        } catch (err) {
                          // Suppress disposal errors
                          if (err?.message?.includes('Canceled') || 
                              err?.message?.includes('cancelled') ||
                              err?.name === 'AbortError') {
                            console.debug('Monaco editor disposal error suppressed:', err);
                            return;
                          }
                          console.warn('Monaco editor disposal error:', err);
                        }
                      };
                      
                      // Store editor reference for cleanup
                      window.currentMonacoEditor = editor;
                    } catch (err) {
                      // Suppress Monaco mount errors
                      if (err?.message?.includes('Canceled') || 
                          err?.message?.includes('cancelled') ||
                          err?.name === 'AbortError') {
                        console.debug('Monaco editor mount error suppressed:', err);
                        return;
                      }
                      console.warn('Monaco editor mount error:', err);
                      setEditorError('Editor initialization error. Please try again.');
                    }
                  }}
                  beforeMount={(monaco) => {
                    try {
                      // Configure Monaco before mounting
                      monaco.editor.defineTheme('vs-dark', {
                        base: 'vs-dark',
                        inherit: true,
                        rules: [],
                        colors: {}
                      });
                      
                      // Enhanced error handling for Monaco operations
                      const originalSetModelLanguage = monaco.editor.setModelLanguage;
                      monaco.editor.setModelLanguage = (model, languageId) => {
                        try {
                          return originalSetModelLanguage(model, languageId);
                        } catch (err) {
                          // Suppress Monaco cancellation errors
                          if (err?.message?.includes('Canceled') || 
                              err?.message?.includes('cancelled') ||
                              err?.name === 'AbortError') {
                            console.debug('Monaco language set error suppressed:', err);
                            return;
                          }
                          console.debug('Monaco language set error:', err);
                        }
                      };
                      
                      // Suppress Monaco internal errors
                      const originalLog = monaco.editor.log;
                      monaco.editor.log = (level, message, ...args) => {
                        if (message && typeof message === 'string' && 
                            (message.includes('Canceled') || message.includes('cancelled'))) {
                          console.debug('Monaco internal log suppressed:', message);
                          return;
                        }
                        return originalLog(level, message, ...args);
                      };
                    } catch (err) {
                      // Suppress Monaco initialization errors
                      if (err?.message?.includes('Canceled') || 
                          err?.message?.includes('cancelled') ||
                          err?.name === 'AbortError') {
                        console.debug('Monaco beforeMount error suppressed:', err);
                        return;
                      }
                      console.warn('Monaco editor beforeMount error:', err);
                    }
                  }}
                  onError={(error) => {
                    // Enhanced Monaco error detection
                    const isMonacoError = (err) => {
                      if (!err) return false;
                      
                      const errorString = typeof err === 'string' ? err : 
                                         err.message || err.toString() || '';
                      const stackString = err.stack || '';
                      
                      const monacoPatterns = [
                        'Canceled', 'cancelled', 'monaco-editor', 'editor.main.js',
                        'vs/editor/editor.main.js', 'cdn.jsdelivr.net', 'monaco-editor@0.52.2',
                        '667', '17865', '633:12368', 'AbortError', 'ERR_CANCELED',
                        'Script error', 'handleError', 'bundle.js', 'aborted'
                      ];
                      
                      return monacoPatterns.some(pattern => 
                        errorString.includes(pattern) || stackString.includes(pattern)
                      );
                    };

                    // Completely ignore Monaco cancellation errors
                    if (isMonacoError(error)) {
                      console.debug('Monaco Editor cancellation ignored:', error);
                      return;
                    }
                    
                    console.warn('Monaco Editor error:', error);
                    setEditorError('Editor loading error. Please try again.');
                  }}
                />
              </ErrorBoundary>
            </React.Suspense>
          </div>
          <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 space-x-3">
            <button
              onClick={handleEditorClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              disabled={editorLoading}
            >
              {editorLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <CheckIcon className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  });

  // File Preview Modal
  const FilePreview = () => {
    if (!showFilePreview || !selectedFile) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preview: {selectedFile.name}
            </h3>
            <button
              onClick={() => setShowFilePreview(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-auto flex items-center justify-center">
            {isImageFile(selectedFile.name) ? (
              <img
                src={`/api/files/download?path=${encodeURIComponent(selectedFile.path)}`}
                alt={selectedFile.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : isTextFile(selectedFile.name) ? (
              <pre className="w-full h-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono overflow-auto">
                {fileContent}
              </pre>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <DocumentIcon className="w-16 h-16 mx-auto mb-4" />
                <p>Preview not available for this file type</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      // Yesterday
      return 'Yesterday';
    } else if (diffInHours < 168) {
      // Within a week - show day name
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      // Older - show full date
      return date.toLocaleDateString([], { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'folder':
        return <FolderIcon className="w-5 h-5 text-yellow-400" />;
      case 'text':
        return <DocumentTextIcon className="w-5 h-5 text-blue-400" />;
      case 'image':
        return <PhotoIcon className="w-5 h-5 text-green-400" />;
      case 'video':
        return <FilmIcon className="w-5 h-5 text-purple-400" />;
      case 'audio':
        return <MusicalNoteIcon className="w-5 h-5 text-pink-400" />;
      case 'archive':
        return <ArchiveBoxIcon className="w-5 h-5 text-orange-400" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatSize = (bytes) => {
    if (bytes === null) return '';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  const getDisplayPath = (path) => {
    if (!path) return 'Home';
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'Home';
  };

  const FileListPanel = () => (
    <div 
      ref={dropZoneRef}
      className={`h-full overflow-auto p-6 ${isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="p-8 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/50">
            <DocumentPlusIcon className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
              Drop files here to upload
            </p>
          </div>
        </div>
      )}

      {filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <FolderIcon className="w-16 h-16 mb-4" style={{ color: 'var(--secondary-text)' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
            {searchQuery ? 'No files found' : 'This folder is empty'}
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
            {searchQuery 
              ? `No files match "${searchQuery}"` 
              : 'Upload files or create folders to get started'
            }
          </p>
          {!searchQuery && (
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-md transition-colors"
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: 'white'
                }}
              >
                <FolderPlusIcon className="w-4 h-4" />
                <span>Create Folder</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredFiles.map((file, index) => (
            <FileRow key={`${file.name}-${index}`} file={file} />
          ))}
        </div>
      )}
    </div>
  );

  // Enhanced File Row Component
  const FileRow = ({ file }) => {
    const isSelected = selectedFiles.has(file.name);
    const isHighlighted = highlightedRow === file.name;

    return (
      <div
        className={`flex items-center px-4 py-3 rounded-lg cursor-pointer transition-colors group ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        style={{
          backgroundColor: isSelected 
            ? 'var(--accent-color)20' 
            : isHighlighted 
              ? 'var(--hover-bg)' 
              : 'transparent'
        }}
        onClick={(e) => handleFileClick(file, e)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
        onMouseEnter={() => setHighlightedRow(file.name)}
        onMouseLeave={() => setHighlightedRow(null)}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex-shrink-0 mr-3">
            {getFileIcon(file.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium truncate" 
                 style={{ color: isSelected ? 'var(--accent-color)' : 'var(--primary-text)' }}>
                {file.name}
              </p>
              
              {file.isSymlink && (
                <span className="text-xs px-1 py-0.5 rounded" 
                      style={{ 
                        backgroundColor: 'var(--secondary-bg)', 
                        color: 'var(--secondary-text)' 
                      }}>
                  link
                </span>
              )}
              
              {file.isHidden && (
                <span className="text-xs px-1 py-0.5 rounded" 
                      style={{ 
                        backgroundColor: 'var(--warning-bg)', 
                        color: 'var(--warning-text)' 
                      }}>
                  hidden
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 mt-1 text-xs" 
                 style={{ color: 'var(--secondary-text)' }}>
              <span>{formatSize(file.size)}</span>
              <span>{formatDate(file.modifiedAt)}</span>
              {file.permissions && <span className="font-mono">{file.permissions}</span>}
              {file.owner && <span>{file.owner}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(file);
              setShowFileProperties(true);
            }}
            className="p-1 rounded hover:bg-opacity-20 transition-colors"
            style={{ color: 'var(--secondary-text)' }}
            title="Properties"
          >
            <InformationCircleIcon className="w-4 h-4" />
          </button>

          {isTextFile(file.name) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openFileEditor(file);
              }}
              className="p-1 rounded hover:bg-opacity-20 transition-colors"
              style={{ color: 'var(--secondary-text)' }}
              title="Edit"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(file);
            }}
            className="p-1 rounded hover:bg-opacity-20 transition-colors"
            style={{ color: 'var(--secondary-text)' }}
            title="Download"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const NewFolderModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Folder</h3>
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Folder name"
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
          onKeyPress={(e) => e.key === 'Enter' && newFolderName && handleCreateFolder(newFolderName)}
          autoFocus
        />
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={() => {
              setNewFolderName('');
              setShowNewFolderModal(false);
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (newFolderName) {
                handleCreateFolder(newFolderName);
              }
            }}
            disabled={!newFolderName || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  const RenameModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rename {selectedFile?.type}
        </h3>
        <input
          type="text"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="New name"
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
          onKeyPress={(e) => e.key === 'Enter' && newFileName && handleRename(newFileName)}
          autoFocus
        />
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={() => {
              setNewFileName('');
              setShowRenameModal(false);
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (newFileName) {
                handleRename(newFileName);
              }
            }}
            disabled={!newFileName || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Delete {selectedFiles.size > 1 ? `${selectedFiles.size} items` : selectedFile?.type}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {selectedFiles.size > 1 
            ? `Are you sure you want to delete ${selectedFiles.size} selected items? This action cannot be undone.`
            : `Are you sure you want to delete "${selectedFile?.name}"? This action cannot be undone.`
          }
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    // Enhanced Monaco error suppression
    const isMonacoError = (error) => {
      if (!error) return false;
      
      const errorString = typeof error === 'string' ? error : 
                         error.message || error.toString() || '';
      const stackString = error.stack || '';
      
      const monacoPatterns = [
        'Canceled', 'cancelled', 'monaco-editor', 'editor.main.js',
        'vs/editor/editor.main.js', 'cdn.jsdelivr.net', 'monaco-editor@0.52.2',
        '667', '17865', '633:12368', 'AbortError', 'ERR_CANCELED',
        'Script error', 'handleError', 'bundle.js', 'aborted'
      ];
      
      return monacoPatterns.some(pattern => 
        errorString.includes(pattern) || stackString.includes(pattern)
      );
    };

    // Suppress React error boundary errors for Monaco
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorString = args.join(' ');
      if (isMonacoError(errorString)) {
        console.debug('Monaco console error suppressed:', ...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Suppress all Monaco-related errors globally
    const suppressMonacoErrors = () => {
      const originalError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        if (isMonacoError(message) || isMonacoError(error)) {
          console.debug('Monaco global error suppressed:', message);
          return true; // Prevent error from being logged
        }
        if (originalError) {
          return originalError.apply(this, arguments);
        }
        return false;
      };
      
      return () => {
        window.onerror = originalError;
      };
    };
    
    const cleanup = suppressMonacoErrors();
    
    const handleUnhandledRejection = (event) => {
      // Completely ignore Monaco cancellation errors
      if (isMonacoError(event.reason)) {
        console.debug('Monaco cancellation error ignored:', event.reason);
        event.preventDefault();
        return;
      }
      
      // Set global error for other unhandled rejections
      setGlobalError('An unexpected error occurred. Please try refreshing the page.');
      event.preventDefault();
    };

    // Also handle global errors
    const handleGlobalError = (event) => {
      // Ignore Monaco cancellation errors
      if (isMonacoError(event.error)) {
        console.debug('Monaco global error ignored:', event.error);
        event.preventDefault();
        return;
      }
    };

    // Enhanced console error suppression
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    console.warn = (...args) => {
      const warnString = args.join(' ');
      if (isMonacoError(warnString)) {
        console.debug('Monaco console warning suppressed:', ...args);
        return;
      }
      originalConsoleWarn.apply(console, args);
    };
    
    // Also suppress console.log for Monaco errors
    console.log = (...args) => {
      const logString = args.join(' ');
      if (isMonacoError(logString)) {
        console.debug('Monaco console log suppressed:', ...args);
        return;
      }
      originalConsoleLog.apply(console, args);
    };

    // Suppress React error boundary errors for Monaco
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
      if (type === 'error' || type === 'unhandledrejection') {
        const wrappedListener = (event) => {
          if (isMonacoError(event.error || event.reason)) {
            console.debug('Monaco event error suppressed:', event);
            return;
          }
          return listener(event);
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
      window.addEventListener = originalAddEventListener;
      cleanup(); // Restore original window.onerror
    };
  }, []);

  // Hide context menu on click outside, scroll, or resize
  React.useEffect(() => {
    const handleClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ ...contextMenu, visible: false });
        setHighlightedRow(null);
      }
    };
    const handleScrollOrResize = () => {
      setContextMenu({ ...contextMenu, visible: false });
      setHighlightedRow(null);
    };
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [contextMenu]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
      {/* Global Error Display */}
      {globalError && (
        <div className="fixed top-0 left-0 right-0 z-[200] p-4 bg-red-600 text-white shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center">
              <InformationCircleIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="p-1 hover:bg-red-700 rounded transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex h-screen">
        {/* File Manager Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--primary-text)' }}>
                File Manager
              </h1>
              <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                {currentDomain 
                  ? `Managing files for ${currentDomain}` 
                  : isAdminUser
                    ? 'System file management'
                    : 'Select a domain to manage files'
                }
              </p>
            </div>

            {/* Domain Selector */}
            <DomainSelector />

            {/* Quick Access Buttons */}
            <QuickAccessButtons />

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" 
                                       style={{ color: 'var(--secondary-text)' }} />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-md border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--primary-text)'
                    }}
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--primary-text)'
                  }}
                >
                  <option value="name">Sort by Name</option>
                  <option value="size">Sort by Size</option>
                  <option value="modified">Sort by Modified</option>
                  <option value="type">Sort by Type</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 rounded-md border hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--secondary-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--primary-text)'
                  }}
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-color)',
                    color: 'white'
                  }}
                >
                  <FolderPlusIcon className="w-4 h-4" />
                  <span>New Folder</span>
                </button>

                <label className="flex items-center space-x-2 px-4 py-2 rounded-md cursor-pointer transition-colors"
                       style={{
                         backgroundColor: 'var(--accent-color)',
                         color: 'white'
                       }}>
                  <DocumentPlusIcon className="w-4 h-4" />
                  <span>Upload</span>
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e.target.files)} 
                  />
                </label>

                {clipboardItem && (
                  <button
                    onClick={handlePaste}
                    className="flex items-center space-x-2 px-4 py-2 rounded-md border transition-colors"
                    style={{
                      backgroundColor: 'var(--secondary-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--primary-text)'
                    }}
                  >
                    <ClipboardIcon className="w-4 h-4" />
                    <span>Paste</span>
                  </button>
                )}
              </div>
            </div>

            {/* Breadcrumbs */}
            <Breadcrumbs />
          </div>

          {/* File List Area */}
          <div className="flex-1 overflow-hidden">
            {error && (
              <div className="mx-6 mt-4 p-4 rounded-lg border" 
                   style={{ 
                     backgroundColor: 'var(--error-bg)', 
                     borderColor: 'var(--error-border)',
                     color: 'var(--error-text)' 
                   }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <InformationCircleIcon className="w-5 h-5 mr-3" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={() => {
                      setError(null);
                      loadDirectory(currentPath);
                    }}
                    className="ml-4 px-3 py-1 text-sm rounded border transition-colors"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      color: 'white',
                      borderColor: 'var(--accent-color)'
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Show message for non-admin users with no domains */}
            {!isAdminUser && domains.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <GlobeAltIcon className="w-16 h-16 mb-4" style={{ color: 'var(--secondary-text)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  No Domains Available
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
                  You don't have access to any domains yet. Contact your administrator to get domain access.
                </p>
              </div>
            )}

            {/* Show message for non-admin users without selected domain */}
            {!isAdminUser && domains.length > 0 && !currentDomain && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <GlobeAltIcon className="w-16 h-16 mb-4" style={{ color: 'var(--secondary-text)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  Select a Domain
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
                  Choose a domain from the dropdown above to manage its files.
                </p>
              </div>
            )}

            {/* Show file list only when domain is selected or for admin users */}
            {(currentDomain || isAdminUser) && (
              <>
                {loading && (
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                    <span className="ml-2">Loading files...</span>
                  </div>
                )}
                {!loading && <FileListPanel />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFileEditor && <FileEditor />}
      {showFilePreview && <FilePreview />}
      {showFileProperties && <FilePropertiesModal />}
      {showNewFolderModal && <NewFolderModal />}
      {showRenameModal && <RenameModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
      
      {/* Context Menu */}
      {contextMenu.visible && <ContextMenu />}
    </div>
  );
};

export default FileManager; 