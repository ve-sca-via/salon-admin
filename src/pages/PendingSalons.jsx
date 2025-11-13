import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { 
  useGetPendingSalonsQuery,
  useApproveVendorRequestMutation,
  useRejectVendorRequestMutation
} from '../services/api/salonApi';
import { supabase } from '../config/supabase';

export const PendingSalons = () => {
  // RTK Query hooks
  const { data: pendingData, isLoading, refetch } = useGetPendingSalonsQuery();
  const [approveRequest] = useApproveVendorRequestMutation();
  const [rejectRequest] = useRejectVendorRequestMutation();
  
  const pendingRequests = pendingData?.data || pendingData || [];
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Subscribe to real-time changes on vendor_join_requests table
    const channel = supabase
      .channel('vendor-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'vendor_join_requests',
          filter: 'status_filter=eq.pending', // Only listen to pending requests
        },
        (payload) => {
          // Refresh the list when any change occurs
          refetch();
          
          // Show toast notification for new submissions with salon name
          if (payload.eventType === 'INSERT') {
            const salonName = payload.new?.business_name || 'New Salon';
            toast.info(`🔔 ${salonName} submitted for approval!`, { 
              autoClose: 5000,
              position: 'top-right',
              theme: 'light',
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleApprove = async () => {
    try {
      setProcessing(true);
      
      const notes = approvalNotes.trim() || `Approved by ${user?.full_name || 'admin'}`;
      
      await approveRequest({
        requestId: selectedRequest.id,
        adminNotes: notes
      }).unwrap();

      toast.success(`${selectedRequest.business_name} has been approved! Registration email sent to owner.`);
      setIsReviewModalOpen(false);
      setApprovalNotes('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error?.data?.detail || 'Failed to approve salon submission');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      
      await rejectRequest({
        requestId: selectedRequest.id,
        adminNotes: rejectionReason
      }).unwrap();

      toast.success(`${selectedRequest.business_name} has been rejected`);
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error?.data?.detail || 'Failed to reject salon submission');
    } finally {
      setProcessing(false);
    }
  };

  const openReviewModal = (request) => {
    setSelectedRequest(request);
    setIsReviewModalOpen(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
  };

  const columns = [
    {
      header: 'Salon Details',
      accessorKey: 'business_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.business_name}</div>
          <div className="text-sm text-gray-500">{row.owner_email}</div>
          <div className="text-sm text-gray-500">{row.owner_phone}</div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'city',
      cell: (row) => (
        <div className="text-sm">
          <div>{row.city}, {row.state}</div>
          <div className="text-gray-500">{row.pincode}</div>
        </div>
      ),
    },
    {
      header: 'Submitted By (RM)',
      accessorKey: 'rm_profile',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.rm_profile?.profiles?.full_name || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{row.rm_profile?.profiles?.email || 'N/A'}</div>
          <div className="text-xs text-blue-600 mt-1">Score: {row.rm_profile?.total_score || 0}</div>
        </div>
      ),
    },
    {
      header: 'Submitted On',
      accessorKey: 'created_at',
      cell: (row) => row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy HH:mm') : 'N/A',
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openReviewModal(row)}
          >
            Review
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner size="xl" className="min-h-screen" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Salon Submissions</h1>
          <p className="text-gray-600 mt-1">Review and approve salon submissions from relationship managers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh</span>
              </>
            )}
          </Button>
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-semibold">
            {pendingRequests.length} Pending
          </div>
        </div>
      </div>

      <Card>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">✓</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending salon submissions at the moment</p>
          </div>
        ) : (
          <Table columns={columns} data={pendingRequests} />
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review Salon Submission"
        size="xl"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Business Name</p>
                  <p className="font-medium">{selectedRequest.business_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Owner Email</p>
                  <p className="font-medium">{selectedRequest.owner_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Owner Phone</p>
                  <p className="font-medium">{selectedRequest.owner_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{selectedRequest.city}, {selectedRequest.state} {selectedRequest.pincode}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">{selectedRequest.business_address}</p>
                </div>
                {selectedRequest.documents?.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-medium">{selectedRequest.documents.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Business Hours */}
            {selectedRequest.documents?.business_hours && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Hours</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedRequest.documents.business_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{day}:</span>
                        <span className="font-medium">{hours || 'Closed'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Images */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Photos</h3>
              <div className="grid grid-cols-3 gap-4">
                {selectedRequest.documents?.cover_image && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Cover Image</p>
                    <img src={selectedRequest.documents.cover_image} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                  </div>
                )}
                {selectedRequest.documents?.logo && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Logo</p>
                    <img src={selectedRequest.documents.logo} alt="Logo" className="w-full h-32 object-contain rounded-lg bg-gray-100" />
                  </div>
                )}
                {selectedRequest.documents?.images && Array.isArray(selectedRequest.documents.images) && selectedRequest.documents.images.map((img, idx) => (
                  <div key={idx}>
                    <p className="text-sm text-gray-600 mb-2">Gallery {idx + 1}</p>
                    <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            {selectedRequest.documents?.services && Array.isArray(selectedRequest.documents.services) && selectedRequest.documents.services.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Services ({selectedRequest.documents.services.length})
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {selectedRequest.documents.services.map((service, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-600">{service.category || 'General'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-purple-600">₹{service.price}</p>
                          {service.discounted_price && (
                            <p className="text-sm text-gray-500 line-through">₹{service.discounted_price}</p>
                          )}
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>⏱️ {service.duration_minutes || 30} minutes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialties */}
            {selectedRequest.documents?.specialties && Array.isArray(selectedRequest.documents.specialties) && selectedRequest.documents.specialties.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.documents.specialties.map((specialty, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* RM Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Submitted by Relationship Manager</p>
              <p className="font-medium text-gray-900">{selectedRequest.rm_profile?.profiles?.full_name || 'Unknown RM'}</p>
              <p className="text-sm text-gray-600">{selectedRequest.rm_profile?.profiles?.email || 'N/A'}</p>
              <p className="text-sm text-gray-500 mt-2">
                RM Score: <span className="font-semibold">{selectedRequest.rm_profile?.total_score || 0}</span>
              </p>
              <p className="text-sm text-gray-500">
                {selectedRequest.created_at ? format(new Date(selectedRequest.created_at), 'PPpp') : 'Unknown date'}
              </p>
            </div>

            {/* Admin Notes (Optional) */}
            <div>
              <label htmlFor="approvalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Approval Notes (Optional)
              </label>
              <textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval (optional)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                If left empty, will default to "Approved by {user?.full_name || 'admin'}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsReviewModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  openRejectModal(selectedRequest);
                }}
                disabled={processing}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={processing}
              >
                {processing ? 'Approving...' : 'Approve Salon'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectionReason('');
        }}
        title="Reject Salon Submission"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting <strong>{selectedRequest?.business_name}</strong>. 
            This will be shared with the relationship manager.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[120px]"
              placeholder="Explain why this submission is being rejected..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectionReason('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PendingSalons;
