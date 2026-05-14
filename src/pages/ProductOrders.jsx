import { useState } from 'react';
import { 
  useGetAllProductOrdersQuery, 
  useUpdateProductOrderStatusMutation 
} from '../services/api/productOrderApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Badge, StatusBadge } from '../components/common/Badge';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

export const ProductOrders = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: ordersData, isLoading } = useGetAllProductOrdersQuery();
  const [updateOrderStatus] = useUpdateProductOrderStatusMutation();
  
  const orders = ordersData || [];
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setIsViewModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    try {
      await updateOrderStatus({ 
        orderId: selectedOrder.id, 
        status: newStatus 
      }).unwrap();
      toast.success('Order status updated successfully');
      setIsViewModalOpen(false);
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update order status');
    }
  };

  const filteredOrders = statusFilter 
    ? orders.filter(order => order.status === statusFilter)
    : orders;

  const columns = [
    {
      header: 'Order #',
      cell: (row) => (
        <div className="font-medium text-gray-900">
          {row.order_number}
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => {
        const profile = row.profiles || {};
        const role = profile.user_role || 'customer';
        
        const roleConfig = {
          vendor: { variant: 'success', label: 'Vendor' },
          regular_buyer: { variant: 'primary', label: 'Regular Buyer' },
          relationship_manager: { variant: 'info', label: 'RM' },
          admin: { variant: 'danger', label: 'Admin' },
          customer: { variant: 'default', label: 'Customer' },
        };
        
        const config = roleConfig[role] || roleConfig.customer;

        return (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {profile.full_name || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                {profile.phone || 'N/A'}
              </div>
            </div>
            <Badge variant={config.variant} size="sm">{config.label}</Badge>
          </div>
        );
      },
    },
    {
      header: 'Amount',
      cell: (row) => (
        <div className="font-medium text-gray-900">
          ₹{row.total_amount.toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Date',
      cell: (row) => (
        <div className="text-sm text-gray-500">
          {format(new Date(row.created_at), 'MMM dd, yyyy HH:mm')}
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
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleViewOrder(row)}
        >
          View & Update
        </Button>
      ),
    },
  ];

  const ORDER_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Orders</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage customer product orders</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              ...ORDER_STATUS_OPTIONS
            ]}
            className="md:w-48"
          />
        </div>

        <Table
          columns={columns}
          data={filteredOrders}
          isLoading={isLoading}
        />
      </Card>

      {/* View/Edit Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Order Details"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={handleUpdateStatus}>
              Update Status
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Customer Info</h4>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-semibold">{selectedOrder.profiles?.full_name}</p>
                  {selectedOrder.profiles?.user_role && (
                    <Badge 
                      variant={
                        selectedOrder.profiles.user_role === 'vendor' ? 'success' :
                        selectedOrder.profiles.user_role === 'regular_buyer' ? 'primary' :
                        selectedOrder.profiles.user_role === 'relationship_manager' ? 'info' :
                        selectedOrder.profiles.user_role === 'admin' ? 'danger' : 'default'
                      } 
                      size="sm"
                    >
                      {selectedOrder.profiles.user_role.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{selectedOrder.profiles?.phone}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Shipping Address</h4>
                <div className="mt-1 text-sm text-gray-600">
                  {typeof selectedOrder.shipping_address === 'object' && selectedOrder.shipping_address !== null ? (
                    <>
                      <p>{selectedOrder.shipping_address.street || ''}</p>
                      <p>
                        {selectedOrder.shipping_address.city || ''}, {selectedOrder.shipping_address.state || ''} {selectedOrder.shipping_address.postal_code || ''}
                      </p>
                      <p>{selectedOrder.shipping_address.country || ''}</p>
                      {selectedOrder.shipping_address.phone && (
                        <p className="mt-1 text-xs text-gray-500 italic">Contact: {selectedOrder.shipping_address.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{selectedOrder.shipping_address || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Order Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">₹{item.unit_price}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">₹{item.total_price}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-right text-sm font-bold">Total Amount</td>
                      <td className="px-4 py-2 text-right text-sm font-bold">₹{selectedOrder.total_amount}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <Select
                label="Update Order Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                options={ORDER_STATUS_OPTIONS}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
