import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderIcon,
  DocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';

const FileManager = () => {
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState('/Project Files');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/Project Files']));
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const contextMenuRef = useRef(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sample data - replace with actual API data
  const files = [
    { 
      name: 'Project Files', 
      type: 'folder', 
      modifiedAt: new Date().toISOString(),
      items: [
        { 
          name: 'index.html', 
          type: 'file', 
          size: '2.1 KB', 
          modifiedAt: '2024-03-15T10:30:00Z',
          content: '<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>' 
        },
        { 
          name: 'src', 
          type: 'folder', 
          modifiedAt: '2024-03-14T15:45:00Z',
          items: [
            { 
              name: 'styles.css', 
              type: 'file', 
              size: '1.2 KB',
              modifiedAt: '2024-03-14T15:45:00Z'
            },
            { 
              name: 'app.js', 
              type: 'file', 
              size: '1.5 KB',
              modifiedAt: '2024-03-14T16:20:00Z',
              content: 'console.log("Hello World");' 
            }
          ]
        },
        { 
          name: 'assets', 
          type: 'folder', 
          modifiedAt: '2024-03-13T09:15:00Z',
          items: [
            { 
              name: 'logo.png', 
              type: 'file', 
              size: '50 KB',
              modifiedAt: '2024-03-13T09:15:00Z'
            },
            { 
              name: 'background.jpg', 
              type: 'file', 
              size: '250 KB',
              modifiedAt: '2024-03-13T09:15:00Z'
            }
          ]
        }
      ]
    },
    { 
      name: 'readme.txt', 
      type: 'file', 
      size: '156 B',
      modifiedAt: '2024-03-12T11:20:00Z',
      content: 'This is a readme file.' 
    }
  ];

  const isTextFile = (filename) => {
    const textExtensions = ['.txt', '.html', '.css', '.js', '.json', '.md', '.xml', '.csv'];
    return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const handleFileClick = (file) => {
    if (file.type === 'folder') {
      setCurrentPath(prev => `${prev}/${file.name}`);
    } else if (isTextFile(file.name)) {
      setSelectedFile(file);
      setFileContent(file.content || '');
      setShowFileEditor(true);
    }
  };

  const FileEditor = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            Editing: {selectedFile?.name}
          </h3>
          <button
            onClick={() => setShowFileEditor(false)}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-full min-h-[400px] p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)] font-mono"
          />
        </div>
        <div className="flex justify-end p-4 border-t border-[var(--border-color)] space-x-3">
          <button
            onClick={() => setShowFileEditor(false)}
            className="px-4 py-2 text-[var(--text-primary)] bg-[var(--hover-bg)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle save file
              console.log('Saving file:', selectedFile?.name, fileContent);
              setShowFileEditor(false);
            }}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  // Breadcrumbs for right panel
  const Breadcrumbs = () => {
    const paths = currentPath.split('/').filter(Boolean);
    return (
      <div className="flex items-center space-x-2 text-sm mb-4 font-medium text-gray-400">
        <span>/</span>
        {paths.map((path, idx) => (
          <React.Fragment key={idx}>
            <button
              onClick={() => setCurrentPath('/' + paths.slice(0, idx + 1).join('/'))}
              className="hover:text-blue-500 text-gray-200 transition-colors"
            >
              {path}
            </button>
            {idx < paths.length - 1 && <span>/</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const ActionButtons = () => (
    <div className="flex items-center space-x-2 mb-6">
      <button
        onClick={() => setShowNewFolderModal(true)}
        className="flex items-center px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Folder
      </button>

      <label className="flex items-center px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors cursor-pointer">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload Files
        <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
      </label>
    </div>
  );

  // Helper to find folder by path
  const findFolderByPath = (items, pathArr) => {
    if (pathArr.length === 0) return { items };
    const [head, ...rest] = pathArr;
    const found = items.find(i => i.name === head && i.type === 'folder');
    if (!found) return null;
    if (rest.length === 0) return found;
    return findFolderByPath(found.items, rest);
  };

  // Get current folder's items for right panel
  const currentPathArr = currentPath.split('/').filter(Boolean);
  const currentFolder = findFolderByPath(files, currentPathArr) || { items: [] };
  const rightPanelItems = currentFolder.items || [];

  const TreeView = () => {
    const toggleFolder = (path) => {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(path)) {
          newSet.delete(path);
        } else {
          newSet.add(path);
        }
        return newSet;
      });
    };

    const renderTreeItem = (item, path = '', depth = 0) => {
      const itemPath = `${path}/${item.name}`;
      const isExpanded = expandedFolders.has(itemPath);
      const isSelected = currentPath === itemPath;
      
      return (
        <div key={itemPath}>
          <div
            style={{ paddingLeft: `${depth * 16}px` }}
            className={`flex items-center py-2 px-3 rounded-lg cursor-pointer group transition-all duration-200
              ${isSelected 
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'}`}
            onClick={() => item.type === 'folder' ? setCurrentPath(itemPath) : handleFileClick(item)}
          >
            {item.type === 'folder' && (
              <button
                onClick={e => { e.stopPropagation(); toggleFolder(itemPath); }}
                className={`p-0.5 mr-1 text-gray-400 hover:text-blue-500 transition-colors transform ${isExpanded ? 'rotate-90' : ''}`}
                tabIndex={-1}
              >
                {isExpanded ? (
                  <ChevronRightIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            )}
            {item.type === 'folder' ? (
              <FolderIcon className={`w-5 h-5 mr-2 ${isSelected ? 'text-blue-500' : 'text-yellow-400'}`} />
            ) : (
              <DocumentIcon className={`w-5 h-5 mr-2 ${isSelected ? 'text-blue-500' : 'text-blue-400'}`} />
            )}
            <span className={`flex-1 truncate text-sm ${isSelected ? 'font-medium' : ''}`}>{item.name}</span>
          </div>
          {item.type === 'folder' && isExpanded && item.items && (
            <div className="ml-2">
              {item.items.map(subItem => renderTreeItem(subItem, itemPath, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="h-full overflow-y-auto pr-1.5 space-y-0.5">
        {files.map(file => renderTreeItem(file, '', 0))}
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

  const FileListPanel = () => {
    // Drag & Drop handlers
    const dragCounter = useRef(0);

    const onDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      setIsDragging(true);
    };
    const onDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDragging(false);
    };
    const onDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    };

    return (
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 h-full overflow-hidden flex flex-col shadow-sm relative"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {currentPath.split('/').pop() || 'Root'}
            </h1>
            <Breadcrumbs />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FolderPlusIcon className="w-4 h-4 mr-2" />
              New Folder
            </button>
            <label className="inline-flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
              <DocumentPlusIcon className="w-4 h-4 mr-2" />
              Upload Files
              <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rightPanelItems.map((item, idx) => (
                <tr
                  key={item.name + idx}
                  className={`group transition-colors duration-150 ${selectedFile?.name === item.name || highlightedRow === item.name ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item });
                    setHighlightedRow(item.name);
                  }}
                  onDoubleClick={() => {
                    if (item.type === 'file' && isTextFile(item.name)) {
                      handleFileClick(item);
                    }
                  }}
                >
                  <td className="py-3 px-4">
                    <span className="flex items-center">
                      {item.type === 'folder' ? (
                        <FolderIcon className="w-5 h-5 mr-2 text-yellow-400" />
                      ) : (
                        <DocumentIcon className="w-5 h-5 mr-2 text-blue-400" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{item.type}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {item.size || (item.items ? `${item.items.length} items` : '')}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(item.modifiedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Context Menu */}
          {contextMenu.visible && (
            <div
              ref={contextMenuRef}
              className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] animate-fade-in"
              style={{ top: contextMenu.y + 4, left: contextMenu.x + 4 }}
              role="menu"
              tabIndex={-1}
            >
              {/* Pointer arrow */}
              <div className="absolute -top-2 left-4 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45 z-10"></div>
              {contextMenu.item?.type === 'file' && (
                <>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    onClick={() => {
                      handleFileClick(contextMenu.item);
                      setContextMenu({ ...contextMenu, visible: false });
                      setHighlightedRow(null);
                    }}
                    role="menuitem"
                  >
                    <PencilIcon className="w-4 h-4" /> Edit
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    onClick={() => {
                      setShowRenameModal(true);
                      setSelectedFile(contextMenu.item);
                      setContextMenu({ ...contextMenu, visible: false });
                      setHighlightedRow(null);
                    }}
                    role="menuitem"
                  >
                    <ChevronRightIcon className="w-4 h-4" /> Rename
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    onClick={() => {
                      handleDownload(contextMenu.item);
                      setContextMenu({ ...contextMenu, visible: false });
                      setHighlightedRow(null);
                    }}
                    role="menuitem"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" /> Download
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                </>
              )}
              {contextMenu.item?.type === 'folder' && (
                <>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    onClick={() => {
                      setShowRenameModal(true);
                      setSelectedFile(contextMenu.item);
                      setContextMenu({ ...contextMenu, visible: false });
                      setHighlightedRow(null);
                    }}
                    role="menuitem"
                  >
                    <ChevronRightIcon className="w-4 h-4" /> Rename
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                </>
              )}
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600"
                onClick={() => {
                  setSelectedFile(contextMenu.item);
                  setShowDeleteConfirm(true);
                  setContextMenu({ ...contextMenu, visible: false });
                  setHighlightedRow(null);
                }}
                role="menuitem"
              >
                <TrashIcon className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
        {isDragging && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-blue-500/10 border-4 border-blue-400 border-dashed rounded-2xl pointer-events-none animate-fade-in">
            <div className="text-blue-700 dark:text-blue-200 text-lg font-semibold flex flex-col items-center gap-2">
              <ArrowDownTrayIcon className="w-10 h-10 mb-2" />
              Drop files to upload
            </div>
          </div>
        )}
      </div>
    );
  };

  const NewFolderModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Create New Folder</h3>
        <input
          type="text"
          placeholder="Folder name"
          className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
        />
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={() => setShowNewFolderModal(false)}
            className="px-4 py-2 text-[var(--text-primary)] bg-[var(--hover-bg)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle create folder
              setShowNewFolderModal(false);
            }}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );

  const RenameModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Rename {selectedFile?.type}</h3>
        <input
          type="text"
          defaultValue={selectedFile?.name}
          className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
        />
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={() => setShowRenameModal(false)}
            className="px-4 py-2 text-[var(--text-primary)] bg-[var(--hover-bg)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle rename
              setShowRenameModal(false);
            }}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Delete {selectedFile?.type}</h3>
        <p className="text-[var(--text-secondary)] mb-4">
          Are you sure you want to delete "{selectedFile?.name}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 text-[var(--text-primary)] bg-[var(--hover-bg)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle delete
              setShowDeleteConfirm(false);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const handleFileUpload = (files) => {
    // Handle file upload
    console.log('Uploading files:', files);
  };

  const handleDownload = (file) => {
    // Handle file download
    console.log('Downloading file:', file);
  };

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
    <div className="max-w-[1400px] mx-auto py-8 px-4 h-[calc(100vh-theme(spacing.32))] flex gap-6">
      <div className="w-72 h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex flex-col">
        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-2 pt-2">Folders</div>
        <div className="flex-1 overflow-hidden">
          <TreeView />
        </div>
      </div>
      <div className="flex-1 h-full">
        <FileListPanel />
      </div>
      {showNewFolderModal && <NewFolderModal />}
      {showRenameModal && <RenameModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
      {showFileEditor && <FileEditor />}
    </div>
  );
};

export default FileManager; 