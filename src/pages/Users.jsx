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
    role: ROLES.RELATIONSHIP_MANAGER,
    age: '',
    gender: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('one number');
    }
    return errors;
  };

  const generateStrongPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '@#$!&';
    
    // Ensure at least one of each required type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining characters randomly
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleCreateUser = async () => {
    // Clear previous errors
    setFormErrors({});
    const errors = {};

    // Validation
    if (!createForm.email) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createForm.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (!createForm.password) {
      errors.password = 'Password is required';
    } else {
      const passwordErrors = validatePassword(createForm.password);
      if (passwordErrors.length > 0) {
        errors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }

    if (!createForm.full_name || createForm.full_name.trim() === '') {
      errors.full_name = 'Full name is required';
    }

    // Age validation
    if (!createForm.age) {
      errors.age = 'Age is required';
    } else {
      const ageNum = parseInt(createForm.age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        errors.age = 'Age must be between 18 and 100';
      }
    }

    // Gender validation
    if (!createForm.gender) {
      errors.gender = 'Gender is required';
    }

    // Phone validation (if provided)
    if (createForm.phone && createForm.phone.length < 10) {
      errors.phone = 'Phone number must be at least 10 digits';
    }

    // Role validation
    if (createForm.role === ROLES.ADMIN) {
      errors.role = 'You cannot create admin users';
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the form errors before submitting');
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
        role: ROLES.RELATIONSHIP_MANAGER,
        age: '',
        gender: ''
      });
      setShowPassword(false);
      setFormErrors({});
    } catch (error) {
      // Handle specific error cases
      let errorMessage = 'Failed to create user';
      
      if (error?.data?.detail) {
        const detail = error.data.detail;
        
        // Check for duplicate email error (backend returns "User with email X already exists")
        if (typeof detail === 'string') {
          if (detail.toLowerCase().includes('already exists')) {
            errorMessage = 'A user with this email already exists. Please use a different email address.';
          } else if (detail.toLowerCase().includes('duplicate') ||
              detail.toLowerCase().includes('unique constraint')) {
            errorMessage = 'A user with this email already exists. Please use a different email address.';
          } else if (detail.toLowerCase().includes('invalid email')) {
            errorMessage = 'The email address format is invalid.';
          } else if (detail.toLowerCase().includes('password')) {
            errorMessage = 'Password does not meet requirements.';
          } else {
            errorMessage = detail;
          }
        }
      } else if (error?.status === 409) {
        errorMessage = 'A user with this email already exists. Please use a different email address.';
      } else if (error?.status === 400) {
        // Check if the error message contains info about duplicate email
        const errorText = JSON.stringify(error);
        if (errorText.toLowerCase().includes('already exists')) {
          errorMessage = 'A user with this email already exists. Please use a different email address.';
        } else {
          errorMessage = 'Invalid input. Please check all fields and try again.';
        }
      } else if (error?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage);
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
          onClick={() => {
            setCreateForm({
              email: '',
              password: generateStrongPassword(),
              full_name: '',
              phone: '',
              role: ROLES.RELATIONSHIP_MANAGER,
              age: '',
              gender: ''
            });
            setIsCreateModalOpen(true);
          }}
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
          setCreateForm({ 
            email: '', 
            password: generateStrongPassword(), 
            full_name: '', 
            phone: '', 
            role: ROLES.RELATIONSHIP_MANAGER,
            age: '',
            gender: ''
          });
          setShowPassword(false);
          setFormErrors({});
        }}
        title="Create New Relationship Manager"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              setCreateForm({ 
                email: '', 
                password: generateStrongPassword(), 
                full_name: '', 
                phone: '', 
                role: ROLES.RELATIONSHIP_MANAGER,
                age: '',
                gender: ''
              });
              setShowPassword(false);
              setFormErrors({});
            }}>
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
            onChange={(e) => {
              setCreateForm({ ...createForm, role: e.target.value });
              if (formErrors.role) {
                setFormErrors({ ...formErrors, role: undefined });
              }
            }}
            options={CREATABLE_ROLES.map(role => ({
              value: role,
              label: ROLE_LABELS[role]
            }))}
            error={formErrors.role}
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
                onChange={(e) => {
                  setCreateForm({ ...createForm, email: e.target.value });
                  if (formErrors.email) {
                    setFormErrors({ ...formErrors, email: undefined });
                  }
                }}
                placeholder="user@example.com"
                error={formErrors.email}
                required
              />
              <p className="text-xs text-gray-500 -mt-2">
                This will be used for login and notifications
              </p>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    label="Password *"
                    type={showPassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, password: e.target.value });
                      if (formErrors.password) {
                        setFormErrors({ ...formErrors, password: undefined });
                      }
                    }}
                    placeholder="Enter a strong password"
                    error={formErrors.password}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPassword = generateStrongPassword();
                    setCreateForm({ ...createForm, password: newPassword });
                    setShowPassword(true);
                    toast.success('New password generated!');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Generate New Password
                </button>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Must contain at least 8 characters with uppercase, lowercase, and number. User can change this after first login.
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Personal Information</h3>
            
            <div className="space-y-4">
              <Input
                label="Full Name *"
                value={createForm.full_name}
                onChange={(e) => {
                  setCreateForm({ ...createForm, full_name: e.target.value });
                  if (formErrors.full_name) {
                    setFormErrors({ ...formErrors, full_name: undefined });
                  }
                }}
                placeholder="Enter full name"
                error={formErrors.full_name}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                value={createForm.phone}
                onChange={(e) => {
                  setCreateForm({ ...createForm, phone: e.target.value });
                  if (formErrors.phone) {
                    setFormErrors({ ...formErrors, phone: undefined });
                  }
                }}
                placeholder="Enter phone number (optional)"
                error={formErrors.phone}
              />
              <p className="text-xs text-gray-500 -mt-2">
                Optional, but recommended for better communication
              </p>

              <Input
                label="Age *"
                type="number"
                value={createForm.age}
                onChange={(e) => {
                  setCreateForm({ ...createForm, age: e.target.value });
                  if (formErrors.age) {
                    setFormErrors({ ...formErrors, age: undefined });
                  }
                }}
                placeholder="Enter age"
                error={formErrors.age}
                min="18"
                max="100"
                required
              />
              <p className="text-xs text-gray-500 -mt-2">
                Must be at least 18 years old
              </p>

              <Select
                label="Gender *"
                value={createForm.gender}
                onChange={(e) => {
                  setCreateForm({ ...createForm, gender: e.target.value });
                  if (formErrors.gender) {
                    setFormErrors({ ...formErrors, gender: undefined });
                  }
                }}
                options={[
                  { value: '', label: 'Select gender' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ]}
                error={formErrors.gender}
                required
              />
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
