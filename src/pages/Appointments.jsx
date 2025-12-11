import { useState } from 'react';
import { 
  useGetAllAppointmentsQuery, 
  useUpdateAppointmentStatusMutation 
} from '../services/api/appointmentApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { APPOINTMENT_STATUS } from '../config/constants';

export const Appointments = () => {
  // RTK Query hooks
  const [statusFilter, setStatusFilter] = useState('');
  const { data: appointmentsData, isLoading } = useGetAllAppointmentsQuery({ status: statusFilter });
  const [updateAppointmentStatus] = useUpdateAppointmentStatusMutation();
  
  const appointments = appointmentsData?.data || appointmentsData || [];
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loggedRows] = useState(new Set()); // Track logged rows

  const handleEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setEditForm({
      status: appointment.status,
      notes: appointment.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      await updateAppointmentStatus({ 
        appointmentId: selectedAppointment.id, 
        status: editForm.status 
      }).unwrap();
      toast.success('Appointment updated successfully');
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update appointment');
    }
  };

  const columns = [
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.profiles?.full_name || row.customer_name || 'N/A'}
          </div>
          <div className="text-sm text-gray-500">
            {row.profiles?.email || row.customer_email || ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Salon',
      cell: (row) => {
        }
        
        // Try multiple possible field structures
        const salonName = row.salons?.business_name 
          || row.salon?.business_name 
          || row.salon_name 
          || row.salons?.name
          || row.salon?.name
          || (row.salon_id ? `Salon #${row.salon_id}` : 'N/A');
        const salonCity = row.salons?.city || row.salon?.city || row.salon_city || row.salons?.address || '';
        
        return (
          <div>
            <div className="font-medium text-gray-900">
              {salonName}
            </div>
            {salonCity && (
              <div className="text-sm text-gray-500">
                {salonCity}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Services',
      cell: (row) => {
        const services = Array.isArray(row.services) ? row.services : [];
        const serviceNames = services.map(s => s.service_name || s.name).filter(Boolean);
        
        return (
          <div>
            <div className="font-medium text-gray-900">
              {serviceNames.length > 0 ? (
                <>
                  {serviceNames[0]}
                  {serviceNames.length > 1 && (
                    <span className="text-xs text-gray-500"> +{serviceNames.length - 1} more</span>
                  )}
                </>
              ) : (
                `${services.length} service${services.length !== 1 ? 's' : ''}`
              )}
            </div>
            <div className="text-sm text-gray-500">
              ${row.final_amount || row.total_amount || 0}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Date & Time',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {format(new Date(row.booking_date), 'MMM dd, yyyy')}
          </div>
          <div className="text-sm text-gray-500">
            {row.booking_time}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleEdit(row)}
          >
            View
          </Button>
          <Button 
            size="sm" 
            variant="primary" 
            onClick={() => handleEdit(row)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all appointments</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: APPOINTMENT_STATUS.PENDING, label: 'Pending' },
              { value: APPOINTMENT_STATUS.CONFIRMED, label: 'Confirmed' },
              { value: APPOINTMENT_STATUS.IN_PROGRESS, label: 'In Progress' },
              { value: APPOINTMENT_STATUS.COMPLETED, label: 'Completed' },
              { value: APPOINTMENT_STATUS.CANCELLED, label: 'Cancelled' },
              { value: APPOINTMENT_STATUS.NO_SHOW, label: 'No Show' },
            ]}
            className="md:w-48"
          />
          <Input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="md:w-48"
          />
          <Input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="md:w-48"
          />
        </div>

        <Table
          columns={columns}
          data={appointments}
          isLoading={isLoading}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Appointment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdate}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Appointment Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Customer:</strong> {selectedAppointment?.profiles?.full_name || selectedAppointment?.customer_name || 'N/A'}</p>
              <p><strong>Service(s):</strong> {(() => {
                const services = Array.isArray(selectedAppointment?.services) ? selectedAppointment.services : [];
                const names = services.map(s => s.service_name || s.name).filter(Boolean);
                return names.length > 0 ? names.join(', ') : 'N/A';
              })()}</p>
              <p><strong>Salon:</strong> {selectedAppointment?.salons?.business_name || selectedAppointment?.salon?.business_name || selectedAppointment?.salon_name || 'N/A'}</p>
              <p><strong>Date:</strong> {selectedAppointment?.booking_date && format(new Date(selectedAppointment.booking_date), 'MMM dd, yyyy')} at {selectedAppointment?.booking_time || 'N/A'}</p>
              <p><strong>Amount:</strong> ${selectedAppointment?.total_amount || selectedAppointment?.final_amount || 0}</p>
            </div>
          </div>

          <Select
            label="Status"
            value={editForm.status || ''}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: APPOINTMENT_STATUS.PENDING, label: 'Pending' },
              { value: APPOINTMENT_STATUS.CONFIRMED, label: 'Confirmed' },
              { value: APPOINTMENT_STATUS.IN_PROGRESS, label: 'In Progress' },
              { value: APPOINTMENT_STATUS.COMPLETED, label: 'Completed' },
              { value: APPOINTMENT_STATUS.CANCELLED, label: 'Cancelled' },
              { value: APPOINTMENT_STATUS.NO_SHOW, label: 'No Show' },
            ]}
          />

          <Input
            label="Notes"
            value={editForm.notes || ''}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            placeholder="Add notes..."
          />
        </div>
      </Modal>
    </div>
  );
};
