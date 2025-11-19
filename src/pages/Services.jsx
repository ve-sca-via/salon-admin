import { useState } from 'react';
import { useGetAllServicesQuery, useCreateServiceMutation, useUpdateServiceMutation, useDeleteServiceMutation } from '../services/api/serviceApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { toast } from 'react-toastify';

export const Services = () => {
  const { data: servicesData, isLoading } = useGetAllServicesQuery({});
  const [createService] = useCreateServiceMutation();
  const [updateService] = useUpdateServiceMutation();
  const [deleteService] = useDeleteServiceMutation();

  const services = servicesData?.data || [];
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      duration: '',
      price: '',
    });
  };

  const handleCreate = async () => {
    try {
      await createService(form).unwrap();
      toast.success('Service created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to create service');
    }
  };

  const handleEdit = (service) => {
    setSelectedService(service);
    setForm({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      await updateService({ serviceId: selectedService.id, data: form }).unwrap();
      toast.success('Service updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to update service');
    }
  };

  const handleDelete = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteService(serviceId).unwrap();
        toast.success('Service deleted successfully');
      } catch {
        toast.error('Failed to delete service');
      }
    }
  };

  const columns = [
    {
      header: 'Service Name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.description}</div>
        </div>
      ),
    },
    {
      header: 'Duration',
      cell: (row) => <Badge variant="info">{row.duration} min</Badge>,
    },
    {
      header: 'Price',
      cell: (row) => <span className="font-medium text-gray-900">${row.price}</span>,
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
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">Manage salon services</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          + Add Service
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={services}
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
        title="Create New Service"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Create Service
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Service Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Haircut"
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Service description..."
            rows={3}
          />
          <Input
            label="Duration (minutes)"
            type="number"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            placeholder="30"
            required
          />
          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="25.00"
            required
          />
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Service"
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
            label="Service Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <Input
            label="Duration (minutes)"
            type="number"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            required
          />
          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>
      </Modal>
    </div>
  );
};
