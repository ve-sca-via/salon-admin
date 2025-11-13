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
          <div className="font-medium text-gray-900">{row.user?.full_name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{row.user?.email}</div>
        </div>
      ),
    },
    {
      header: 'Salon',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.salon_name}</div>
          <div className="text-sm text-gray-500">{row.salon?.location || ''}</div>
        </div>
      ),
    },
    {
      header: 'Services',
      cell: (row) => {
        const services = Array.isArray(row.services) ? row.services : [];
        return (
          <div>
            <div className="font-medium text-gray-900">
              {services.length} service{services.length !== 1 ? 's' : ''}
            </div>
            <div className="text-sm text-gray-500">
              ${row.final_amount || row.total_amount}
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
        <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
          Edit
        </Button>
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
              <p><strong>Customer:</strong> {selectedAppointment?.user?.full_name}</p>
              <p><strong>Service:</strong> {selectedAppointment?.service?.name}</p>
              <p><strong>Staff:</strong> {selectedAppointment?.staff?.full_name}</p>
              <p><strong>Date:</strong> {selectedAppointment?.appointment_date && format(new Date(selectedAppointment.appointment_date), 'MMM dd, yyyy')}</p>
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
