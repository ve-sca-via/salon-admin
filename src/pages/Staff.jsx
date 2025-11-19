import { useState } from 'react';
import { useGetAllStaffQuery, useCreateStaffMutation, useUpdateStaffMutation, useDeleteStaffMutation } from '../services/api/staffApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';
import { toast } from 'react-toastify';

export const Staff = () => {
  const { data: staffData, isLoading } = useGetAllStaffQuery({});
  const [createStaff] = useCreateStaffMutation();
  const [updateStaff] = useUpdateStaffMutation();
  const [deleteStaffMutation] = useDeleteStaffMutation();

  const staff = staffData?.data || [];
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      full_name: '',
      email: '',
      phone: '',
      specialization: '',
      is_active: true,
    });
  };

  const handleCreate = async () => {
    try {
      await createStaff(form).unwrap();
      toast.success('Staff member created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to create staff member');
    }
  };

  const handleEdit = (staffMember) => {
    setSelectedStaff(staffMember);
    setForm({
      full_name: staffMember.full_name,
      email: staffMember.email,
      phone: staffMember.phone || '',
      specialization: staffMember.specialization || '',
      is_active: staffMember.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      await updateStaff({ staffId: selectedStaff.id, data: form }).unwrap();
      toast.success('Staff member updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to update staff member');
    }
  };

  const handleDelete = async (staffId) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteStaffMutation(staffId).unwrap();
        toast.success('Staff member deleted successfully');
      } catch {
        toast.error('Failed to delete staff member');
      }
    }
  };

  const columns = [
    {
      header: 'Name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.full_name}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: (row) => row.phone || 'N/A',
    },
    {
      header: 'Specialization',
      accessorKey: 'specialization',
      cell: (row) => row.specialization || 'General',
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage salon staff members</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          + Add Staff Member
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={staff}
          isLoading={isLoading}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Staff Member"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Add Staff
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="John Doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="john@example.com"
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1234567890"
          />
          <Input
            label="Specialization"
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            placeholder="e.g., Hair Stylist"
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Staff Member"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdate}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Specialization"
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active_edit" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};
