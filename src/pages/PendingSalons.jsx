import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Helper function to extract storage path from URL or return path as-is
const extractStoragePath = (urlOrPath) => {
  if (!urlOrPath) return null;
  
  // If it's already a path (doesn't start with http), return as-is
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath;
  }
  
  // Extract path from URL
  try {
    const url = new URL(urlOrPath);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === 'salon-agreement');
    if (bucketIndex !== -1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
  } catch (e) {
    console.error('Failed to parse URL:', e);
  }
  
  return urlOrPath;
};

// Helper function to get signed URL for agreement document
const getAgreementDocumentSignedUrl = async (pathOrUrl) => {
  const path = extractStoragePath(pathOrUrl);
  const token = localStorage.getItem('access_token');
  const response = await axios.get(`${BACKEND_URL}/api/v1/upload/agreement-document/signed-url`, {
    params: { path },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.signedUrl;
};

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
      accessorKey: 'gst_number',
      cell: (row) => (
        <div className="text-sm">
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

  return (
    <div className="space-y-6">
      {/* Background refresh indicator - shows mini spinner while refreshing cached data */}
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
                </div>
              </div>
            )}

            {/* Agreement Document - Highlighted Section */}
            {selectedRequest.registration_certificate && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-300 shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">📄</span>
                  Agreement Document
                </h3>
                <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-100 p-3 rounded-xl">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-base">Salon Agreement Document</p>
                        <p className="text-sm text-gray-600 mt-1">Review the uploaded agreement document before approval</p>
                      </div>
                    </div>
                    <a 
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const signedUrl = await getAgreementDocumentSignedUrl(selectedRequest.registration_certificate);
                          window.open(signedUrl, '_blank', 'noopener,noreferrer');
                        } catch (error) {
                          console.error('Failed to get signed URL:', error);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Agreement Document
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Business Hours & Schedule */}
            {selectedRequest.documents?.business_hours && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📅 Business Hours</h3>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(selectedRequest.documents.business_hours)
                      .filter(([day, hours]) => hours && hours !== 'Closed')
                      .map(([day, hours]) => (
                        <div key={day} className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{day}</p>
                          <p className="text-sm font-medium text-gray-900">{hours}</p>
                        </div>
                      ))}
                  </div>
                  {Object.values(selectedRequest.documents.business_hours || {}).some(h => h === 'Closed') && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold">Closed:</span> {' '}
                        {Object.entries(selectedRequest.documents.business_hours)
                          .filter(([day, hours]) => hours === 'Closed')
                          .map(([day]) => day)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact & Submission Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Information */}
                {(selectedRequest.documents?.email || selectedRequest.documents?.phone) && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span>📞</span> Alternative Contact
                    </h4>
                    <div className="space-y-2">
                      {selectedRequest.documents?.email && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-500 w-16 pt-0.5">Email:</span>
                          <a href={`mailto:${selectedRequest.documents.email}`} className="text-sm font-medium text-green-700 hover:underline break-all">
                            {selectedRequest.documents.email}
                          </a>
                        </div>
                      )}
                      {selectedRequest.documents?.phone && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-500 w-16 pt-0.5">Phone:</span>
                          <a href={`tel:${selectedRequest.documents.phone}`} className="text-sm font-medium text-green-700 hover:underline">
                            {selectedRequest.documents.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Other Documents/Fields */}
                {selectedRequest.documents && Object.entries(selectedRequest.documents)
                  .filter(([key, value]) => {
                    // Skip already displayed fields
                    const skipKeys = ['services', 'business_hours', 'email', 'phone', 'current_step', 'cover_image', 'logo', 'cover_photo', 'images', 'gallery'];
                    if (skipKeys.includes(key)) return false;
                    if (value === null || value === undefined) return false;
                    if (typeof value === 'string' && !value.trim()) return false;
                    return true;
                  }).length > 0 && (
                  <div className="md:col-span-2">
                    {Object.entries(selectedRequest.documents)
                      .filter(([key, value]) => {
                        const skipKeys = ['services', 'business_hours', 'email', 'phone', 'current_step', 'cover_image', 'logo', 'cover_photo', 'images', 'gallery'];
                        if (skipKeys.includes(key)) return false;
                        if (value === null || value === undefined) return false;
                        if (typeof value === 'string' && !value.trim()) return false;
                        return true;
                      })
                      .map(([key, value]) => (
                        <div key={key} className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>📝</span> {key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </h4>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            {typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ? (
                              <a 
                                href={value} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm font-medium"
                              >
                                🔗 View Document →
                              </a>
                            ) : typeof value === 'object' && value !== null ? (
                              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-48">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{String(value)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Photos Gallery */}
            {(() => {
              const allImages = [];
              
              if (selectedRequest.documents?.logo) {
                allImages.push({ url: selectedRequest.documents.logo, label: 'Logo', type: 'logo' });
              }
              // Use cover_image_url (primary) or fallback to documents.cover_image
              const coverImage = selectedRequest.cover_image_url || selectedRequest.documents?.cover_image;
              if (coverImage) {
                allImages.push({ url: coverImage, label: 'Cover', type: 'cover' });
              }
              if (selectedRequest.gallery_images && Array.isArray(selectedRequest.gallery_images)) {
                selectedRequest.gallery_images.forEach((img, idx) => {
                  allImages.push({ url: img, label: `Gallery ${idx + 1}`, type: 'gallery' });
                });
              }
              
              return allImages.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📸 Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {allImages.map((image, idx) => (
                      <ImageViewer key={idx} images={allImages.map(img => img.url)} initialIndex={idx}>
                        <div className="relative group rounded-lg cursor-pointer bg-gray-50 border-2 border-gray-200 hover:border-purple-400 transition-all overflow-hidden">
                          <div className="relative w-full bg-white" style={{ paddingBottom: '100%' }}>
                            <img 
                              src={image.url} 
                              alt={image.label} 
                              className={`absolute inset-0 w-full h-full transition-transform group-hover:scale-110 ${
                                image.type === 'logo' ? 'object-contain p-3' : 'object-cover'
                              }`}
                              loading="eager"
                            />
                          </div>
                          <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-40 transition-all flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white rounded-full p-2 shadow-lg">
                                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-2 pointer-events-none">
                            <p className="text-white text-xs font-medium text-center drop-shadow-lg">{image.label}</p>
                          </div>
                        </div>
                      </ImageViewer>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

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
