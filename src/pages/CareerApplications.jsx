import { useState } from 'react';
import { 
  useGetCareerApplicationsQuery, 
  useUpdateCareerApplicationMutation,
  useLazyGetDocumentDownloadUrlQuery 
} from '../services/api/careerApi';
import { Card } from '../components/common/Card';
import { SkeletonCard } from '../components/common/Skeleton';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  shortlisted: 'bg-green-100 text-green-800',
  interview_scheduled: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
  hired: 'bg-emerald-100 text-emerald-800'
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' }
];

export const CareerApplications = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  
  const { data, isLoading, refetch } = useGetCareerApplicationsQuery({
    status: statusFilter || undefined
  });
  
  const [updateApplication, { isLoading: isUpdating }] = useUpdateCareerApplicationMutation();
  const [getDocumentUrl] = useLazyGetDocumentDownloadUrlQuery();

  const applications = data?.applications || [];

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = (application) => {
    setSelectedApplication(application);
    setShowUpdateModal(true);
  };

  const handleDownloadDocument = async (documentType) => {
    try {
      const result = await getDocumentUrl({
        applicationId: selectedApplication.id,
        documentType
      }).unwrap();
      
      if (result.download_url) {
        window.open(result.download_url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Career Applications</h1>
          <p className="text-gray-600 mt-1">Manage job applications for RM positions</p>
        </div>
        <Button onClick={() => refetch()} variant="secondary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          // Skeleton stat cards
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <div className="text-sm text-gray-600">Total Applications</div>
              <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
            </Card>
            <Card>
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                {applications.filter(a => a.status === 'pending').length}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-gray-600">Shortlisted</div>
              <div className="text-2xl font-bold text-green-600">
                {applications.filter(a => a.status === 'shortlisted').length}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-gray-600">Hired</div>
              <div className="text-2xl font-bold text-emerald-600">
                {applications.filter(a => a.status === 'hired').length}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Applications Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-40"></div>
                        <div className="h-3 bg-gray-200 rounded w-28"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse h-3 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse h-6 bg-gray-200 rounded-full w-20"></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="animate-pulse flex justify-end gap-2">
                        <div className="h-4 bg-gray-200 rounded w-10"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.full_name}
                          </div>
                          <div className="text-sm text-gray-500">{application.email}</div>
                          <div className="text-sm text-gray-500">{application.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{application.position}</div>
                      <div className="text-sm text-gray-500">{application.current_city || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{application.experience_years} years</div>
                      <div className="text-sm text-gray-500">{application.previous_company || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[application.status]}`}>
                        {STATUS_OPTIONS.find(s => s.value === application.status)?.label || application.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(application)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(application)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedApplication(null);
          }}
          onDownload={handleDownloadDocument}
        />
      )}
      {showUpdateModal && selectedApplication && (
        <UpdateStatusModal
          application={selectedApplication}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedApplication(null);
          }}
          onUpdate={async (data) => {
            try {
              await updateApplication({
                applicationId: selectedApplication.id,
                ...data
              }).unwrap();
              toast.success('Application updated successfully');
              setShowUpdateModal(false);
              setSelectedApplication(null);
              refetch();
            } catch (error) {
              toast.error('Failed to update application');
            }
          }}
          isLoading={isUpdating}
        />
      )}


    </div>
  );
};

// Application Details Modal Component
const ApplicationDetailsModal = ({ application, onClose, onDownload }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const InfoRow = ({ label, value }) => (
    <div>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
      <p className="text-gray-900 font-medium mt-1">{value}</p>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="Application Details" size="lg">
      <div className="max-h-[70vh] overflow-y-auto space-y-5">
        {/* Application Header with Number and Status */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-600">Application #</p>
            <p className="text-lg font-bold text-gray-900 font-mono">{application.application_number || application.id}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Applied on</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(application.created_at)}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Personal Details</h4>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
            <InfoRow label="Full Name" value={application.full_name} />
            <InfoRow label="Phone" value={application.phone} />
            <div className="col-span-2">
              <InfoRow label="Email" value={application.email} />
            </div>
            <InfoRow label="City" value={application.current_city || 'N/A'} />
            <InfoRow label="Relocation" value={application.willing_to_relocate ? 'Yes' : 'No'} />
          </div>
          {application.current_address && (
            <div className="mt-3">
              <InfoRow label="Address" value={application.current_address} />
            </div>
          )}
        </div>

        {/* Job Details */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Position & Experience</h4>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
            <div className="col-span-2">
              <InfoRow label="Position Applied For" value={application.position} />
            </div>
            <InfoRow label="Experience" value={`${application.experience_years} years`} />
            <InfoRow label="Previous Company" value={application.previous_company || 'N/A'} />
            <InfoRow label="Current Salary" value={application.current_salary ? `₹${application.current_salary.toLocaleString('en-IN')}` : 'N/A'} />
            <InfoRow label="Expected Salary" value={application.expected_salary ? `₹${application.expected_salary.toLocaleString('en-IN')}` : 'N/A'} />
            <InfoRow label="Notice Period" value={application.notice_period_days ? `${application.notice_period_days} days` : 'N/A'} />
          </div>
        </div>

        {/* Education */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Education</h4>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
            <InfoRow label="Qualification" value={application.highest_qualification || 'N/A'} />
            <InfoRow label="Graduation Year" value={application.graduation_year || 'N/A'} />
            <div className="col-span-2">
              <InfoRow label="University" value={application.university_name || 'N/A'} />
            </div>
          </div>
        </div>

        {/* Additional Links */}
        {(application.linkedin_url || application.portfolio_url) && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Online Profiles</h4>
            <div className="space-y-2">
              {application.linkedin_url && (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-700">LinkedIn</span>
                  <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Profile →
                  </a>
                </div>
              )}
              {application.portfolio_url && (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-700">Portfolio</span>
                  <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Portfolio →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cover Letter */}
        {application.cover_letter && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Cover Letter</h4>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{application.cover_letter}</p>
            </div>
          </div>
        )}

        {/* Documents */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Documents</h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'resume', label: 'Resume', required: true },
              { key: 'aadhaar', label: 'Aadhaar' },
              { key: 'pan', label: 'PAN' },
              { key: 'photo', label: 'Photo', required: true },
              { key: 'address_proof', label: 'Address Proof', required: true },
              { key: 'experience_letter', label: 'Experience Letter' },
              { key: 'salary_slip', label: 'Salary Slip' },
            ].map(doc => {
              const urlKey = `${doc.key}_url`;
              const hasDoc = application[urlKey];
              return (
                <button
                  key={doc.key}
                  onClick={() => hasDoc && onDownload(doc.key)}
                  disabled={!hasDoc}
                  className={`flex flex-col items-center justify-center px-3 py-3 rounded-lg text-center text-sm font-medium transition-colors ${
                    hasDoc
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  title={hasDoc ? `Download ${doc.label}` : `${doc.label} not uploaded`}
                >
                  <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {doc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Review Information */}
        {(application.admin_notes || application.rejection_reason) && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Admin Review</h4>
            {application.admin_notes && (
              <div className="mb-3 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                <p className="text-xs font-semibold text-blue-800 mb-1">Notes</p>
                <p className="text-sm text-blue-900">{application.admin_notes}</p>
              </div>
            )}
            {application.rejection_reason && (
              <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                <p className="text-xs font-semibold text-red-800 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-900">{application.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

// Update Status Modal Component
const UpdateStatusModal = ({ application, onClose, onUpdate, isLoading }) => {
  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    status: application.status,
    admin_notes: application.admin_notes || '',
    rejection_reason: application.rejection_reason || '',
    interview_location: application.interview_location || '',
    interview_scheduled_at: formatDateTimeLocal(application.interview_scheduled_at)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = { ...formData };
    
    if (submitData.interview_scheduled_at && submitData.interview_scheduled_at.trim() !== '') {
      submitData.interview_scheduled_at = new Date(submitData.interview_scheduled_at).toISOString();
    } else {
      submitData.interview_scheduled_at = null;
    }
    
    if (!submitData.admin_notes || submitData.admin_notes.trim() === '') {
      submitData.admin_notes = null;
    }
    if (!submitData.rejection_reason || submitData.rejection_reason.trim() === '') {
      submitData.rejection_reason = null;
    }
    if (!submitData.interview_location || submitData.interview_location.trim() === '') {
      submitData.interview_location = null;
    }
    
    onUpdate(submitData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Update Application Status" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Applicant Info Header */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
          <p className="text-sm text-blue-900 font-medium">{application.full_name}</p>
          <p className="text-xs text-blue-700">{application.position} • {application.email}</p>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
            New Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            required
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Admin Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
            Admin Notes
          </label>
          <textarea
            value={formData.admin_notes}
            onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Add notes about this application..."
          />
        </div>

        {/* Rejection Reason - Only show when status is rejected */}
        {formData.status === 'rejected' && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <label className="block text-sm font-bold text-red-900 uppercase tracking-wider mb-2">
              Rejection Reason
            </label>
            <textarea
              value={formData.rejection_reason}
              onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Reason for rejection..."
              required
            />
          </div>
        )}

        {/* Interview Details - Only show when status is interview_scheduled */}
        {formData.status === 'interview_scheduled' && (
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 space-y-3">
            <div>
              <label className="block text-sm font-bold text-purple-900 uppercase tracking-wider mb-2">
                Interview Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.interview_scheduled_at}
                onChange={(e) => setFormData({ ...formData, interview_scheduled_at: e.target.value })}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-purple-900 uppercase tracking-wider mb-2">
                Interview Location
              </label>
              <input
                type="text"
                value={formData.interview_location}
                onChange={(e) => setFormData({ ...formData, interview_location: e.target.value })}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Office address or video call link..."
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CareerApplications;
