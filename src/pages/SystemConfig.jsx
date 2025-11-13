import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { getSystemConfigs, updateSystemConfig } from '../services/backendApi';

export const SystemConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await getSystemConfigs();
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
    setEditingKey(config.key);
    setEditValue(config.value);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async (key) => {
    try {
      setSaving(true);
      await updateSystemConfig(key, editValue);
      toast.success('Configuration updated successfully');
      setEditingKey(null);
      fetchConfigs();
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const getConfigDescription = (key) => {
    const descriptions = {
      'vendor_registration_fee': 'One-time fee vendors pay after approval to activate their account',
      'booking_convenience_fee': 'Platform fee added to each booking (in addition to service price)',
      'rm_score_per_approval': 'Points awarded to RM when their submitted salon is approved',
      'rm_score_per_completed_booking': 'Points awarded to RM for each completed booking at their salons',
      'free_services_limit': 'Maximum number of free services a vendor can offer (0 = unlimited)',
      'staff_limit': 'Maximum number of staff members per salon (0 = unlimited)',
    };
    return descriptions[key] || '';
  };

  const getConfigCategory = (key) => {
    if (key.includes('fee')) return 'Payments';
    if (key.includes('rm_score')) return 'RM Scoring';
    if (key.includes('limit')) return 'Limits';
    return 'General';
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    const category = getConfigCategory(config.key);
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
            Manage dynamic fees, RM scoring, and platform limits
          </p>
        </div>
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
              {category === 'Limits' && (
                <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {category}
            </h2>

            <div className="space-y-4">
              {categoryConfigs.map((config) => (
                <div
                  key={config.key}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {config.key.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {getConfigDescription(config.key)}
                      </p>

                      {editingKey === config.key ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter value"
                          />
                          <Button
                            onClick={() => handleSave(config.key)}
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
                              {config.key.includes('fee') && '₹'}
                              {config.value}
                              {config.key.includes('score') && ' points'}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleEdit(config)}
                            variant="secondary"
                            size="sm"
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Last updated: {new Date(config.updated_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">💡 Configuration Tips</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Registration Fee:</strong> Higher fees may reduce spam applications but could deter legitimate vendors</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Convenience Fee:</strong> This is your platform revenue per booking - balance between profitability and competitiveness</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>RM Scoring:</strong> Higher approval scores incentivize quality over quantity. Booking completion scores reward long-term relationships</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Limits:</strong> Set to 0 for unlimited. Use limits to control platform quality and prevent abuse</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
