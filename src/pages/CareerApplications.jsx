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

      {/* Update Status Modal */}
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
  return (
    <Modal isOpen={true} onClose={onClose} title="Application Details" size="2xl">
      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
            Personal Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-gray-900">{application.full_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{application.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900">{application.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current City</label>
              <p className="text-gray-900">{application.current_city || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-900">{application.current_address || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Willing to Relocate</label>
              <p className="text-gray-900">{application.willing_to_relocate ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
            Job Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Position</label>
              <p className="text-gray-900">{application.position}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Experience</label>
              <p className="text-gray-900">{application.experience_years} years</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Previous Company</label>
              <p className="text-gray-900">{application.previous_company || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current Salary</label>
              <p className="text-gray-900">
                {application.current_salary ? `₹${application.current_salary.toLocaleString('en-IN')}` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Expected Salary</label>
              <p className="text-gray-900">
                {application.expected_salary ? `₹${application.expected_salary.toLocaleString('en-IN')}` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Notice Period</label>
              <p className="text-gray-900">{application.notice_period_days ? `${application.notice_period_days} days` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Education */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
            Education
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Highest Qualification</label>
              <p className="text-gray-900">{application.highest_qualification || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">University</label>
              <p className="text-gray-900">{application.university_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Graduation Year</label>
              <p className="text-gray-900">{application.graduation_year || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
            Documents
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {application.resume_url && (
              <button
                onClick={() => onDownload('resume')}
                className="flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Resume
              </button>
            )}
            {application.aadhaar_url && (
              <button
                onClick={() => onDownload('aadhaar')}
                className="flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Aadhaar Card
              </button>
            )}
            {application.pan_url && (
              <button
                onClick={() => onDownload('pan')}
                className="flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PAN Card
              </button>
            )}
            {application.photo_url && (
              <button
                onClick={() => onDownload('photo')}
                className="flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photo
              </button>
            )}
            {application.address_proof_url && (
              <button
                onClick={() => onDownload('address_proof')}
                className="flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Address Proof
              </button>
            )}
            {application.experience_letter_url && (
              <button
                onClick={() => onDownload('experience_letter')}
                className="flex items-center justify-center px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Experience Letter
              </button>
            )}
            {application.salary_slip_url && (
              <button
                onClick={() => onDownload('salary_slip')}
                className="flex items-center justify-center px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Salary Slip
              </button>
            )}
          </div>
        </div>

        {/* Additional Info */}
        {(application.cover_letter || application.linkedin_url || application.portfolio_url) && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
              Additional Information
            </h3>
            {application.cover_letter && (
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-500">Cover Letter</label>
                <p className="text-gray-900 whitespace-pre-wrap">{application.cover_letter}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {application.linkedin_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">LinkedIn</label>
                  <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {application.linkedin_url}
                  </a>
                </div>
              )}
              {application.portfolio_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Portfolio</label>
                  <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {application.portfolio_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Info */}
        {(application.admin_notes || application.rejection_reason) && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
              Review Information
            </h3>
            {application.admin_notes && (
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                <p className="text-gray-900">{application.admin_notes}</p>
              </div>
            )}
            {application.rejection_reason && (
              <div>
                <label className="text-sm font-medium text-gray-500">Rejection Reason</label>
                <p className="text-red-600">{application.rejection_reason}</p>
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
  // Format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
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
    
    // Prepare data for submission
    const submitData = { ...formData };
    
    // Convert datetime-local to ISO format if provided, otherwise set to null
    if (submitData.interview_scheduled_at && submitData.interview_scheduled_at.trim() !== '') {
      submitData.interview_scheduled_at = new Date(submitData.interview_scheduled_at).toISOString();
    } else {
      submitData.interview_scheduled_at = null;
    }
    
    // Convert empty strings to null for optional fields
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
    <Modal isOpen={true} onClose={onClose} title="Update Application Status">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin Notes
          </label>
          <textarea
            value={formData.admin_notes}
            onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add notes about this application..."
          />
        </div>

        {formData.status === 'rejected' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason
            </label>
            <textarea
              value={formData.rejection_reason}
              onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Reason for rejection..."
              required
            />
          </div>
        )}

        {formData.status === 'interview_scheduled' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.interview_scheduled_at}
                onChange={(e) => setFormData({ ...formData, interview_scheduled_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview Location
              </label>
              <input
                type="text"
                value={formData.interview_location}
                onChange={(e) => setFormData({ ...formData, interview_location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Office address or video call link..."
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
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
