import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
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
  EllipsisVerticalIcon,
  ViewColumnsIcon,
  QueueListIcon,
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
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
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
  const [showNewItemDropdown, setShowNewItemDropdown] = useState(false);
  const newItemDropdownRef = useRef(null);
  const [pathInput, setPathInput] = useState('');
  const scrollTopRef = useRef(0);
  const fileListRef = useRef(null);
  
  // Permission management state
  const [permissionData, setPermissionData] = useState({
    owner: '',
    group: '',
    permissions: {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false }
    },
    numericPermissions: '755'
  });
  const [permissionLoading, setPermissionLoading] = useState(false);



  // Memoize admin check
  const isAdminUser = useMemo(() => {
    return user?.role === 'admin' || user?.is_admin;
  }, [user]);

  // Currently selected domain object
  const selectedDomain = useMemo(() => {
    return domains.find(d => d.domain === currentDomain) || null;
  }, [domains, currentDomain]);

  // Absolute document root path (from API if available, with safe fallback)
  const absoluteDocRoot = useMemo(() => {
    if (selectedDomain?.document_root) return selectedDomain.document_root;
    if (domainStructure?.document_root) return domainStructure.document_root;
    const linuxUser = domainStructure?.linux_username;
    const prefix = (currentDomain || '').split('.')[0];
    if (linuxUser && prefix) return `/home/${linuxUser}/${prefix}`;
    return '';
  }, [selectedDomain, domainStructure, currentDomain]);

  // Relative path from the user's home to the document root (used by file browser)
  const relativeDocRoot = useMemo(() => {
    const home = domainStructure?.home_directory || (domainStructure?.linux_username ? `/home/${domainStructure.linux_username}` : '');
    if (absoluteDocRoot && home && absoluteDocRoot.startsWith(home)) {
      let rel = absoluteDocRoot.slice(home.length);
      if (rel.startsWith('/')) rel = rel.slice(1);
      return rel; // may be '' if doc root equals home
    }
    return '';
  }, [absoluteDocRoot, domainStructure]);

  // Default start path for admin system view (non-locking)
  const systemDefaultPath = useMemo(() => {
    if (!isAdminUser) return '';
    return '/';
  }, [isAdminUser]);

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

  // When domain structure (and doc root) is available, default to document root in the browser
  useEffect(() => {
    if (currentDomain) {
      const target = relativeDocRoot || '';
      if (currentPath !== target) {
        setCurrentPath(target);
      }
    } else if (isAdminUser) {
      const target = systemDefaultPath;
      if (currentPath !== target) {
        setCurrentPath(target);
      }
    }
  }, [currentDomain, relativeDocRoot, isAdminUser, systemDefaultPath]);

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

  // Preserve scroll position before file operations
  const preserveScrollPosition = useCallback(() => {
    if (fileListRef.current) {
      scrollTopRef.current = fileListRef.current.scrollTop;
    }
  }, []);

  // Restore scroll position after file operations
  const restoreScrollPosition = useCallback(() => {
    if (fileListRef.current) {
      fileListRef.current.scrollTop = scrollTopRef.current;
    }
  }, []);

  // Optimized directory loading with caching
  const loadDirectory = useCallback(async (path, preserveScroll = false) => {
    if (!isConnected) return;

    // Prevent non-admin users from querying system root before a domain is selected
    if (!isAdminUser && !currentDomain) {
      return;
    }
    
    // Save current scroll position before loading if preserveScroll is true
    if (preserveScroll) {
      preserveScrollPosition();
    }
    
    // For system mode (no domain), send path as-is to support absolute paths
    // For domain mode, normalize as relative path
    let requestPath = path || '';
    if (!currentDomain && isAdminUser) {
      // System mode: preserve absolute paths, convert empty to '/'
      requestPath = path ? path : '/';
      // Ensure path starts with / for absolute paths in system mode
      if (!requestPath.startsWith('/')) {
        requestPath = '/' + requestPath;
      }
    } else {
      // Domain mode: normalize as relative path
      requestPath = path ? normalizePath(path) : '';
    }
    
    try {
      setLoading(true);
      setError(null);
      setSelectedFiles(new Set());
      
      // Add timeout for the request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const response = await Promise.race([
        fileApi.listDirectory(requestPath, currentDomain),
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
        const pathParts = requestPath.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const parentPath = pathParts.slice(0, -1).join('/');
          setCurrentPath(parentPath);
        } else {
          setCurrentPath('');
        }
      }
    } finally {
      setLoading(false);
      
      // Restore scroll position after loading if preserveScroll was true
      if (preserveScroll) {
        restoreScrollPosition();
      }
    }
  }, [isConnected, currentDomain, isAdminUser, preserveScrollPosition, restoreScrollPosition]);

  // Initial load
  useEffect(() => {
    if (isConnected) {
      loadDirectory(currentPath);
    }
  }, [currentPath, currentDomain, isConnected, loadDirectory]);

  // Reset scroll position when path changes
  useEffect(() => {
    if (fileListRef.current) {
      fileListRef.current.scrollTop = 0;
      scrollTopRef.current = 0;
    }
  }, [currentPath]);

  // Restore scroll position after files are loaded
  useEffect(() => {
    restoreScrollPosition();
  }, [files, restoreScrollPosition]);

  // Track scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (fileListRef.current) {
        scrollTopRef.current = fileListRef.current.scrollTop;
      }
    };
    const scrollElement = fileListRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [files]);

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

  const handleDomainChange = (domain, newPath = null) => {
    // Prevent non-admin users from selecting system files
    if (!isAdminUser && domain === '') {
      return; // Do nothing, don't allow system file access
    }
    
    setCurrentDomain(domain);
    
    // If a new path is explicitly provided, use it.
    // Otherwise, determine the default path based on the new domain.
    const pathToSet = newPath !== null
      ? newPath
      : (domain === '' && isAdminUser ? systemDefaultPath : '');
      
    setCurrentPath(pathToSet);
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
        className="block w-full max-w-xs pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
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
      

    </div>
  );

  // Enhanced File Actions
  const handleSaveFile = async () => {
    try {
      setEditorLoading(true);
      preserveScrollPosition();
      const filePath = selectedFile.path || (currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name);
      await fileApi.writeFile(normalizePath(filePath), fileContent, currentDomain);
      setShowFileEditor(false);
      setError(null);
      await loadDirectory(currentPath, true);
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
      preserveScrollPosition();
      
      // Build path based on mode (system vs domain)
      let path;
      if (currentPath) {
        // Preserve absolute paths in system mode
        if (currentPath.startsWith('/') && !currentDomain) {
          path = `${currentPath}/${folderName}`;
        } else {
          path = `${currentPath}/${folderName}`;
        }
      } else {
        path = folderName;
      }
      
      await fileApi.createDirectory(path, currentDomain);
      
      setShowNewFolderModal(false);
      setNewFolderName('');
      await loadDirectory(currentPath, true);
    } catch (err) {
      console.error('Create folder error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create folder';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async (fileName) => {
    if (!fileName) return;
    try {
      setLoading(true);
      setError(null);
      preserveScrollPosition();
      
      // Build path based on mode (system vs domain)
      let path;
      if (currentPath) {
        // Preserve absolute paths in system mode
        if (currentPath.startsWith('/') && !currentDomain) {
          path = `${currentPath}/${fileName}`;
        } else {
          path = `${currentPath}/${fileName}`;
        }
      } else {
        path = fileName;
      }
      
      await fileApi.createFile(path, currentDomain);
      
      setShowNewFileModal(false);
      setNewFileName('');
      await loadDirectory(currentPath, true);
    } catch (err) {
      console.error('Create file error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create file';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use current path for upload (preserves absolute paths in system mode)
      const uploadPath = currentPath || '/';
      
      const uploadPromises = Array.from(files).map(file => 
        fileApi.uploadFile(uploadPath, file, currentDomain)
      );
      
      await Promise.all(uploadPromises);
      await loadDirectory(currentPath, true);
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
                {getFileIcon({ name: fileInfo.name, type: fileInfo.type })}
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
    
    // For system mode (no domain), preserve absolute paths
    // This allows admin to browse entire filesystem
    const isAbsolutePath = path.startsWith('/');
    
    // Normalize multiple slashes
    path = path.replace(/\/+/g, '/');
    
    // Remove any ./ or ../ for security
    path = path.replace(/\/\.\//g, '/');
    path = path.replace(/\/\.\.$/, '');
    path = path.replace(/\/\.\.\//g, '/');
    
    // For domain mode (relative paths), remove leading/trailing slashes
    // For system mode, keep the leading slash if it was an absolute path
    if (!isAbsolutePath || currentDomain) {
      path = path.replace(/^\/+|\/+$/g, '');
    } else {
      // System mode with absolute path - only remove trailing slashes
      path = path.replace(/\/+$/, '');
      // Ensure at least one leading slash for absolute paths
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
    }
    
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
      // For system mode with absolute paths, use file.path if available
      // Otherwise construct the path
      let newPath;
      if (!currentDomain && file.path) {
        // System mode: use the absolute path from the file object
        newPath = file.path.startsWith('/') ? file.path : '/' + file.path;
      } else if (currentPath) {
        // Append to current path
        if (!currentDomain) {
          // System mode: construct absolute path
          newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        } else {
          // Domain mode: relative path
          newPath = `${currentPath}/${file.name}`;
        }
      } else {
        newPath = file.name;
      }
      // Navigating to new path
      setCurrentPath(newPath);
    } else if (isTextFile(file.name)) {
      await openFileEditor(file);
    }
  };

  const handleDoubleClick = async (file) => {
    if (file.type === 'folder') {
      return; // Already handled by single click
    }

    if (isImageFile(file.name)) {
      setShowFilePreview(true);
    } else {
      // For any other file, try to open it in the editor
      await openFileEditor(file);
    }
  };

  const handleContextMenu = (event, item, anchor = 'top-left') => {
    event.preventDefault();
    setSelectedFile(item);
    setContextMenu({
      visible: true,
      x: event.pageX,
      y: event.pageY,
      item,
      anchor,
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
      
      await loadDirectory(currentPath, true);
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
      await loadDirectory(currentPath, true);
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
      await loadDirectory(currentPath, true);
    } catch (err) {
      console.error('Rename error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to rename item';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Permission management functions
  const parsePermissions = (permissionString) => {
    if (!permissionString || permissionString.length < 9) {
      return { owner: { read: false, write: false, execute: false }, group: { read: false, write: false, execute: false }, other: { read: false, write: false, execute: false } };
    }
    
    const perms = permissionString.slice(-9); // Get last 9 characters
    return {
      owner: { read: perms[0] === 'r', write: perms[1] === 'w', execute: perms[2] === 'x' },
      group: { read: perms[3] === 'r', write: perms[4] === 'w', execute: perms[5] === 'x' },
      other: { read: perms[6] === 'r', write: perms[7] === 'w', execute: perms[8] === 'x' }
    };
  };

  const permissionsToNumeric = (permissions) => {
    const toOctal = (perms) => {
      return (perms.read ? 4 : 0) + (perms.write ? 2 : 0) + (perms.execute ? 1 : 0);
    };
    
    const owner = toOctal(permissions.owner);
    const group = toOctal(permissions.group);
    const other = toOctal(permissions.other);
    
    return `${owner}${group}${other}`;
  };

  const numericToPermissions = (numeric) => {
    if (!numeric || numeric.length !== 3) return { owner: { read: false, write: false, execute: false }, group: { read: false, write: false, execute: false }, other: { read: false, write: false, execute: false } };
    
    const parseOctal = (octal) => {
      const num = parseInt(octal, 8);
      return {
        read: (num & 4) !== 0,
        write: (num & 2) !== 0,
        execute: (num & 1) !== 0
      };
    };
    
    return {
      owner: parseOctal(numeric[0]),
      group: parseOctal(numeric[1]),
      other: parseOctal(numeric[2])
    };
  };

  const loadFilePermissions = async (file) => {
    try {
      setPermissionLoading(true);
      const filePath = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
      const fileInfo = await fileApi.getFileInfo(normalizePath(filePath), currentDomain);
      
      const permissions = parsePermissions(fileInfo.permissions);
      const numericPermissions = permissionsToNumeric(permissions);
      
      setPermissionData({
        owner: fileInfo.owner || '',
        group: fileInfo.group || '',
        permissions: permissions,
        numericPermissions: numericPermissions
      });
    } catch (err) {
      console.error('Error loading file permissions:', err);
      setError('Failed to load file permissions');
    } finally {
      setPermissionLoading(false);
    }
  };

  const handlePermissionChange = (category, permission, value) => {
    setPermissionData(prev => {
      const newPermissions = {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [permission]: value
        }
      };
      
      const numericPermissions = permissionsToNumeric(newPermissions);
      
      return {
        ...prev,
        permissions: newPermissions,
        numericPermissions: numericPermissions
      };
    });
  };

  const handleNumericPermissionChange = (value) => {
    if (!/^[0-7]{3}$/.test(value)) return; // Only allow 3 digits 0-7
    
    setPermissionData(prev => ({
      ...prev,
      numericPermissions: value,
      permissions: numericToPermissions(value)
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedFile) return;

    try {
      setPermissionLoading(true);
      setError(null);
      
      const filePath = selectedFile.path || (currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name);
      
      // Save permissions
      await fileApi.changePermissions(normalizePath(filePath), permissionData.numericPermissions, currentDomain);
      
      // Save ownership if changed
      if (permissionData.owner !== selectedFile.owner || permissionData.group !== selectedFile.group) {
        await fileApi.changeOwnership(
          normalizePath(filePath), 
          permissionData.owner, 
          permissionData.group, 
          currentDomain
        );
      }
      
      setShowPermissionModal(false);
      await loadDirectory(currentPath, true);
    } catch (err) {
      console.error('Permission change error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to change permissions';
      setError(errorMsg);
    } finally {
      setPermissionLoading(false);
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

  // Upload helpers for folder support
  const buildUploadPath = (relativeDir) => {
    const base = currentPath || (currentDomain ? '' : '/');
    const cleanBase = base.replace(/\/+$/,'');
    const cleanRel = (relativeDir || '').replace(/^\/+|\/+$/g,'');
    if (!cleanRel) return cleanBase || '/';
    const joined = `${cleanBase || ''}/${cleanRel}`;
    // If system mode and base is empty, ensure leading slash
    if (!currentDomain && !cleanBase) return `/${cleanRel}`;
    return joined.replace(/\/+/, '/');
  };

  const traverseEntry = async (entry, parentPath = '') => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          resolve([{ file, relativeDir: parentPath }]);
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const results = [];
        const readBatch = () => {
          dirReader.readEntries(async (entries) => {
            if (!entries.length) return resolve(results);
            for (const child of entries) {
              // eslint-disable-next-line no-await-in-loop
              const childFiles = await traverseEntry(child, parentPath ? `${parentPath}/${entry.name}`.replace(/\/+/, '/') : entry.name);
              results.push(...childFiles);
            }
            readBatch();
          });
        };
        readBatch();
      } else {
        resolve([]);
      }
    });
  };

  const extractDroppedItems = async (dataTransfer) => {
    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    if (!items.length) return Array.from(dataTransfer.files).map((f) => ({ file: f, relativeDir: '' }));
    const files = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (!entry) {
        const file = item.getAsFile && item.getAsFile();
        if (file) files.push({ file, relativeDir: '' });
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const list = await traverseEntry(entry, '');
      files.push(...list);
    }
    return files;
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Save current scroll position before upload
    preserveScrollPosition();

    try {
      const filesWithDirs = await extractDroppedItems(e.dataTransfer);
      if (!filesWithDirs.length) return;
      setLoading(true);
      setError(null);
      await Promise.all(filesWithDirs.map(({ file, relativeDir }) => {
        const targetDir = buildUploadPath(relativeDir);
        return fileApi.uploadFile(targetDir, file, currentDomain);
      }));
      await loadDirectory(currentPath, true);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to upload files';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Context Menu Component
  const ContextMenu = () => {
    if (!contextMenu.visible) return null;

    const [menuStyle, setMenuStyle] = useState({});

    useLayoutEffect(() => {
      if (contextMenu.visible && contextMenuRef.current) {
        const menuEl = contextMenuRef.current;
        const menuRect = menuEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let top = contextMenu.y;
        let left = 'auto';
        let right = 'auto';

        // Vertical position adjustment
        if (top + menuRect.height > viewportHeight) {
          top = top - menuRect.height;
          // For action menu, adjust to align with button
          if (contextMenu.anchor === 'top-right') {
            const buttonHeight = 32; // Approx height of the button
            top = contextMenu.y - menuRect.height - buttonHeight;
          }
        }
        if (top < 0) top = 0;

        // Horizontal position adjustment
        if (contextMenu.anchor === 'top-right') {
          right = `${viewportWidth - contextMenu.x}px`;
          if (contextMenu.x - menuRect.width < 0) {
            right = 'auto';
            left = `0px`;
          }
        } else { // top-left
          left = `${contextMenu.x}px`;
          if (contextMenu.x + menuRect.width > viewportWidth) {
            left = 'auto';
            right = '0px';
          }
        }

        setMenuStyle({
          position: 'fixed',
          top: `${top}px`,
          left,
          right,
        });
      }
    }, [contextMenu.visible, contextMenu.x, contextMenu.y, contextMenu.anchor]);

    return (
      <div
        ref={contextMenuRef}
        className="fixed bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-lg py-2 z-[85]"
        style={menuStyle}
      >
        <button
          onClick={() => {
            setContextMenu({ ...contextMenu, visible: false });
            if (contextMenu.item) {
              if (isImageFile(contextMenu.item.name)) {
                setShowFilePreview(true);
              } else {
                openFileEditor(contextMenu.item);
              }
            }
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
            onClick={async () => {
              try {
                // Save current scroll position before zip
                preserveScrollPosition();
                setLoading(true);
                setContextMenu({ ...contextMenu, visible: false });
                const items = Array.from(selectedFiles.size ? selectedFiles : new Set([contextMenu.item?.name])).filter(Boolean);
                const result = await fileApi.zipItems(currentPath, items, undefined, currentDomain);
                await loadDirectory(currentPath, true);
            } catch (err) {
              const errorMsg = err.response?.data?.error || err.message || 'Failed to create archive';
              setError(errorMsg);
            } finally {
              setLoading(false);
            }
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <ArchiveBoxIcon className="w-4 h-4 mr-2" />
          Compress (zip)
        </button>
        {contextMenu.item?.name?.toLowerCase().endsWith('.zip') && (
          <button
              onClick={async () => {
                try {
                  // Save current scroll position before unzip
                  preserveScrollPosition();
                  setLoading(true);
                  setContextMenu({ ...contextMenu, visible: false });
                  const archiveRel = contextMenu.item.path || (currentPath ? `${currentPath}/${contextMenu.item.name}` : contextMenu.item.name);
                  await fileApi.unzip(archiveRel, currentPath, currentDomain);
                  await loadDirectory(currentPath, true);
              } catch (err) {
                const errorMsg = err.response?.data?.error || err.message || 'Failed to extract archive';
                setError(errorMsg);
              } finally {
                setLoading(false);
              }
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <ArchiveBoxIcon className="w-4 h-4 mr-2" />
            Extract here
          </button>
        )}
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
        <button
          onClick={async () => {
            setContextMenu({ ...contextMenu, visible: false });
            await loadFilePermissions(contextMenu.item);
            setShowPermissionModal(true);
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          Change Permissions
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
        await loadDirectory(currentPath, true);
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
        <div className="rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>
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
                      className="px-4 py-2 text-white rounded transition-colors"
                      style={{ backgroundColor: 'var(--accent-color)' }}
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
              className="px-4 py-2 text-white rounded-lg  transition-colors flex items-center"
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
        <div className="rounded-xl max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>
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
                src={`/api/files/download?path=${encodeURIComponent(selectedFile.path)}${currentDomain ? `&domain=${encodeURIComponent(currentDomain)}` : ''}`}
                alt={selectedFile.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : isTextFile(selectedFile.name) ? (
              <pre className="w-full h-full p-4 rounded-lg text-sm font-mono overflow-auto" style={{ backgroundColor: 'var(--code-bg)', border: '1px solid var(--border-color)', color: 'var(--primary-text)' }}>
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

  const getFileIcon = (fileOrType, size = 'w-5 h-5') => {
    const filename = typeof fileOrType === 'string' ? fileOrType : fileOrType?.name;
    const type = typeof fileOrType === 'string' ? fileOrType : fileOrType?.type;
    const lower = (filename || '').toLowerCase();

    if (type === 'folder') return <FolderIcon className={`${size} text-yellow-400`} />;

    const ext = lower.split('.').pop();
    const IconBy = (I, cls) => <I className={`${size} ${cls}`} />;
    const mapping = {
      html: () => IconBy(DocumentTextIcon, 'text-orange-500'),
      htm: () => IconBy(DocumentTextIcon, 'text-orange-500'),
      css: () => IconBy(DocumentTextIcon, 'text-blue-500'),
      scss: () => IconBy(DocumentTextIcon, 'text-pink-500'),
      sass: () => IconBy(DocumentTextIcon, 'text-pink-500'),
      js: () => IconBy(DocumentTextIcon, 'text-yellow-500'),
      ts: () => IconBy(DocumentTextIcon, 'text-blue-600'),
      tsx: () => IconBy(DocumentTextIcon, 'text-blue-600'),
      jsx: () => IconBy(DocumentTextIcon, 'text-yellow-600'),
      json: () => IconBy(DocumentTextIcon, 'text-emerald-500'),
      xml: () => IconBy(DocumentTextIcon, 'text-amber-500'),
      py: () => IconBy(DocumentTextIcon, 'text-yellow-400'),
      php: () => IconBy(DocumentTextIcon, 'text-indigo-500'),
      java: () => IconBy(DocumentTextIcon, 'text-red-500'),
      go: () => IconBy(DocumentTextIcon, 'text-cyan-500'),
      rb: () => IconBy(DocumentTextIcon, 'text-rose-500'),
      sh: () => IconBy(DocumentTextIcon, 'text-gray-500'),
      sql: () => IconBy(DocumentTextIcon, 'text-green-600'),
      md: () => IconBy(DocumentTextIcon, 'text-slate-500'),
      pdf: () => IconBy(DocumentTextIcon, 'text-red-600'),
      doc: () => IconBy(DocumentTextIcon, 'text-blue-700'),
      docx: () => IconBy(DocumentTextIcon, 'text-blue-700'),
      xls: () => IconBy(DocumentTextIcon, 'text-green-700'),
      xlsx: () => IconBy(DocumentTextIcon, 'text-green-700'),
      ppt: () => IconBy(DocumentTextIcon, 'text-orange-600'),
      pptx: () => IconBy(DocumentTextIcon, 'text-orange-600'),
      jpg: () => IconBy(PhotoIcon, 'text-green-400'),
      jpeg: () => IconBy(PhotoIcon, 'text-green-400'),
      png: () => IconBy(PhotoIcon, 'text-green-400'),
      gif: () => IconBy(PhotoIcon, 'text-green-400'),
      webp: () => IconBy(PhotoIcon, 'text-green-400'),
      svg: () => IconBy(PhotoIcon, 'text-green-400'),
      mp4: () => IconBy(FilmIcon, 'text-purple-400'),
      avi: () => IconBy(FilmIcon, 'text-purple-400'),
      mov: () => IconBy(FilmIcon, 'text-purple-400'),
      mkv: () => IconBy(FilmIcon, 'text-purple-400'),
      webm: () => IconBy(FilmIcon, 'text-purple-400'),
      mp3: () => IconBy(MusicalNoteIcon, 'text-pink-400'),
      wav: () => IconBy(MusicalNoteIcon, 'text-pink-400'),
      ogg: () => IconBy(MusicalNoteIcon, 'text-pink-400'),
      zip: () => IconBy(ArchiveBoxIcon, 'text-orange-500'),
      tar: () => IconBy(ArchiveBoxIcon, 'text-orange-500'),
      gz: () => IconBy(ArchiveBoxIcon, 'text-orange-500'),
      bz2: () => IconBy(ArchiveBoxIcon, 'text-orange-500'),
      '7z': () => IconBy(ArchiveBoxIcon, 'text-orange-500'),
      rar: () => IconBy(ArchiveBoxIcon, 'text-orange-500'),
    };

    if (ext && mapping[ext]) return mapping[ext]();

    switch (type) {
      case 'text':
        return <DocumentTextIcon className={`${size} text-blue-400`} />;
      case 'image':
        return <PhotoIcon className={`${size} text-green-400`} />;
      case 'video':
        return <FilmIcon className={`${size} text-purple-400`} />;
      case 'audio':
        return <MusicalNoteIcon className={`${size} text-pink-400`} />;
      case 'archive':
        return <ArchiveBoxIcon className={`${size} text-orange-400`} />;
      default:
        return <DocumentIcon className={`${size} text-gray-400`} />;
    }
  };

  const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined) return '';
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
      ref={(el) => {
        dropZoneRef.current = el;
        fileListRef.current = el;
      }}
      className={`h-full overflow-auto p-6 min-h-0 overscroll-y-auto scroll-smooth ${isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' }}
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
          {/* File List Header */}
          <div className="flex items-center px-4 py-2 text-xs font-medium tracking-wider text-left uppercase" style={{ color: 'var(--secondary-text)', borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex-1 pl-10">Name</div>
            <div className="w-28 flex-shrink-0 text-right px-3">Size</div>
            <div className="w-44 flex-shrink-0 text-right px-3 whitespace-nowrap">Last Modified</div>
            <div className="w-36 flex-shrink-0 text-right px-3">Owner</div>
            <div className="w-24 flex-shrink-0 text-right px-3">Permissions</div>
            <div className="w-16 flex-shrink-0"></div> {/* Actions column header */}
          </div>
          {filteredFiles.map((file) => (
            <FileRow key={file.path} file={file} />
          ))}
        </div>
      )}
    </div>
  );

  const FileGridItem = ({ file }) => {
    const isSelected = selectedFiles.has(file.name);

    return (
      <div
        className={`relative flex flex-col items-center p-3 rounded-lg cursor-pointer transition-colors group ${
          isSelected ? 'bg-[var(--accent-color)]/20 ring-1 ring-[var(--accent-color)]/50' : 'hover:bg-[var(--hover-bg)]'
        }`}
        onClick={(e) => handleFileClick(file, e)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
      >
        <div className="mb-3">
          {getFileIcon(file, 'w-16 h-16')}
        </div>
        <p className="w-full text-sm text-center break-words text-[var(--primary-text)]" title={file.name}>
          {file.name}
        </p>
      </div>
    );
  };

  const FileGrid = () => (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
        {filteredFiles.map((file) => (
          <FileGridItem key={file.path} file={file} />
        ))}
      </div>
    </div>
  );

  // Enhanced File Row Component
  const FileRow = ({ file }) => {
    const isSelected = selectedFiles.has(file.name);
    const isHighlighted = highlightedRow === file.name;

    const handleActionMenu = (e, file) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      handleContextMenu({
        preventDefault: () => {},
        pageX: rect.right,
        pageY: rect.bottom,
      }, file, 'top-right');
    };

    return (
      <div
        className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors group ${
          isSelected ? 'bg-[var(--accent-color)]/10 ring-1 ring-[var(--accent-color)]/50' : ''
        } ${isHighlighted ? 'bg-[var(--hover-bg)]' : ''}`}
        onClick={(e) => handleFileClick(file, e)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
        onMouseEnter={() => setHighlightedRow(file.name)}
        onMouseLeave={() => setHighlightedRow(null)}
      >
        {/* Name and Icon */}
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex-shrink-0 mr-4">
            {getFileIcon(file)}
          </div>
          <div className="flex-1 min-w-0 flex items-center space-x-2">
            <p className="text-sm font-medium truncate text-[var(--primary-text)]">
              {file.name}
            </p>
            {file.isSymlink && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--secondary-bg)] text-[var(--secondary-text)]">link</span>
            )}
            {file.isHidden && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)]">hidden</span>
            )}
          </div>
        </div>

        {/* Size */}
        <div className="w-28 flex-shrink-0 text-right px-3 text-sm text-[var(--secondary-text)]">
          {file.type !== 'folder' ? formatSize(file.size) : '--'}
        </div>

        {/* Last Modified */}
        <div className="w-44 flex-shrink-0 text-right px-3 text-sm text-[var(--secondary-text)] whitespace-nowrap">
          {formatDate(file.modifiedAt)}
        </div>

        {/* Owner */}
        <div className="w-36 flex-shrink-0 text-right px-3 text-sm text-[var(--secondary-text)] truncate">
          {file.owner}{file.group ? `:${file.group}` : ''}
        </div>

        {/* Permissions */}
        <div className="w-24 flex-shrink-0 text-right px-3 text-sm text-[var(--secondary-text)] font-mono">
          {file.permissions}
        </div>
        
        {/* Actions */}
        <div className="w-16 flex-shrink-0 flex justify-end">
          <button
            onClick={(e) => handleActionMenu(e, file)}
            className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--primary-bg)] focus:ring-[var(--accent-color)] text-[var(--secondary-text)]"
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const NewFolderModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--card-bg)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-text)' }}>Create New Folder</h3>
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Folder name"
          className="w-full px-4 py-2 rounded-lg focus:outline-none"
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--input-text)' }}
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
            className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  const NewFileModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--card-bg)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-text)' }}>Create New File</h3>
        <input
          type="text"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="File name"
          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-[var(--accent-color)]"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--input-text)'
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateFile(newFileName)}
          autoFocus
        />
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={() => {
              setNewFileName('');
              setShowNewFileModal(false);
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleCreateFile(newFileName)}
            disabled={!newFileName || loading}
            className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  const RenameModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--card-bg)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-text)' }}>
          Rename {selectedFile?.type}
        </h3>
        <input
          type="text"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="New name"
          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-[var(--accent-color)]"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--input-text)'
          }}
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
            className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            {loading ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--card-bg)' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary-text)' }}>
          Delete {selectedFiles.size > 1 ? `${selectedFiles.size} items` : selectedFile?.type}
        </h3>
        <p className="mb-4" style={{ color: 'var(--secondary-text)' }}>
          {selectedFiles.size > 1 
            ? `Are you sure you want to delete ${selectedFiles.size} selected items? This action cannot be undone.`
            : `Are you sure you want to delete "${selectedFile?.name}"? This action cannot be undone.`
          }
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'var(--button-secondary-bg)', 
              color: 'var(--button-secondary-text)',
              border: '1px solid var(--border-color)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ 
              backgroundColor: 'var(--danger-color)',
              color: 'white'
            }}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );

  // Permission Management Modal
  const PermissionModal = () => {
    if (!showPermissionModal || !selectedFile) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
        <div className="rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--primary-text)' }}>
              Change Permissions: {selectedFile.name}
            </h3>
            <button
              onClick={() => setShowPermissionModal(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                color: 'var(--secondary-text)',
                ':hover': { backgroundColor: 'var(--hover-bg)' }
              }}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-auto">
            {permissionLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ownership Section */}
                <div>
                  <h4 className="text-md font-semibold mb-3" style={{ color: 'var(--primary-text)' }}>
                    Ownership
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-text)' }}>
                        Owner
                      </label>
                      <input
                        type="text"
                        value={permissionData.owner}
                        onChange={(e) => setPermissionData(prev => ({ ...prev, owner: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)', 
                          color: 'var(--primary-text)' 
                        }}
                        placeholder="e.g., www-data"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-text)' }}>
                        Group
                      </label>
                      <input
                        type="text"
                        value={permissionData.group}
                        onChange={(e) => setPermissionData(prev => ({ ...prev, group: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)', 
                          color: 'var(--primary-text)' 
                        }}
                        placeholder="e.g., www-data"
                      />
                    </div>
                  </div>
                </div>

                {/* Numeric Permissions */}
                <div>
                  <h4 className="text-md font-semibold mb-3" style={{ color: 'var(--primary-text)' }}>
                    Numeric Permissions (chmod)
                  </h4>
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={permissionData.numericPermissions}
                      onChange={(e) => handleNumericPermissionChange(e.target.value)}
                      className="w-20 px-3 py-2 rounded-md border focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] font-mono text-center"
                      style={{ 
                        backgroundColor: 'var(--input-bg)', 
                        borderColor: 'var(--border-color)', 
                        color: 'var(--primary-text)' 
                      }}
                      placeholder="755"
                      maxLength="3"
                    />
                    <span className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                      Format: Owner Group Other (0-7 each)
                    </span>
                  </div>
                </div>

                {/* Visual Permission Matrix */}
                <div>
                  <h4 className="text-md font-semibold mb-3" style={{ color: 'var(--primary-text)' }}>
                    Permission Matrix
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th className="text-left py-2 px-3" style={{ color: 'var(--secondary-text)' }}></th>
                          <th className="text-center py-2 px-3" style={{ color: 'var(--secondary-text)' }}>Read</th>
                          <th className="text-center py-2 px-3" style={{ color: 'var(--secondary-text)' }}>Write</th>
                          <th className="text-center py-2 px-3" style={{ color: 'var(--secondary-text)' }}>Execute</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'owner', label: 'Owner' },
                          { key: 'group', label: 'Group' },
                          { key: 'other', label: 'Other' }
                        ].map(({ key, label }) => (
                          <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 px-3 font-medium" style={{ color: 'var(--primary-text)' }}>
                              {label}
                            </td>
                            {['read', 'write', 'execute'].map(permission => (
                              <td key={permission} className="text-center py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={permissionData.permissions[key][permission]}
                                  onChange={(e) => handlePermissionChange(key, permission, e.target.checked)}
                                  className="w-4 h-4 text-[var(--accent-color)] rounded focus:ring-[var(--accent-color)]"
                                  style={{ accentColor: 'var(--accent-color)' }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Common Permission Presets */}
                <div>
                  <h4 className="text-md font-semibold mb-3" style={{ color: 'var(--primary-text)' }}>
                    Common Presets
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Read Only', value: '444' },
                      { label: 'Read/Write', value: '644' },
                      { label: 'Full Access', value: '755' },
                      { label: 'Private', value: '600' },
                      { label: 'Group RW', value: '664' },
                      { label: 'All RW', value: '666' },
                      { label: 'Executable', value: '755' },
                      { label: 'Private Exec', value: '700' }
                    ].map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => handleNumericPermissionChange(value)}
                        className="px-3 py-2 text-sm rounded-md border transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: 'var(--secondary-bg)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--primary-text)'
                        }}
                      >
                        {label} ({value})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end p-6 border-t space-x-3" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setShowPermissionModal(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={permissionLoading}
              className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              {permissionLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Save Permissions
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
      if (newItemDropdownRef.current && !newItemDropdownRef.current.contains(e.target)) {
        setShowNewItemDropdown(false);
      }
    };
    const handleScrollOrResize = () => {
      setContextMenu({ ...contextMenu, visible: false });
      setHighlightedRow(null);
      setShowNewItemDropdown(false);
    };

    if (contextMenu.visible || showNewItemDropdown) {
      document.addEventListener('mousedown', handleClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [contextMenu, showNewItemDropdown]);

  // Keep address bar in sync with currentPath
  useEffect(() => {
    if (!currentDomain) {
      // System mode: show absolute path
      setPathInput(currentPath || '/');
    } else {
      // Show absolute-looking path in domain mode using home prefix
      const homePrefix = domainStructure?.home_directory?.replace(/\/$/, '') || '';
      const suffix = currentPath ? `/${currentPath.replace(/^\/+/, '')}` : '';
      setPathInput(homePrefix ? `${homePrefix}${suffix}` : (currentPath || ''));
    }
  }, [currentPath, currentDomain, domainStructure]);

  const handleAddressBarSubmit = (e) => {
    e.preventDefault();
    const input = (pathInput || '').trim();
    if (!input) return;

    const isAbs = input.startsWith('/');
    if (isAbs) {
      // Absolute path
      if (!currentDomain && isAdminUser) {
        // Admin in system mode: go absolute - normalize the path
        const normalizedPath = input.replace(/\/+$/, '') || '/';
        handleDomainChange('', normalizedPath);
      } else {
        // User in domain mode: allow absolute only if under their home directory
        const home = domainStructure?.home_directory?.replace(/\/$/, '') || '';
        if (home && input.startsWith(home)) {
          let rel = input.slice(home.length);
          rel = rel.replace(/^\/+/, '');
          setCurrentPath(normalizePath(rel));
        } else {
          setError('Path is outside your home directory');
        }
      }
    } else {
      // Relative path: in system mode, force leading '/'; in domain mode keep relative
      const normalized = normalizePath(input);
      if (!currentDomain) {
        // System mode: convert relative to absolute path
        const absolutePath = `/${normalized}`.replace(/\/+$/, '') || '/';
        handleDomainChange('', absolutePath);
      } else {
        setCurrentPath(normalized);
      }
    }
  };

  // Quick access buttons for common directories
  const QuickAccessButtons = () => {
    if (!currentDomain || !domainStructure) return null;

    const items = [];

    // Home Directory shortcut for all users (domain mode)
    if (domainStructure?.home_directory) {
      items.push({
        label: 'Home Directory',
        path: '', // root under user's home in domain mode
        icon: HomeIcon,
        color: 'text-indigo-500',
        isAbsolute: false,
        exists: true
      });
    }

    // Document Root shortcut
    const docRootPath = relativeDocRoot || '';
    items.push({ label: 'Document Root', path: docRootPath, icon: GlobeAltIcon, color: 'text-blue-500', exists: true });

    // Common directories (if exist)
    const commonDirs = ['public_html', 'logs', 'backups'];
    const dirMap = domainStructure?.directories || {};
    commonDirs.forEach(dir => {
      const dirInfo = dirMap[dir];
      if (dirInfo && dirInfo.exists) {
        items.push({ label: dir, path: dir, icon: GlobeAltIcon, color: 'text-green-500', exists: true });
      }
    });

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {items.map(({ label, path, icon: Icon, color, isAbsolute, exists }) => (
          <button
            key={label}
            onClick={() => {
              if (isAbsolute) {
                handleDomainChange('', path);
              } else {
                setCurrentPath(path);
              }
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              exists ? 'hover:bg-opacity-80' : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ backgroundColor: 'var(--background-accent)', color: 'var(--primary-text)' }}
            disabled={!exists}
          >
            <Icon className={`w-4 h-4 ${color}`} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    );
  };



  return (
    <div className="h-screen max-h-screen overflow-hidden" style={{ backgroundColor: 'var(--primary-bg)' }}>
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
      
      <div className="flex h-full">
        {/* File Manager Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-6 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
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

            {/* Address Bar */}
            <form onSubmit={handleAddressBarSubmit} className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const path = pathInput || '';
                  if (!path) return;
                  // Compute parent path for both absolute and relative
                  const parts = path.split('/').filter(Boolean);
                  if (parts.length === 0) return;
                  const parent = (path.startsWith('/') ? '/' : '') + parts.slice(0, -1).join('/');
                  if (!currentDomain) {
                    // System mode: navigate absolute
                    handleDomainChange('', parent || '/');
                  } else {
                    // Domain mode: convert to relative using home prefix
                    const home = domainStructure?.home_directory?.replace(/\/$/, '') || '';
                    if (home && (parent || '/').startsWith(home)) {
                      let rel = (parent || '/').slice(home.length);
                      rel = rel.replace(/^\/+/, '');
                      setCurrentPath(normalizePath(rel));
                    } else if (!parent || parent === '/') {
                      setCurrentPath('');
                    }
                  }
                }}
                className="px-3 py-2 rounded-md border"
                style={{ backgroundColor: 'var(--secondary-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-text)' }}
                title="Back"
              >
                ←
              </button>
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder={currentDomain ? 'Type path (relative or absolute)' : 'Type absolute path, e.g., /home/user'}
                className="w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] font-mono text-sm"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-text)' }}
              />
            </form>

            {/* Quick Access Buttons */}
            <div className="flex-shrink-0">
              <QuickAccessButtons />
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" 
                                       style={{ color: 'var(--secondary-text)' }} />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-md border transition-colors focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]"
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
                <div className="relative" ref={newItemDropdownRef}>
                  <button
                    onClick={() => setShowNewItemDropdown(prev => !prev)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-md transition-colors"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      color: 'white'
                    }}
                  >
                    <FolderPlusIcon className="w-4 h-4" />
                    <span>New</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${showNewItemDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showNewItemDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-20">
                      <button
                        onClick={() => {
                          setShowNewFolderModal(true);
                          setShowNewItemDropdown(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <FolderIcon className="w-4 h-4 mr-2" />
                        New Folder
                      </button>
                      <button
                        onClick={() => {
                          setShowNewFileModal(true);
                          setShowNewItemDropdown(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <DocumentPlusIcon className="w-4 h-4 mr-2" />
                        New File
                      </button>
                    </div>
                  )}
                </div>

                <label className="flex items-center space-x-2 px-4 py-2 rounded-md cursor-pointer transition-colors"
                       style={{
                         backgroundColor: 'var(--accent-color)',
                         color: 'white'
                       }}>
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Upload</span>
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e.target.files)} 
                  />
                </label>

                <label className="flex items-center space-x-2 px-4 py-2 rounded-md cursor-pointer transition-colors"
                       style={{
                         backgroundColor: 'var(--accent-color)',
                         color: 'white'
                       }}>
                  <FolderPlusIcon className="w-4 h-4" />
                  <span>Upload Folder</span>
                  <input 
                    type="file"
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      try {
                        setLoading(true);
                        setError(null);
                        await Promise.all(files.map((file) => {
                          const relPath = file.webkitRelativePath || file.relativePath || '';
                          const relDir = relPath.split('/').slice(0, -1).join('/');
                          const targetDir = buildUploadPath(relDir);
                          return fileApi.uploadFile(targetDir, file, currentDomain);
                        }));
                        await loadDirectory(currentPath, true);
                      } catch (err) {
                        const errorMsg = err.response?.data?.error || err.message || 'Failed to upload folder';
                        setError(errorMsg);
                      } finally {
                        setLoading(false);
                        e.target.value = '';
                      }
                    }}
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
            {/* Breadcrumbs removed as requested */}
          </div>

          {/* File List Area */}
          <div className="flex-1 overflow-hidden min-h-0">
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
                      // Save current scroll position before refresh
                      preserveScrollPosition();
                      loadDirectory(currentPath, true);
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
              <div className="h-full relative min-h-0">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300" style={{ backgroundColor: 'var(--primary-bg)/50' }}>
                    <LoadingSpinner />
                    <span className="ml-2 font-medium" style={{ color: 'var(--primary-text)' }}>Loading files...</span>
                  </div>
                )}
                {viewMode === 'list' ? <FileListPanel /> : <FileGrid />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFileEditor && <FileEditor />}
      {showFilePreview && <FilePreview />}
      {showFileProperties && <FilePropertiesModal />}
      {showPermissionModal && <PermissionModal />}
      {showNewFolderModal && <NewFolderModal />}
      {showNewFileModal && <NewFileModal />}
      {showRenameModal && <RenameModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
      
      {/* Context Menu */}
      {contextMenu.visible && <ContextMenu />}
    </div>
  );
};

export default FileManager; 