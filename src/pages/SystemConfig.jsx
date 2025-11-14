import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { getSystemConfigs, updateSystemConfig, createSystemConfig, deleteSystemConfig } from '../services/backendApi';

export const SystemConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await getSystemConfigs();
      // Filter out sensitive configs from display (but admin can see them)
      setConfigs(data);
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast.error('Failed to load system configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleEdit = (config) => {
    setEditingId(config.id);
    setEditValue(config.config_value);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (configKey) => {
    try {
      setSaving(true);
      await updateSystemConfig(configKey, { config_value: editValue });
      toast.success('Configuration updated successfully');
      setEditingId(null);
      fetchConfigs();
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error(error.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (configKey) => {
    if (!window.confirm(`Are you sure you want to delete "${configKey}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteSystemConfig(configKey);
      toast.success('Configuration deleted successfully');
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error(error.message || 'Failed to delete configuration');
    }
  };

  const getConfigCategory = (key) => {
    if (key.includes('fee') || key.includes('commission')) return 'Payments';
    if (key.includes('rm_score')) return 'RM Scoring';
    if (key.includes('limit') || key.includes('max') || key.includes('window')) return 'Limits & Rules';
    if (key.includes('razorpay') || key.includes('key') || key.includes('secret')) return '🔒 Sensitive';
    return 'General';
  };

  const isSensitiveConfig = (key) => {
    return key.includes('key') || key.includes('secret') || key.includes('password');
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    const category = getConfigCategory(config.config_key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-600 mt-1">
            Manage fees, limits, and platform settings
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Add New Config
        </Button>
      </div>

      {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
        <Card key={category}>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              {category === 'Payments' && (
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
              {category === 'RM Scoring' && (
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              )}
              {category.includes('Sensitive') && (
                <svg className="w-5 h-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {category}
            </h2>

            <div className="space-y-4">
              {categoryConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`border rounded-lg p-4 hover:border-blue-300 transition-colors ${
                    !config.is_active ? 'opacity-50 bg-gray-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {config.config_key}
                        </h3>
                        {!config.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          {config.config_type}
                        </span>
                      </div>
                      
                      {config.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {config.description}
                        </p>
                      )}

                      {editingId === config.id ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter value"
                          />
                          <Button
                            onClick={() => handleSave(config.config_key)}
                            disabled={saving}
                            size="sm"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            onClick={handleCancel}
                            variant="secondary"
                            size="sm"
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="px-4 py-2 bg-gray-50 rounded-md border border-gray-200">
                            <span className="font-mono text-lg font-semibold text-gray-900">
                              {isSensitiveConfig(config.config_key) && config.config_value ? '••••••••' : config.config_value}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleEdit(config)}
                            variant="secondary"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <button
                            onClick={() => handleDelete(config.config_key)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 border border-red-300 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Last updated: {new Date(config.updated_at).toLocaleString()}
                    {config.updated_by && ` by ${config.updated_by}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}

      {configs.length === 0 && !isLoading && (
        <Card>
          <div className="p-12 text-center">
            <p className="text-gray-500">No configurations found. Create one to get started.</p>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">💡 Configuration Tips</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Convenience Fee:</strong> Platform revenue per booking - balance profitability with competitiveness</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>RM Scoring:</strong> Higher scores incentivize quality relationships over quantity</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Sensitive Values:</strong> API keys and secrets are masked in the UI for security</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Changes take effect immediately</strong> - be careful when modifying live configs</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
