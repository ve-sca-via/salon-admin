import { useState } from 'react';
import { 
  useGetAllUsersQuery, 
  useCreateUserMutation, 
  useUpdateUserMutation, 
  useDeleteUserMutation 
} from '../services/api/userApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { ROLES, ROLE_LABELS, CREATABLE_ROLES } from '../config/constants';

export const Users = () => {
  // RTK Query hooks
  const [roleFilter, setRoleFilter] = useState('');
  const { data: usersData, isLoading } = useGetAllUsersQuery({ role: roleFilter });
  const [createUserMutation, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUserMutation, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUserMutation] = useDeleteUserMutation();
  
  const users = usersData?.data || usersData || [];
  
  const [search, setSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: ROLES.RELATIONSHIP_MANAGER
  });

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleCreateUser = async () => {
    // Validation
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error('Email, password, and full name are required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password validation
    if (createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Phone validation (if provided)
    if (createForm.phone && createForm.phone.length < 10) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }

    // Role validation
    if (createForm.role === ROLES.ADMIN) {
      toast.error('You cannot create admin users');
      return;
    }

    try {
      await createUserMutation(createForm).unwrap();
      toast.success(`${ROLE_LABELS[createForm.role]} created successfully!`);
      setIsCreateModalOpen(false);
      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: ROLES.RELATIONSHIP_MANAGER
      });
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create user');
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.user_role || ROLES.CUSTOMER,
      phone: user.phone || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    // Prevent changing to admin role
    if (editForm.role === ROLES.ADMIN && selectedUser.user_role !== ROLES.ADMIN) {
      toast.error('You cannot promote users to admin role');
      return;
    }

    try {
      await updateUserMutation({ 
        userId: selectedUser.id, 
        data: editForm 
      }).unwrap();
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update user');
    }
  };

  const handleDelete = async (user) => {
    // Prevent deleting admin users
    if (user.user_role === ROLES.ADMIN) {
      toast.error('Cannot delete admin users');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${user.full_name || user.email}? This action cannot be undone.`)) {
      try {
        await deleteUserMutation(user.id).unwrap();
        toast.success('User deleted successfully');
      } catch (error) {
        toast.error(error?.data?.detail || 'Failed to delete user');
      }
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'danger';
      case ROLES.RELATIONSHIP_MANAGER:
        return 'warning';
      case ROLES.VENDOR:
        return 'info';
      case ROLES.CUSTOMER:
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const columns = [
    {
      header: 'Name',
      accessorKey: 'full_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.full_name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'user_role',
      cell: (row) => (
        <Badge variant={getRoleBadgeColor(row.user_role)}>
          {ROLE_LABELS[row.user_role] || row.user_role}
        </Badge>
      ),
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: (row) => row.phone || 'N/A',
    },
    {
      header: 'Joined',
      accessorKey: 'created_at',
      cell: (row) => format(new Date(row.created_at), 'MMM dd, yyyy'),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDelete(row)}
            disabled={row.user_role === ROLES.ADMIN}
            title={row.user_role === ROLES.ADMIN ? 'Cannot delete admin users' : 'Delete user'}
          >
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
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all user accounts</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Relationship Manager
        </button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearch}
            className="md:w-96"
          />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Roles' },
              ...Object.entries(ROLE_LABELS).map(([value, label]) => ({
                value,
                label
              }))
            ]}
            className="md:w-48"
          />
        </div>

        <Table
          columns={columns}
          data={users}
          isLoading={isLoading}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={editForm.full_name || ''}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
          />
          <Input
            label="Phone"
            value={editForm.phone || ''}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <Select
            label="Role"
            value={editForm.role || ROLES.CUSTOMER}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
              value,
              label
            }))}
          />
          {editForm.role !== ROLES.ADMIN && (
            <p className="text-sm text-gray-500">
              Note: You cannot promote a user to Admin role
            </p>
          )}
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateForm({ email: '', password: '', full_name: '', phone: '', role: ROLES.RELATIONSHIP_MANAGER });
        }}
        title="Create New Relationship Manager"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Relationship Manager'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Role Selection - Moved to top */}
          <Select
            label="User Role *"
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            options={CREATABLE_ROLES.map(role => ({
              value: role,
              label: ROLE_LABELS[role]
            }))}
          />
          <p className="text-xs text-gray-500 -mt-2">
            <strong>Relationship Manager:</strong> Field agents who manage salon relationships and vendor approvals.
          </p>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Account Information</h3>
            
            <div className="space-y-4">
              <Input
                label="Email Address *"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
              <p className="text-xs text-gray-500 -mt-2">
                This will be used for login and notifications
              </p>

              <Input
                label="Password *"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Minimum 6 characters"
                required
              />
              <p className="text-xs text-gray-500 -mt-2">
                User can change this after first login
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Personal Information</h3>
            
            <div className="space-y-4">
              <Input
                label="Full Name *"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Enter full name"
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="Enter phone number (optional)"
              />
              <p className="text-xs text-gray-500 -mt-2">
                Optional, but recommended for better communication
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only Relationship Managers can be created through this interface. Customer accounts are created when users sign up through the mobile app. Admin accounts cannot be created for security reasons.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
