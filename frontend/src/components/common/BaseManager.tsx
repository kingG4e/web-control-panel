import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Table from '../ui/Table';

interface Column {
  key: string;
  label: string;
  render?: (value: any, item: any) => React.ReactNode;
}

interface Action {
  icon: React.ComponentType<any>;
  label: string;
  onClick: (item: any) => void;
}

interface BaseManagerProps {
  title: string;
  entity: string;
  columns: Column[];
  actions: Action[];
  endpoint: string;
  addModalContent?: React.ReactNode;
  onAdd?: () => void;
  onDelete?: (id: string | number) => void;
}

const BaseManager: React.FC<BaseManagerProps> = ({
  title,
  entity,
  columns,
  actions,
  endpoint,
  addModalContent,
  onAdd,
  onDelete
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [endpoint]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(endpoint);
      setItems(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await axios.delete(`${endpoint}/${id}`);
      if (onDelete) {
        onDelete(id);
      }
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[var(--primary-text)]">{title}</h1>
        <Button
          onClick={() => onAdd ? onAdd() : setShowAddModal(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add {entity}</span>
        </Button>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((column) => (
                  <td key={`${item.id}-${column.key}`}>
                    {column.render
                      ? column.render(item[column.key], item)
                      : item[column.key]}
                  </td>
                ))}
                <td>
                  <div className="flex space-x-2">
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        onClick={() => action.onClick(item)}
                        variant="ghost"
                        size="sm"
                      >
                        <action.icon className="w-5 h-5" />
                        <span className="sr-only">{action.label}</span>
                      </Button>
                    ))}
                    <Button
                      onClick={() => handleDelete(item.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-5 h-5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {showAddModal && addModalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            {addModalContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseManager; 