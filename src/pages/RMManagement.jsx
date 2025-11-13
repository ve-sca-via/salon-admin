import { useState } from 'react';
import { toast } from 'react-toastify';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { Table } from '../components/common/Table';
import { useGetAllRMsQuery, useUpdateRMStatusMutation } from '../services/api/userApi';
import { format } from 'date-fns';

export const RMManagement = () => {
  // RTK Query hooks
  const { data: rmsData, isLoading } = useGetAllRMsQuery();
  const [updateRMStatus] = useUpdateRMStatusMutation();
  
  const rms = rmsData?.data || rmsData || [];
  
  const [selectedRM, setSelectedRM] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const openDetailModal = (rm) => {
    setSelectedRM(rm);
    setIsDetailModalOpen(true);
  };

  const columns = [
    {
      header: 'RM Details',
      accessorKey: 'full_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.full_name}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
          <div className="text-sm text-gray-500">{row.phone || 'No phone'}</div>
        </div>
      ),
    },
    {
      header: 'Current Score',
      accessorKey: 'current_score',
      cell: (row) => (
        <div className="flex items-center">
          <div className="text-2xl font-bold text-blue-600">{row.current_score || 0}</div>
          <div className="ml-2 text-sm text-gray-500">points</div>
        </div>
      ),
    },
    {
      header: 'Performance',
      accessorKey: 'id',
      cell: (row) => (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-gray-600">Total Salons:</span>
            <span className="ml-2 font-semibold">{row.total_salons || 0}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Approved:</span>
            <span className="ml-2 font-semibold text-green-600">{row.approved_salons || 0}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Pending:</span>
            <span className="ml-2 font-semibold text-yellow-600">{row.pending_salons || 0}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Joined',
      accessorKey: 'created_at',
      cell: (row) => row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : 'N/A',
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetailModal(row)}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Calculate statistics
  const totalRMs = rms.length;
  const totalScore = rms.reduce((sum, rm) => sum + (rm.current_score || 0), 0);
  const avgScore = totalRMs > 0 ? (totalScore / totalRMs).toFixed(1) : 0;
  const topRM = rms.length > 0 ? rms.reduce((max, rm) => (rm.current_score || 0) > (max.current_score || 0) ? rm : max, rms[0]) : null;

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
          <h1 className="text-3xl font-bold text-gray-900">Relationship Manager Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor RM performance, scores, and salon submissions
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total RMs</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalRMs}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalScore}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{avgScore}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Top Performer</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{topRM?.full_name || 'N/A'}</p>
                <p className="text-sm text-blue-600">{topRM?.current_score || 0} points</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* RMs Table */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Relationship Managers</h2>
          {rms.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No RMs Found</h3>
              <p className="text-gray-600">No relationship managers registered yet</p>
            </div>
          ) : (
            <Table columns={columns} data={rms} />
          )}
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="RM Details & Performance"
      >
        {selectedRM && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-medium">{selectedRM.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{selectedRM.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{selectedRM.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Joined Date</p>
                  <p className="font-medium">
                    {selectedRM.created_at ? format(new Date(selectedRM.created_at), 'PPP') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Score Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Score Details</h3>
              <div className="bg-blue-50 p-6 rounded-lg text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {selectedRM.current_score || 0}
                </div>
                <div className="text-sm text-gray-600">Current Score Points</div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">{selectedRM.total_salons || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Submissions</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedRM.approved_salons || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Approved</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{selectedRM.pending_salons || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Pending Review</div>
                </div>
              </div>
            </div>

            {/* Score History Preview */}
            {selectedRM.score_history && selectedRM.score_history.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Score Activity</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedRM.score_history.slice(0, 10).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.reason}</p>
                        <p className="text-xs text-gray-500">
                          {entry.created_at ? format(new Date(entry.created_at), 'PPp') : 'N/A'}
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${entry.points_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.points_change > 0 ? '+' : ''}{entry.points_change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RMManagement;
