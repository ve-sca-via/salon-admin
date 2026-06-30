import { useState, useEffect } from 'react';
import {
  useGetPartnerRequestsQuery,
  useUpdatePartnerRequestMutation,
} from '../services/api/partnerApi';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { toast } from 'react-toastify';
import { Pagination } from '../components/common/Pagination';
import { usePagination } from '../hooks/usePagination';
import { buildTablePagination } from '../utils/pagination';

const STATUS_COLORS = {
  new: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PartnerRequests = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { currentPage, onPageChange, skip, pageSize } = usePagination(statusFilter, search);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const { currentData, isLoading, isFetching, refetch } = useGetPartnerRequestsQuery({
    status: statusFilter || undefined,
    search: search || undefined,
    skip,
    limit: pageSize,
  });

  const [updateRequest, { isLoading: isUpdating }] = useUpdatePartnerRequestMutation();

  const requests = currentData?.requests || [];
  const tablePagination = buildTablePagination(
    currentPage,
    currentData?.total ?? requests.length,
    pageSize
  );
  const listLoading = isLoading || isFetching;

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = (request) => {
    setSelectedRequest(request);
    setShowUpdateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partner Requests</h1>
        <p className="text-gray-600 mt-1">Vendors who want to partner with Lubist</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <label htmlFor="partner-search" className="sr-only">
          Search partner requests
        </label>
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          id="partner-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by owner, shop, email, phone, or location..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter + stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {listLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-8 bg-gray-200 rounded w-12" />
              </div>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <div className="text-sm text-gray-600">Total Requests</div>
              <div className="text-2xl font-bold text-gray-900">
                {currentData?.total ?? requests.length}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-gray-600">New</div>
              <div className="text-2xl font-bold text-yellow-600">
                {requests.filter((r) => r.status === 'new').length}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-gray-600">Contacted</div>
              <div className="text-2xl font-bold text-blue-600">
                {requests.filter((r) => r.status === 'contacted').length}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-gray-600">Approved</div>
              <div className="text-2xl font-bold text-emerald-600">
                {requests.filter((r) => r.status === 'approved').length}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Requests Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shop Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received
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
              {listLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="animate-pulse h-4 bg-gray-200 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {search ? 'No requests match your search' : 'No partner requests found'}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.shop_name}
                      </div>
                      <div className="text-sm text-gray-500">{request.owner_name}</div>
                      <div className="text-sm text-gray-500">{request.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {request.shop_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {request.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[request.status]}`}>
                        {STATUS_OPTIONS.find((s) => s.value === request.status)?.label || request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(request)}
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
        <Pagination pagination={tablePagination} onPageChange={onPageChange} />
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRequest(null);
          }}
        />
      )}
      {showUpdateModal && selectedRequest && (
        <UpdateStatusModal
          request={selectedRequest}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedRequest(null);
          }}
          onUpdate={async (data) => {
            try {
              await updateRequest({
                requestId: selectedRequest.id,
                ...data,
              }).unwrap();
              toast.success('Partner request updated successfully');
              setShowUpdateModal(false);
              setSelectedRequest(null);
              refetch();
            } catch {
              toast.error('Failed to update partner request');
            }
          }}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
};

// Request Details Modal Component
const RequestDetailsModal = ({ request, onClose }) => {
  const InfoRow = ({ label, value }) => (
    <div>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
      <p className="text-gray-900 font-medium mt-1">{value || 'N/A'}</p>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="Partner Request Details" size="lg">
      <div className="max-h-[70vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-600">Shop</p>
            <p className="text-lg font-bold text-gray-900">{request.shop_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Received on</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(request.created_at)}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Vendor Details</h4>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
            <InfoRow label="Owner Name" value={request.owner_name} />
            <InfoRow label="Shop Name" value={request.shop_name} />
            <InfoRow label="Shop Type" value={request.shop_type} />
            <InfoRow label="Phone" value={request.phone} />
            <div className="col-span-2">
              <InfoRow label="Email" value={request.email} />
            </div>
            <div className="col-span-2">
              <InfoRow label="Location" value={request.location} />
            </div>
          </div>
        </div>

        {request.admin_notes && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Admin Notes</h4>
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{request.admin_notes}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Update Status Modal Component
const UpdateStatusModal = ({ request, onClose, onUpdate, isLoading }) => {
  const [formData, setFormData] = useState({
    status: request.status,
    admin_notes: request.admin_notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (!submitData.admin_notes || submitData.admin_notes.trim() === '') {
      submitData.admin_notes = null;
    }
    onUpdate(submitData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Update Partner Request" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
          <p className="text-sm text-blue-900 font-medium">{request.shop_name}</p>
          <p className="text-xs text-blue-700">{request.owner_name} · {request.email}</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            required
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
            Admin Notes
          </label>
          <textarea
            value={formData.admin_notes}
            onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Add notes about this request..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PartnerRequests;
