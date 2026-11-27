import { useState } from 'react';
import {
  useGetAllProductOrdersQuery,
  useUpdateProductOrderStatusMutation,
  useUpdateProductOrderShipmentMutation,
  useGetProductOrderEventsQuery,
} from '../services/api/productOrderApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Badge, StatusBadge } from '../components/common/Badge';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { usePagination } from '../hooks/usePagination';
import { paginateClient, buildTablePagination } from '../utils/pagination';

// Mirrors ALLOWED_TRANSITIONS in backend product_order_service.py. `paid` is
// only ever set by the payment flow, so it is never offered here.
const NEXT_STATUSES = {
  pending: ['cancelled'],
  paid: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABELS = Object.fromEntries(ORDER_STATUS_OPTIONS.map((o) => [o.value, o.label]));

// Courier events from the delivery webhook (backend delivery_webhook_service.py).
const EVENT_LABELS = {
  shipment_updated: 'Tracking details updated',
  manifested: 'Shipment booked',
  picked_up: 'Picked up by courier',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivery_failed: 'Delivery attempt failed',
  delivered: 'Delivered',
  rto_initiated: 'Returning to warehouse',
  rto_delivered: 'Returned to warehouse',
  shipment_cancelled: 'Shipment cancelled by courier',
  // Payment events (backend ProductOrderService._settle_payment).
  paid_after_cancel: 'Payment received after cancellation: refund it in Razorpay',
};

const SOURCE_LABELS = { admin: 'Admin', delivery_webhook: 'Courier', system: 'System' };

const EMPTY_SHIPMENT = { courier_name: '', tracking_number: '', tracking_url: '' };

const describeEvent = (e) => {
  if (e.from_status && e.to_status) {
    const move = `${STATUS_LABELS[e.from_status] || e.from_status} → ${STATUS_LABELS[e.to_status] || e.to_status}`;
    const courier = e.event !== e.to_status && EVENT_LABELS[e.event];
    return courier ? `${move} · ${courier}` : move;
  }
  return EVENT_LABELS[e.event] || e.event;
};

export const ProductOrders = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const { currentPage, onPageChange, pageSize } = usePagination(statusFilter);
  const { data: ordersData, isLoading } = useGetAllProductOrdersQuery();
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateProductOrderStatusMutation();
  const [updateShipment, { isLoading: isSavingShipment }] = useUpdateProductOrderShipmentMutation();

  const orders = ordersData || [];

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [shipment, setShipment] = useState(EMPTY_SHIPMENT);
  const [restock, setRestock] = useState(true);
  const { data: events = [] } = useGetProductOrderEventsQuery(selectedOrder?.id, {
    skip: !isViewModalOpen || !selectedOrder?.id,
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setShipment({
      courier_name: order.courier_name || '',
      tracking_number: order.tracking_number || '',
      tracking_url: order.tracking_url || '',
    });
    setRestock(true);
    setIsViewModalOpen(true);
  };

  /** Only the filled-in shipment fields (blank = leave as is). */
  const shipmentPayload = () =>
    Object.fromEntries(
      Object.entries(shipment)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v !== '')
    );

  const handleUpdateStatus = async () => {
    try {
      const res = await updateOrderStatus({
        orderId: selectedOrder.id,
        status: newStatus,
        ...(newStatus === 'shipped' || newStatus === 'delivered' ? shipmentPayload() : {}),
        ...(newStatus === 'cancelled' ? { restock } : {}),
      }).unwrap();
      toast.success(
        res?.stock_restored
          ? 'Order cancelled — items returned to stock'
          : 'Order status updated successfully'
      );
      if (res?.refund_required) {
        toast.warn('This order was paid. Refund the customer from the Razorpay dashboard.', {
          autoClose: false,
        });
      }
      setIsViewModalOpen(false);
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update order status');
    }
  };

  const handleSaveShipment = async () => {
    try {
      const res = await updateShipment({ orderId: selectedOrder.id, ...shipmentPayload() }).unwrap();
      setSelectedOrder((prev) => ({ ...prev, ...res.order }));
      toast.success('Tracking details saved');
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to save tracking details');
    }
  };

  const filteredOrders = statusFilter
    ? orders.filter((order) => order.status === statusFilter)
    : orders;

  const paginatedOrders = paginateClient(filteredOrders, currentPage, pageSize);
  const tablePagination = buildTablePagination(
    currentPage,
    filteredOrders.length,
    pageSize
  );

  const nextStatuses = selectedOrder ? NEXT_STATUSES[selectedOrder.status] || [] : [];
  const statusOptions = selectedOrder
    ? [selectedOrder.status, ...nextStatuses].map((v) => ({
        value: v,
        label: v === selectedOrder.status ? `${STATUS_LABELS[v] || v} (current)` : STATUS_LABELS[v] || v,
      }))
    : [];
  const isShippedOrDelivered = ['shipped', 'delivered'].includes(selectedOrder?.status);
  const showShipmentFields = selectedOrder && (newStatus === 'shipped' || isShippedOrDelivered);
  const canSaveShipmentOnly = selectedOrder && newStatus === selectedOrder.status && isShippedOrDelivered;

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
          customer: { variant: 'default', label: 'User' },
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
      cell: (row) => (
        <div>
          <StatusBadge status={row.status} />
          {row.status === 'cancelled' && row.payment_status === 'completed' && (
            <div className="mt-1">
              <Badge variant="danger" size="sm">Refund needed</Badge>
            </div>
          )}
          {row.tracking_number && (
            <div className="mt-1 text-xs text-gray-500">AWB {row.tracking_number}</div>
          )}
        </div>
      ),
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
          data={paginatedOrders}
          isLoading={isLoading}
          pagination={tablePagination}
          onPageChange={onPageChange}
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
            {canSaveShipmentOnly ? (
              <Button variant="primary" onClick={handleSaveShipment} disabled={isSavingShipment}>
                {isSavingShipment ? 'Saving...' : 'Save Tracking'}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleUpdateStatus}
                disabled={!selectedOrder || newStatus === selectedOrder.status || isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
              </Button>
            )}
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
                      {selectedOrder.profiles.user_role === 'customer' ? 'User' : selectedOrder.profiles.user_role.replace('_', ' ')}
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

            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              {nextStatuses.length > 0 ? (
                <Select
                  label="Update Order Status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  options={statusOptions}
                />
              ) : (
                <p className="text-sm text-gray-700">
                  This order is <strong>{STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</strong>. No further status changes.
                </p>
              )}
              {selectedOrder.status === 'pending' && (
                <p className="text-xs text-gray-600">
                  Awaiting payment. It becomes Paid automatically once the payment goes through.
                </p>
              )}

              {showShipmentFields && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Courier"
                    value={shipment.courier_name}
                    onChange={(e) => setShipment((s) => ({ ...s, courier_name: e.target.value }))}
                    placeholder="e.g. Delhivery, own rider"
                    maxLength={100}
                  />
                  <Input
                    label="Tracking / AWB no."
                    value={shipment.tracking_number}
                    onChange={(e) => setShipment((s) => ({ ...s, tracking_number: e.target.value }))}
                    maxLength={100}
                  />
                  <Input
                    label="Tracking link"
                    value={shipment.tracking_url}
                    onChange={(e) => setShipment((s) => ({ ...s, tracking_url: e.target.value }))}
                    placeholder="https://"
                    maxLength={500}
                  />
                </div>
              )}

              {newStatus === 'cancelled' && selectedOrder.status !== 'cancelled' && selectedOrder.payment_status === 'completed' && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={(e) => setRestock(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Return the items to stock
                    {selectedOrder.status === 'shipped' && ' (only if the parcel is back at the warehouse)'}
                  </label>
                  <p className="text-xs text-amber-700">
                    This order was paid. Cancelling does not refund it. Refund from the Razorpay dashboard.
                  </p>
                </div>
              )}
            </div>

            {events.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Timeline</h4>
                <ol className="space-y-2 border-l border-gray-200 pl-4">
                  {events.map((e) => (
                    <li key={e.id} className="text-sm">
                      <div className="text-gray-900">{describeEvent(e)}</div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(e.created_at), 'dd MMM yyyy, HH:mm')} · {SOURCE_LABELS[e.source] || e.source}
                        {e.note && ` · ${e.note}`}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
