import { useState, useMemo } from 'react';
import { 
  useGetAllSalonsQuery, 
  useUpdateSalonMutation, 
  useToggleSalonStatusMutation
} from '../services/api/salonApi';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { toast } from 'react-toastify';
import { 
  CheckCircle, XCircle, AlertCircle, DollarSign, Star, 
  MapPin, Phone, Mail, User, Users, Eye, 
  Power, Shield, TrendingUp, Calendar, Search, Filter
} from 'lucide-react';

const Salons = () => {
  // State
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // RTK Query hooks - NOW FETCHING ALL SALONS
  const { data: salonsData, isLoading } = useGetAllSalonsQuery({});
  const [updateSalon] = useUpdateSalonMutation();
  const [toggleStatus] = useToggleSalonStatusMutation();
  
  // Smart filtering based on business needs
  const filteredSalons = useMemo(() => {
    if (!salonsData?.data) return [];
    
    let salons = salonsData.data;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      salons = salons.filter(salon => 
        salon.business_name?.toLowerCase().includes(query) ||
        salon.email?.toLowerCase().includes(query) ||
        salon.phone?.includes(query) ||
        salon.city?.toLowerCase().includes(query)
      );
    }

    // Tab-based filtering
    switch (activeTab) {
      case 'needs_verification':
        return salons.filter(s => !s.is_verified);
      case 'needs_payment':
        return salons.filter(s => !s.registration_fee_paid);
      case 'inactive':
        return salons.filter(s => !s.is_active);
      case 'top_performers':
        return salons.filter(s => s.average_rating >= 4.0 && s.total_reviews >= 5);
      default:
        return salons;
    }
  }, [salonsData, activeTab, searchQuery]);

  // Dashboard statistics
  const stats = useMemo(() => {
    if (!salonsData?.data) return {
      total: 0,
      active: 0,
      verified: 0,
      paid: 0,
      needsVerification: 0,
      needsPayment: 0,
      avgRating: 0,
    };
    
    const salons = salonsData.data;
    
    // Calculate average rating safely
    const totalRating = salons.reduce((sum, s) => sum + (s.average_rating || 0), 0);
    const avgRating = salons.length > 0 ? totalRating / salons.length : 0;
    
    return {
      total: salons.length,
      active: salons.filter(s => s.is_active).length,
      verified: salons.filter(s => s.is_verified).length,
      paid: salons.filter(s => s.registration_fee_paid).length,
      needsVerification: salons.filter(s => !s.is_verified).length,
      needsPayment: salons.filter(s => !s.registration_fee_paid).length,
      avgRating: avgRating,
    };
  }, [salonsData]);

  // Quick actions
  const handleToggleVerification = async (salon) => {
    try {
      await updateSalon({
        salonId: salon.id,
        data: { is_verified: !salon.is_verified }
      }).unwrap();
      toast.success(`Salon ${salon.is_verified ? 'unverified' : 'verified'} successfully`);
    } catch (error) {
      toast.error('Failed to update verification status');
    }
  };

  const handleToggleActive = async (salon) => {
    try {
      await toggleStatus({
        salonId: salon.id,
        isActive: !salon.is_active
      }).unwrap();
      toast.success(`Salon ${salon.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle salon status');
    }
  };

  const openDetailModal = (salon) => {
    setSelectedSalon(salon);
    setIsDetailModalOpen(true);
  };

  // Table columns - BUSINESS-FOCUSED, NOT DEV-FOCUSED
  const columns = [
    {
      header: 'Salon',
      accessor: 'business_name',
      cell: (salon) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{salon.business_name}</span>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {salon.city}, {salon.state}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (salon) => (
        <div className="flex flex-col gap-1">
          <Badge 
            variant={salon.is_active ? 'success' : 'default'}
            className="w-fit"
          >
            {salon.is_active ? '● Active' : '○ Inactive'}
          </Badge>
          <Badge 
            variant={salon.is_verified ? 'success' : 'warning'}
            className="w-fit"
          >
            {salon.is_verified ? (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Not Verified
              </span>
            )}
          </Badge>
        </div>
      )
    },
    {
      header: 'Payment',
      accessor: 'registration_fee_paid',
      cell: (salon) => (
        <Badge 
          variant={salon.registration_fee_paid ? 'success' : 'error'}
          className="w-fit"
        >
          {salon.registration_fee_paid ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Paid
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Unpaid
            </span>
          )}
        </Badge>
      )
    },
    {
      header: 'Performance',
      accessor: 'performance',
      cell: (salon) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-medium">{salon.average_rating?.toFixed(1) || 'N/A'}</span>
            <span className="text-xs text-gray-500">({salon.total_reviews || 0} reviews)</span>
          </div>
          {salon.average_rating >= 4.5 && (
            <Badge variant="success" className="text-xs w-fit mt-1">
              <TrendingUp className="w-3 h-3" /> Top Rated
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Contact',
      accessor: 'contact',
      cell: (salon) => (
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Phone className="w-3 h-3" />
            <span>{salon.phone || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 truncate max-w-[200px]">
            <Mail className="w-3 h-3" />
            <span className="truncate" title={salon.email}>{salon.email || 'N/A'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Registered',
      accessor: 'created_at',
      cell: (salon) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-900">
            {new Date(salon.created_at).toLocaleDateString()}
          </span>
          {salon.approved_at && (
            <span className="text-xs text-gray-500">
              Approved: {new Date(salon.approved_at).toLocaleDateString()}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (salon) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openDetailModal(salon)}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant={salon.is_verified ? 'outline' : 'primary'}
            onClick={() => handleToggleVerification(salon)}
            title={salon.is_verified ? 'Unverify' : 'Verify'}
          >
            <Shield className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant={salon.is_active ? 'error' : 'success'}
            onClick={() => handleToggleActive(salon)}
            title={salon.is_active ? 'Deactivate' : 'Activate'}
          >
            <Power className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const tabs = [
    { id: 'all', label: 'All Salons', count: stats.total },
    { id: 'needs_verification', label: 'Needs Verification', count: stats.needsVerification },
    { id: 'needs_payment', label: 'Needs Payment', count: stats.needsPayment },
    { id: 'inactive', label: 'Inactive', count: stats.total - stats.active },
    { id: 'top_performers', label: 'Top Performers', count: 0 }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salon Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all salons in the network</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-indigo-700' : 'bg-gray-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search salons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </Card>

      {/* Salons Table */}
      <Card className="overflow-hidden">
        {filteredSalons.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No salons found</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'No salons match the selected filter'}
            </p>
          </div>
        ) : (
          <Table 
            data={filteredSalons} 
            columns={columns}
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Salon Details"
      >
        {selectedSalon && (
          <div className="space-y-6">
            {/* Business Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Business Name:</span>
                  <p className="font-medium text-gray-900">{selectedSalon.business_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Business Type:</span>
                  <p className="font-medium text-gray-900">{selectedSalon.business_type || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium text-gray-900">{selectedSalon.email}</p>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium text-gray-900">{selectedSalon.phone}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
              <p className="text-gray-700">
                {selectedSalon.address_line1 && `${selectedSalon.address_line1}, `}
                {selectedSalon.city}, {selectedSalon.state} {selectedSalon.pincode}
              </p>
              {selectedSalon.latitude && selectedSalon.longitude && (
                <p className="text-xs text-gray-500 mt-1">
                  Coordinates: {selectedSalon.latitude}, {selectedSalon.longitude}
                </p>
              )}
            </div>

            {/* Status Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Compliance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {selectedSalon.is_active ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span>{selectedSalon.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSalon.is_verified ? (
                    <Shield className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span>{selectedSalon.is_verified ? 'Verified' : 'Not Verified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSalon.registration_fee_paid ? (
                    <DollarSign className="w-5 h-5 text-green-500" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-red-500" />
                  )}
                  <span>{selectedSalon.registration_fee_paid ? 'Payment Complete' : 'Payment Pending'}</span>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 text-sm">Average Rating:</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-bold">{selectedSalon.average_rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Total Reviews:</span>
                  <p className="text-xl font-bold mt-1">{selectedSalon.total_reviews || 0}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(selectedSalon.created_at).toLocaleString()}</span>
                </div>
                {selectedSalon.approved_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">Approved:</span>
                    <span className="font-medium">{new Date(selectedSalon.approved_at).toLocaleString()}</span>
                  </div>
                )}
                {selectedSalon.registration_paid_at && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">Payment Received:</span>
                    <span className="font-medium">{new Date(selectedSalon.registration_paid_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Relationships - Who Submitted */}
            {(selectedSalon.profiles || selectedSalon.rm_profiles) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Details</h3>
                <div className="space-y-3 text-sm">
                  {selectedSalon.rm_profiles && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-900">Added by Relationship Manager</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="text-gray-600">RM Name:</span>
                        <span className="font-medium">{selectedSalon.rm_profiles.profiles?.full_name || 'Unknown'}</span>
                      </div>
                      {selectedSalon.created_at && (
                        <div className="flex items-center gap-2 text-gray-700 mt-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            Submitted on {new Date(selectedSalon.created_at).toLocaleDateString()} at {new Date(selectedSalon.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedSalon.profiles && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-900">Vendor/Owner</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedSalon.profiles.full_name || 'Unknown'}</span>
                      </div>
                      {!selectedSalon.rm_profiles && selectedSalon.created_at && (
                        <div className="flex items-center gap-2 text-gray-700 mt-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            Self-registered on {new Date(selectedSalon.created_at).toLocaleDateString()} at {new Date(selectedSalon.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant={selectedSalon.is_verified ? 'outline' : 'primary'}
                onClick={() => {
                  handleToggleVerification(selectedSalon);
                  setIsDetailModalOpen(false);
                }}
                className="flex-1"
              >
                <Shield className="w-4 h-4 mr-2" />
                {selectedSalon.is_verified ? 'Unverify' : 'Verify'} Salon
              </Button>
              
              <Button
                variant={selectedSalon.is_active ? 'error' : 'success'}
                onClick={() => {
                  handleToggleActive(selectedSalon);
                  setIsDetailModalOpen(false);
                }}
                className="flex-1"
              >
                <Power className="w-4 h-4 mr-2" />
                {selectedSalon.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Salons;
