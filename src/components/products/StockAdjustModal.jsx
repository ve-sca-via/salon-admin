/**
 * StockAdjustModal — add/remove stock with a reason, and see the history.
 *
 * Every change goes through POST /admin/inventory/{id}/adjust, which writes a
 * row to the stock ledger. Sales and cancelled-order returns show up here too
 * (written by the order flow).
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select } from '../common/FormElements';
import { useAdjustStockMutation, useGetStockMovementsQuery } from '../../services/api/productApi';

// direction: +1 adds units, -1 removes, 0 = admin picks (count correction)
const REASONS = [
  { value: 'restock', label: 'Restock — new units received', direction: 1 },
  { value: 'damaged', label: 'Damaged / expired / lost', direction: -1 },
  { value: 'adjustment', label: 'Count correction', direction: 0 },
];

const REASON_LABELS = {
  initial: 'Opening stock',
  restock: 'Restock',
  adjustment: 'Correction',
  damaged: 'Damaged',
  sale: 'Sold',
  order_cancelled: 'Order cancelled',
};

export const StockAdjustModal = ({ product, isOpen, onClose }) => {
  const [reason, setReason] = useState('restock');
  const [quantity, setQuantity] = useState('');
  const [correctionDirection, setCorrectionDirection] = useState(1);
  const [note, setNote] = useState('');
  const [adjustStock, { isLoading }] = useAdjustStockMutation();
  const { data: movementsData, isFetching } = useGetStockMovementsQuery(product?.id, {
    skip: !isOpen || !product?.id,
  });
  const movements = movementsData?.movements || [];

  const reasonDef = REASONS.find((r) => r.value === reason);
  const direction = reasonDef.direction || correctionDirection;
  const qty = parseInt(quantity, 10);
  const isValid = Number.isInteger(qty) && qty > 0;
  const current = product?.stock_quantity ?? 0;
  const projected = isValid ? current + direction * qty : current;

  const reset = () => {
    setReason('restock');
    setQuantity('');
    setCorrectionDirection(1);
    setNote('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || projected < 0) return;
    try {
      const res = await adjustStock({
        productId: product.id,
        change: direction * qty,
        reason,
        note: note.trim() || undefined,
      }).unwrap();
      toast.success(`Stock updated — now ${res.stock_quantity}`);
      reset();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update stock');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Stock: ${product?.name || ''}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>Close</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || projected < 0 || isLoading}
          >
            {isLoading ? 'Saving...' : 'Apply'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-baseline gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">In stock</div>
            <div className="text-2xl font-semibold text-gray-900">{current}</div>
          </div>
          {isValid && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500">After this change</div>
              <div className={`text-2xl font-semibold ${projected < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {projected}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={REASONS}
          />
          <div className="flex gap-2 items-end">
            {reason === 'adjustment' && (
              <Select
                label="Direction"
                value={String(correctionDirection)}
                onChange={(e) => setCorrectionDirection(Number(e.target.value))}
                options={[
                  { value: '1', label: 'Add' },
                  { value: '-1', label: 'Remove' },
                ]}
              />
            )}
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 20"
            />
          </div>
        </div>
        {projected < 0 && <p className="text-red-600 text-xs -mt-3">Only {current} in stock.</p>}

        <Input
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Supplier invoice no., reason for write-off..."
          maxLength={500}
        />

        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">History</h4>
          {isFetching && !movements.length ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-gray-500">No stock changes recorded yet.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">When</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">What</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Change</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {format(new Date(m.created_at), 'dd MMM yy, HH:mm')}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {REASON_LABELS[m.reason] || m.reason}
                        {m.note && <div className="text-xs text-gray-500">{m.note}</div>}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${m.change > 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{m.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
