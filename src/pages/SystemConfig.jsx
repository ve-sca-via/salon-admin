import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useGetSystemConfigsQuery, useUpdateSystemConfigMutation, useCreateSystemConfigMutation, useDeleteSystemConfigMutation } from '../services/api/configApi';

export const SystemConfig = () => {
  const { data: configsData, isLoading, error } = useGetSystemConfigsQuery();
  const [updateConfig] = useUpdateSystemConfigMutation();
  const [createConfig] = useCreateSystemConfigMutation();
  const [deleteConfig] = useDeleteSystemConfigMutation();

  // Backend returns array directly, wrapped by axiosBaseQuery in { data: [...] }
  // So configsData is already the array
  const configs = Array.isArray(configsData) ? configsData : (configsData?.data || []);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    config_value: '',
    config_type: 'string',
    description: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showValue, setShowValue] = useState({});
  const [menuOpen, setMenuOpen] = useState(null);
  
  // Create modal form state
  const [newConfig, setNewConfig] = useState({
    config_key: '',
    config_value: '',
    config_type: 'string',
    description: '',
    is_active: true
  });

  const handleEdit = (config) => {
    setEditingId(config.id);
    setEditForm({
      config_value: config.config_value,
      config_type: config.config_type || 'string',
      description: config.description || '',
      is_active: config.is_active !== undefined ? config.is_active : true
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      config_value: '',
      config_type: 'string',
      description: '',
      is_active: true
    });
  };

  const handleSave = async (configKey) => {
    try {
      setSaving(true);
      await updateConfig({ 
        configKey, 
        data: editForm
      }).unwrap();
      toast.success('Configuration updated successfully');
      setEditingId(null);
    } catch (error) {
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
      await deleteConfig(configKey).unwrap();
      toast.success('Configuration deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete configuration');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newConfig.config_key || !newConfig.config_value) {
      toast.error('Config key and value are required');
      return;
    }

    try {
      setSaving(true);
      await createConfig(newConfig).unwrap();
      toast.success('Configuration created successfully');
      setShowCreateModal(false);
      // Reset form
      setNewConfig({
        config_key: '',
        config_value: '',
        config_type: 'string',
        description: '',
        is_active: true
      });
    } catch (error) {
      toast.error(error?.data?.detail || error.message || 'Failed to create configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewConfig({
      config_key: '',
      config_value: '',
      config_type: 'string',
      description: '',
      is_active: true
    });
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

  const toggleShowValue = (configId) => {
    setShowValue(prev => ({ ...prev, [configId]: !prev[configId] }));
  };

  const toggleMenu = (configId) => {
    setMenuOpen(prev => prev === configId ? null : configId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (menuOpen) setMenuOpen(null);
    };
    
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  const groupedConfigs = configs.reduce((acc, config) => {
    const category = getConfigCategory(config.config_key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {});

  // Show error state if API call failed
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-600 mt-1">
            Manage fees, limits, and platform settings
          </p>
        </div>

        <Card>
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Configurations</h3>
            <p className="text-gray-600 mb-4">
              Error: {error?.data?.detail || error?.message || 'Unknown error'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Status: {error?.status || 'N/A'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show empty state if no configs
  if (configs.length === 0) {
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

        <Card>
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No System Configurations</h3>
            <p className="text-gray-600 mb-4">
              The system_config table is empty. Add your first configuration to get started.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Example configurations: platform_fee, rm_commission, booking_limit, etc.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              + Add First Config
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Loading Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-blue-700 font-medium">Loading...</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            Manage fees, limits, and platform settings
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Config
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

            <div className="space-y-3">
              {categoryConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`border rounded-lg p-5 transition-all duration-200 ${
                    editingId === config.id 
                      ? 'border-blue-400 bg-blue-50 shadow-md' 
                      : !config.is_active 
                        ? 'opacity-60 bg-gray-50 border-gray-200' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {config.config_key}
                        </h3>
                        {!config.is_active && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                            Inactive
                          </span>
                        )}
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {config.config_type}
                        </span>
                      </div>
                      
                      {editingId === config.id ? (
                        <div className="space-y-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Value <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={editForm.config_value}
                              onChange={(e) => setEditForm({ ...editForm, config_value: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter value"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              value={editForm.config_type}
                              onChange={(e) => setEditForm({ ...editForm, config_type: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="json">JSON</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Describe what this configuration does"
                              rows={2}
                            />
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`edit_active_${config.id}`}
                              checked={editForm.is_active}
                              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`edit_active_${config.id}`} className="ml-2 text-sm font-medium text-gray-700">
                              Active
                            </label>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <Button
                              onClick={() => handleSave(config.config_key)}
                              disabled={saving}
                              size="sm"
                            >
                              {saving ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Save Changes
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleCancel}
                              variant="secondary"
                              size="sm"
                              disabled={saving}
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {config.description && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {config.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-base font-semibold text-gray-900">
                                  {isSensitiveConfig(config.config_key) ? (
                                    showValue[config.id] ? config.config_value : '••••••••••••'
                                  ) : (
                                    config.config_value
                                  )}
                                </span>
                                {isSensitiveConfig(config.config_key) && (
                                  <button
                                    onClick={() => toggleShowValue(config.id)}
                                    className="ml-3 text-gray-500 hover:text-gray-700 transition-colors"
                                    title={showValue[config.id] ? 'Hide value' : 'Show value'}
                                  >
                                    {showValue[config.id] ? (
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {editingId !== config.id && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(config.id);
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="More options"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {menuOpen === config.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                handleEdit(config);
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                            >
                              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Configuration
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button
                              onClick={() => {
                                handleDelete(config.config_key);
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Configuration
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {editingId !== config.id && (
                    <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(config.updated_at).toLocaleString()}
                        </span>
                        {config.updated_by && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {config.updated_by}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400">ID: {config.id}</span>
                    </div>
                  )}
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

      {/* Create Config Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        title="Create New Configuration"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Configuration Guidelines</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Use snake_case for config keys (e.g., platform_fee)</li>
                  <li>Provide clear descriptions for future reference</li>
                  <li>Changes take effect immediately after creation</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Config Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newConfig.config_key}
              onChange={(e) => setNewConfig({ ...newConfig, config_key: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g., platform_fee, max_bookings"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Use lowercase with underscores (snake_case)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Config Type
            </label>
            <select
              value={newConfig.config_type}
              onChange={(e) => setNewConfig({ ...newConfig, config_type: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="string">String - Text values</option>
              <option value="number">Number - Numeric values</option>
              <option value="boolean">Boolean - True/False</option>
              <option value="json">JSON - Complex objects</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Config Value <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newConfig.config_value}
              onChange={(e) => setNewConfig({ ...newConfig, config_value: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter configuration value"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newConfig.description}
              onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Describe what this configuration does and how it's used"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Help others understand the purpose of this configuration
            </p>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="is_active"
              checked={newConfig.is_active}
              onChange={(e) => setNewConfig({ ...newConfig, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-3 text-sm font-medium text-gray-700">
              Set as Active
            </label>
            <span className="ml-auto text-xs text-gray-500">
              {newConfig.is_active ? '✓ Will be active' : 'Will be inactive'}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={saving}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
