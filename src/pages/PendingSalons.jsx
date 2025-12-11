import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ImageViewer } from '../components/common/ImageViewer';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { 
  useGetPendingSalonsQuery,
  useApproveVendorRequestMutation,
  useRejectVendorRequestMutation,
  salonApi
} from '../services/api/salonApi';
import { supabase } from '../config/supabase';

export const PendingSalons = () => {
  // RTK Query hooks
  const dispatch = useDispatch();
  const { data: pendingData, isLoading, isFetching } = useGetPendingSalonsQuery();
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
          // Manually update cache instead of full refetch for better performance
          if (payload.eventType === 'INSERT') {
            // Add new request to cache
            dispatch(
              salonApi.util.updateQueryData('getPendingSalons', {}, (draft) => {
                if (draft?.data) {
                  draft.data.unshift(payload.new);
                }
              })
            );
            
            const salonName = payload.new?.business_name || 'New Salon';
            toast.info(`🔔 ${salonName} submitted for approval!`, { 
              autoClose: 5000,
              position: 'top-right',
              theme: 'light',
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update existing request in cache
            dispatch(
              salonApi.util.updateQueryData('getPendingSalons', {}, (draft) => {
                if (draft?.data) {
                  const index = draft.data.findIndex(r => r.id === payload.new.id);
                  if (index !== -1) {
                    draft.data[index] = payload.new;
                  }
                }
              })
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove from cache
            dispatch(
              salonApi.util.updateQueryData('getPendingSalons', {}, (draft) => {
                if (draft?.data) {
                  draft.data = draft.data.filter(r => r.id !== payload.old.id);
                }
              })
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch]);

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
          <div className="text-xs text-gray-500 capitalize">{row.business_type?.replace(/_/g, ' ')}</div>
          <div className="text-sm text-gray-600 mt-1">{row.owner_name}</div>
          <div className="text-xs text-gray-500">{row.owner_email}</div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'city',
      cell: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.city}, {row.state}</div>
          <div className="text-gray-500">{row.pincode}</div>
          {row.latitude && row.longitude && (
            <a 
              href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              📍 Map
            </a>
          )}
        </div>
      ),
    },
    {
      header: 'Business Info',
      accessorKey: 'staff_count',
      cell: (row) => (
        <div className="text-sm">
          {row.staff_count && <div className="text-gray-700">👥 {row.staff_count} staff</div>}
          {row.gst_number && <div className="text-xs text-green-600">✓ GST</div>}
          {row.pan_number && <div className="text-xs text-green-600">✓ PAN</div>}
          {row.opening_time && row.closing_time && (
            <div className="text-xs text-gray-500">🕒 {row.opening_time} - {row.closing_time}</div>
          )}
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
      accessorKey: 'submitted_at',
      cell: (row) => row.submitted_at ? format(new Date(row.submitted_at), 'MMM dd, yyyy HH:mm') : (row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : 'N/A'),
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

  // Only show full-page loader on INITIAL load (no cached data)
  // If we have cached data, show it while refetching in background
  if (isLoading && !pendingData) {
    return <LoadingSpinner size="xl" className="min-h-screen" />;
  }

  return (
    <div className="space-y-6">
      {/* Background refresh indicator */}
      {isFetching && pendingData && (
        <div className="fixed top-16 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Updating...</span>
        </div>
      )}
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Salon Submissions</h1>
        <p className="text-gray-600 mt-1">Review and approve salon submissions from relationship managers</p>
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
                  <p className="text-sm text-gray-600">Business Type</p>
                  <p className="font-medium capitalize">{selectedRequest.business_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Owner Name</p>
                  <p className="font-medium">{selectedRequest.owner_name}</p>
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
                {selectedRequest.latitude && selectedRequest.longitude && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Coordinates</p>
                    <p className="font-medium text-xs flex items-center gap-2">
                      <span>📍 {selectedRequest.latitude.toFixed(6)}, {selectedRequest.longitude.toFixed(6)}</span>
                      <a 
                        href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View on Map →
                      </a>
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">{selectedRequest.business_address}</p>
                </div>
                {selectedRequest.staff_count && (
                  <div>
                    <p className="text-sm text-gray-600">Staff Count</p>
                    <p className="font-medium">👥 {selectedRequest.staff_count} staff members</p>
                  </div>
                )}
              </div>
            </div>

            {/* Legal & Compliance */}
            {(selectedRequest.gst_number || selectedRequest.pan_number || selectedRequest.business_license || selectedRequest.registration_certificate) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Legal & Compliance</h3>
                <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                  {selectedRequest.gst_number && (
                    <div>
                      <p className="text-sm text-gray-600">GST Number</p>
                      <p className="font-mono font-medium">{selectedRequest.gst_number}</p>
                    </div>
                  )}
                  {selectedRequest.pan_number && (
                    <div>
                      <p className="text-sm text-gray-600">PAN Number</p>
                      <p className="font-mono font-medium">{selectedRequest.pan_number}</p>
                    </div>
                  )}
                  {selectedRequest.business_license && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Business License</p>
                      <a 
                        href={selectedRequest.business_license} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        📄 View Document →
                      </a>
                    </div>
                  )}
                  {selectedRequest.registration_certificate && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Registration Certificate</p>
                      <a 
                        href={selectedRequest.registration_certificate} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        📄 View Certificate →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Services from documents.services */}
            {selectedRequest.documents?.services && Array.isArray(selectedRequest.documents.services) && selectedRequest.documents.services.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Services Offered</h3>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    {selectedRequest.documents.services.map((service, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200 flex justify-between items-center">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{service.name}</span>
                          {service.description && (
                            <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-purple-600">₹{service.price}</p>
                          <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Documents */}
            {selectedRequest.documents && Object.keys(selectedRequest.documents).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
                <div className="bg-gray-100 p-4 rounded-lg space-y-3">
                  {Object.entries(selectedRequest.documents)
                    .filter(([key, value]) => {
                      // Skip services (rendered separately above) and empty values
                      if (key === 'services') return false;
                      if (value === null || value === undefined) return false;
                      if (typeof value === 'string' && !value.trim()) return false;
                      return true;
                    })
                    .map(([key, value]) => (
                      <div key={key} className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <div className="text-sm text-gray-600">
                          {typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ? (
                            <a 
                              href={value} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              🔗 View Document →
                            </a>
                          ) : typeof value === 'object' && value !== null ? (
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            <p className="break-words">{String(value)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  {Object.entries(selectedRequest.documents)
                    .filter(([key, value]) => {
                      if (key === 'services') return false;
                      if (value === null || value === undefined) return false;
                      if (typeof value === 'string' && !value.trim()) return false;
                      return true;
                    }).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No additional information</p>
                  )}
                </div>
              </div>
            )}

            {/* Operating Hours */}
            {(selectedRequest.opening_time || selectedRequest.closing_time || selectedRequest.working_days) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Operating Hours</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  {(selectedRequest.opening_time || selectedRequest.closing_time) && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Hours</p>
                      <p className="font-medium text-lg">
                        🕒 {selectedRequest.opening_time || 'N/A'} - {selectedRequest.closing_time || 'N/A'}
                      </p>
                    </div>
                  )}
                  {selectedRequest.working_days && Array.isArray(selectedRequest.working_days) && selectedRequest.working_days.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Working Days</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.working_days.map((day, idx) => (
                          <span key={idx} className="px-3 py-1 bg-white border border-blue-200 rounded-full text-sm font-medium">
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photos */}
            {(selectedRequest.documents?.logo || selectedRequest.cover_image_url || (selectedRequest.gallery_images && selectedRequest.gallery_images.length > 0)) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Photos</h3>
                <div className="grid grid-cols-3 gap-4">
                  {/* Logo */}
                  {selectedRequest.documents?.logo && (
                    <div className="col-span-1">
                      <p className="text-sm text-gray-600 mb-2">Logo</p>
                      <ImageViewer images={selectedRequest.documents.logo}>
                        <div className="relative group overflow-hidden rounded-lg">
                          <img 
                            src={selectedRequest.documents.logo} 
                            alt="Logo" 
                            className="w-full h-32 object-contain bg-gray-50 border border-gray-200 p-2 transition-transform group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black bg-opacity-50 rounded-full p-2">
                              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </ImageViewer>
                    </div>
                  )}
                  {/* Cover Image */}
                  {selectedRequest.cover_image_url && (
                    <div className={selectedRequest.documents?.logo ? "col-span-2" : "col-span-3"}>
                      <p className="text-sm text-gray-600 mb-2">Cover Image</p>
                      <ImageViewer images={selectedRequest.cover_image_url}>
                        <div className="relative group overflow-hidden rounded-lg">
                          <img 
                            src={selectedRequest.cover_image_url} 
                            alt="Cover" 
                            className="w-full h-48 object-cover transition-transform group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black bg-opacity-50 rounded-full p-2">
                              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </ImageViewer>
                    </div>
                  )}
                  {/* Gallery Images */}
                  {selectedRequest.gallery_images && Array.isArray(selectedRequest.gallery_images) && selectedRequest.gallery_images.map((img, idx) => (
                    <div key={idx}>
                      <p className="text-sm text-gray-600 mb-2">Gallery {idx + 1}</p>
                      <ImageViewer images={selectedRequest.gallery_images} initialIndex={idx}>
                        <div className="relative group overflow-hidden rounded-lg">
                          <img 
                            src={img} 
                            alt={`Gallery ${idx + 1}`} 
                            className="w-full h-32 object-cover transition-transform group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black bg-opacity-50 rounded-full p-2">
                              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </ImageViewer>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Offered */}
            {selectedRequest.services_offered && Object.keys(selectedRequest.services_offered).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Services Offered
                </h3>
                <div className="bg-purple-50 p-4 rounded-lg">
                  {typeof selectedRequest.services_offered === 'object' && (
                    <div className="space-y-3">
                      {Object.entries(selectedRequest.services_offered).map(([category, services]) => (
                        <div key={category} className="bg-white p-3 rounded-lg border border-purple-200">
                          <h4 className="font-semibold text-purple-900 mb-2 capitalize">{category.replace(/_/g, ' ')}</h4>
                          <div className="space-y-2">
                            {Array.isArray(services) && services.map((service, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium text-gray-900">{typeof service === 'object' ? service.name : service}</span>
                                  {typeof service === 'object' && service.description && (
                                    <p className="text-xs text-gray-600">{service.description}</p>
                                  )}
                                </div>
                                {typeof service === 'object' && (
                                  <div className="text-right">
                                    {service.price && (
                                      <p className="font-semibold text-purple-600">₹{service.price}</p>
                                    )}
                                    {service.duration_minutes && (
                                      <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RM Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Submitted By</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Relationship Manager</p>
                  <p className="font-medium text-gray-900">{selectedRequest.rm_profile?.profiles?.full_name || 'Unknown RM'}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.rm_profile?.profiles?.email || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.rm_profile?.profiles?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">RM Performance</p>
                  <p className="text-lg font-semibold text-blue-600">{selectedRequest.rm_profile?.total_score || 0} points</p>
                  {selectedRequest.rm_profile?.territories && (
                    <p className="text-xs text-gray-500 mt-1">Territory: {selectedRequest.rm_profile.territories}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created On</p>
                  <p className="text-sm font-medium">
                    {selectedRequest.created_at ? format(new Date(selectedRequest.created_at), 'PPpp') : 'Unknown'}
                  </p>
                </div>
                {selectedRequest.submitted_at && (
                  <div>
                    <p className="text-sm text-gray-600">Submitted On</p>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedRequest.submitted_at), 'PPpp')}
                    </p>
                  </div>
                )}
              </div>
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
