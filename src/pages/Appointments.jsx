import { useState } from 'react';
import { useGetAllAppointmentsQuery } from '../services/api/appointmentApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';
import { format } from 'date-fns';
import { APPOINTMENT_STATUS } from '../config/constants';
import { usePagination } from '../hooks/usePagination';
import { buildEstimatedPagination } from '../utils/pagination';

export const Appointments = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { currentPage, onPageChange, page, pageSize } = usePagination(
    statusFilter,
    dateFrom,
    dateTo
  );

  const { data: appointmentsData, isLoading } = useGetAllAppointmentsQuery({
    status: statusFilter || undefined,
    page,
    limit: pageSize,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const appointments = appointmentsData?.data || appointmentsData || [];
  const tablePagination = buildEstimatedPagination(currentPage, appointments, pageSize);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const handleView = (appointment) => {
    setSelectedAppointment(appointment);
    setIsViewModalOpen(true);
  };

  const columns = [
    {
      header: 'Customer',
      cell: (row) => {
        const customerName = row.profiles?.full_name || row.customer_name || 'Unknown Customer';
        const customerEmail = row.profiles?.email || row.customer_email || '';
        const customerPhone = row.profiles?.phone || row.customer_phone || '';

        return (
          <div>
            <div className="font-medium text-gray-900">{customerName}</div>
            <div className="text-sm text-gray-500">{customerEmail || customerPhone}</div>
          </div>
        );
      },
    },
    {
      header: 'Salon',
      cell: (row) => {
        const salonName =
          row.salons?.business_name ||
          row.salon?.business_name ||
          row.salon_name ||
          row.salons?.name ||
          row.salon?.name ||
          (row.salon_id ? `Salon #${row.salon_id}` : 'N/A');
        const salonCity =
          row.salons?.city || row.salon?.city || row.salon_city || row.salons?.address || '';

        return (
          <div>
            <div className="font-medium text-gray-900">{salonName}</div>
            {salonCity && <div className="text-sm text-gray-500">{salonCity}</div>}
          </div>
        );
      },
    },
    {
      header: 'Services',
      cell: (row) => {
        const services = Array.isArray(row.services) ? row.services : [];
        const serviceNames = services.map((s) => s.service_name || s.name).filter(Boolean);

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
            {row.time_slots && row.time_slots.length > 0 ? row.time_slots[0] : 'N/A'}
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
        <Button size="sm" variant="outline" onClick={() => handleView(row)}>
          View
        </Button>
      ),
    },
  ];

  const serviceList = (() => {
    const services = Array.isArray(selectedAppointment?.services)
      ? selectedAppointment.services
      : [];
    const names = services.map((s) => s.service_name || s.name).filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'N/A';
  })();

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
          pagination={tablePagination}
          onPageChange={onPageChange}
        />
      </Card>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Appointment Details"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Customer:</strong>{' '}
              {selectedAppointment?.profiles?.full_name ||
                selectedAppointment?.customer_name ||
                'N/A'}
            </p>
            <p>
              <strong>Service(s):</strong> {serviceList}
            </p>
            <p>
              <strong>Salon:</strong>{' '}
              {selectedAppointment?.salons?.business_name ||
                selectedAppointment?.salon?.business_name ||
                selectedAppointment?.salon_name ||
                'N/A'}
            </p>
            <p>
              <strong>Date:</strong>{' '}
              {selectedAppointment?.booking_date &&
                format(new Date(selectedAppointment.booking_date), 'MMM dd, yyyy')}{' '}
              at{' '}
              {selectedAppointment?.time_slots?.length > 0
                ? selectedAppointment.time_slots[0]
                : 'N/A'}
            </p>
            <p>
              <strong>Amount:</strong> $
              {selectedAppointment?.total_amount || selectedAppointment?.final_amount || 0}
            </p>
            <p className="flex items-center gap-2">
              <strong>Status:</strong>
              {selectedAppointment?.status ? (
                <StatusBadge status={selectedAppointment.status} />
              ) : (
                'N/A'
              )}
            </p>
            {selectedAppointment?.notes && (
              <p>
                <strong>Notes:</strong> {selectedAppointment.notes}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
