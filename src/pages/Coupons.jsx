/**
 * Coupons.jsx - Admin Coupon Management Page
 *
 * CRUD management for code-based coupons (platform-wide + salon-scoped):
 * - Table with scope/status filters and code/title search
 * - Create / Edit modal (admin form: scope, salon picker, funded-by)
 * - Deactivate (soft delete — keeps redemption history)
 *
 * Follows the same patterns as Products.jsx (Card, Table, Modal, Badge, Button).
 */

import { useState, useMemo } from 'react';
import {
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeactivateCouponMutation,
} from '../services/api/couponApi';
import { useGetAllSalonsQuery } from '../services/api/salonApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { toast } from 'react-toastify';


// =====================================================
// HELPERS (shared display/formatting)
// =====================================================

/** Render the discount summary, e.g. "20% · max ₹300 · min ₹500" or "₹150". */
const formatDiscount = (c) => {
  const base = c.discount_type === 'percentage'
    ? `${Number(c.discount_value)}%`
    : `₹${Number(c.discount_value)}`;
  const parts = [base];
  if (c.max_discount_cap != null) parts.push(`max ₹${Number(c.max_discount_cap)}`);
  if (c.min_order_amount != null) parts.push(`min ₹${Number(c.min_order_amount)}`);
  return parts.join(' · ');
};

const FIRST_TIME_LABEL = { platform: 'Platform', vendor: 'Vendor' };

const formatValidity = (c) => {
  const fmt = (iso) => new Date(iso).toLocaleDateString();
  if (c.valid_until) {
    return `${c.valid_from ? fmt(c.valid_from) : '—'} → ${fmt(c.valid_until)}`;
  }
  return 'No expiry';
};

/** ISO datetime <-> <input type="datetime-local"> value. */
const isoToLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const localInputToIso = (val) => (val ? new Date(val).toISOString() : null);


// =====================================================
// INITIAL FORM STATE
// =====================================================
const EMPTY_FORM = {
  code: '',
  title: '',
  scope: 'platform',
  salon_id: '',
  funded_by: 'platform',
  applies_to: 'service',
  discount_type: 'percentage',
  discount_value: '',
  max_discount_cap: '',
  min_order_amount: '',
  first_time_scope: '', // '' = anyone
  usage_limit_total: '',
  usage_limit_per_user: '1',
  valid_from: '',
  valid_until: '',
  is_active: true,
};


// =====================================================
// COMPONENT
// =====================================================
const Coupons = () => {
  // ---- Filters ----
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ---- API Hooks ----
  const { data: coupons = [], isLoading } = useGetCouponsQuery({
    scope: scopeFilter || undefined,
  });
  const { data: salonsData } = useGetAllSalonsQuery({ limit: 200 });
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [deactivateCoupon] = useDeactivateCouponMutation();

  const salons = useMemo(() => salonsData?.data || [], [salonsData]);
  const salonNameById = useMemo(
    () => Object.fromEntries(salons.map((s) => [s.id, s.business_name])),
    [salons]
  );

  // ---- Client-side filtering (status + search; scope is server-side) ----
  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return coupons.filter((c) => {
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;
      if (q && !(`${c.code} ${c.title}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [coupons, statusFilter, searchQuery]);

  // ---- Modal / Form State ----
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setSelectedCoupon(null);
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ---- Validation (mirror server constraints — §7 of spec) ----
  const formErrors = useMemo(() => {
    const errs = {};
    const code = form.code.trim();
    if (!code) errs.code = 'Code is required';
    else if (code.length < 3 || code.length > 40) errs.code = 'Code must be 3–40 characters';
    if (!form.title.trim()) errs.title = 'Title is required';

    const val = parseFloat(form.discount_value);
    if (!form.discount_value || Number.isNaN(val) || val <= 0) {
      errs.discount_value = 'Value must be greater than 0';
    } else if (form.discount_type === 'percentage' && val > 100) {
      errs.discount_value = 'Percentage cannot exceed 100';
    }

    if (form.scope === 'vendor' && !form.salon_id) {
      errs.salon_id = 'Select a salon for a salon-scoped coupon';
    }

    if (form.valid_from && form.valid_until && new Date(form.valid_until) < new Date(form.valid_from)) {
      errs.valid_until = 'Valid until must be after valid from';
    }
    return errs;
  }, [form]);

  const isFormValid = Object.keys(formErrors).length === 0;

  // ---- Payload builders ----
  const numOrNull = (v) => (v === '' || v === null ? null : Number(v));

  const buildCreatePayload = () => {
    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      scope: form.scope,
      funded_by: form.funded_by,
      applies_to: form.applies_to,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount_cap: numOrNull(form.max_discount_cap),
      min_order_amount: numOrNull(form.min_order_amount),
      first_time_scope: form.first_time_scope || null,
      usage_limit_total: numOrNull(form.usage_limit_total),
      usage_limit_per_user: numOrNull(form.usage_limit_per_user),
      valid_from: localInputToIso(form.valid_from),
      valid_until: localInputToIso(form.valid_until),
    };
    if (form.scope === 'vendor') payload.salon_id = form.salon_id;
    return payload;
  };

  // CouponUpdate — code & scope are immutable, only send mutable fields.
  const buildUpdatePayload = () => ({
    title: form.title.trim(),
    discount_value: Number(form.discount_value),
    max_discount_cap: numOrNull(form.max_discount_cap),
    min_order_amount: numOrNull(form.min_order_amount),
    usage_limit_total: numOrNull(form.usage_limit_total),
    usage_limit_per_user: numOrNull(form.usage_limit_per_user),
    valid_until: localInputToIso(form.valid_until),
    is_active: form.is_active,
  });


  // =====================================================
  // HANDLERS
  // =====================================================

  const errorMessage = (error, fallback) => {
    if (error?.status === 409) return 'An active coupon with this code already exists.';
    const detail = error?.data?.detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ');
    return detail || error?.data?.message || error?.message || fallback;
  };

  const handleCreate = async () => {
    if (!isFormValid) return;
    try {
      await createCoupon(buildCreatePayload()).unwrap();
      toast.success('Coupon created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create coupon'));
    }
  };

  const handleOpenEdit = (coupon) => {
    setSelectedCoupon(coupon);
    setForm({
      code: coupon.code || '',
      title: coupon.title || '',
      scope: coupon.scope || 'platform',
      salon_id: coupon.salon_id || '',
      funded_by: coupon.funded_by || 'platform',
      applies_to: coupon.applies_to || 'service',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: coupon.discount_value ?? '',
      max_discount_cap: coupon.max_discount_cap ?? '',
      min_order_amount: coupon.min_order_amount ?? '',
      first_time_scope: coupon.first_time_scope || '',
      usage_limit_total: coupon.usage_limit_total ?? '',
      usage_limit_per_user: coupon.usage_limit_per_user ?? '',
      valid_from: isoToLocalInput(coupon.valid_from),
      valid_until: isoToLocalInput(coupon.valid_until),
      is_active: coupon.is_active ?? true,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!isFormValid || !selectedCoupon) return;
    try {
      await updateCoupon({ couponId: selectedCoupon.id, data: buildUpdatePayload() }).unwrap();
      toast.success('Coupon updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to update coupon'));
    }
  };

  const handleDeactivate = async (coupon) => {
    if (!window.confirm(`Deactivate "${coupon.code}"? Deactivate keeps the redemption history; the code stops working.`)) return;
    try {
      await deactivateCoupon(coupon.id).unwrap();
      toast.success('Coupon deactivated');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to deactivate coupon'));
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    toast.info(`Copied "${code}"`);
  };


  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  const columns = [
    {
      header: 'Code',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-gray-900">{row.code}</span>
          <button
            type="button"
            onClick={() => handleCopyCode(row.code)}
            className="text-gray-400 hover:text-orange-600 text-xs"
            title="Copy code"
          >
            ⧉
          </button>
        </div>
      ),
    },
    {
      header: 'Title',
      cell: (row) => <span className="text-gray-700">{row.title}</span>,
    },
    {
      header: 'Scope',
      cell: (row) =>
        row.scope === 'platform' ? (
          <Badge variant="primary">Platform</Badge>
        ) : (
          <Badge variant="info">{salonNameById[row.salon_id] || 'Salon'}</Badge>
        ),
    },
    {
      header: 'Applies to',
      cell: (row) => (
        <Badge variant="default">{row.applies_to === 'service' ? 'Service' : 'Fee'}</Badge>
      ),
    },
    {
      header: 'Discount',
      cell: (row) => <span className="text-gray-700">{formatDiscount(row)}</span>,
    },
    {
      header: 'First-time',
      cell: (row) => <span className="text-gray-600">{FIRST_TIME_LABEL[row.first_time_scope] || '—'}</span>,
    },
    {
      header: 'Usage',
      cell: (row) => (
        <span className="text-gray-700">
          {row.used_count ?? 0} / {row.usage_limit_total ?? '∞'}
        </span>
      ),
    },
    {
      header: 'Validity',
      cell: (row) => <span className="text-gray-600 text-xs">{formatValidity(row)}</span>,
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'warning'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(row)}>Edit</Button>
          {row.is_active && (
            <Button size="sm" variant="danger" onClick={() => handleDeactivate(row)}>Deactivate</Button>
          )}
        </div>
      ),
    },
  ];


  // =====================================================
  // COUPON FORM JSX (plain variable, not a component — avoids remount on keystroke)
  // =====================================================

  const isEdit = isEditModalOpen;

  const couponFormJSX = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Code / Title */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Code *"
          value={form.code}
          onChange={(e) => updateField('code', e.target.value.toUpperCase())}
          placeholder="SAVE20"
          disabled={isEdit}
          error={formErrors.code}
          maxLength={40}
        />
        <Input
          label="Title *"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="20% off services"
          error={formErrors.title}
        />
      </div>

      {/* Scope (immutable on edit) */}
      <Select
        label="Scope"
        value={form.scope}
        onChange={(e) => updateField('scope', e.target.value)}
        disabled={isEdit}
        options={[
          { value: 'platform', label: 'Platform-wide (any salon)' },
          { value: 'vendor', label: 'Specific salon' },
        ]}
      />
      {form.scope === 'vendor' && (
        <Select
          label="Salon *"
          value={form.salon_id}
          onChange={(e) => updateField('salon_id', e.target.value)}
          disabled={isEdit}
          error={formErrors.salon_id}
          options={[
            { value: '', label: 'Select a salon…' },
            ...salons.map((s) => ({ value: s.id, label: s.business_name })),
          ]}
        />
      )}

      {/* Funded by */}
      <Select
        label="Funded by"
        value={form.funded_by}
        onChange={(e) => updateField('funded_by', e.target.value)}
        disabled={isEdit}
        options={[
          { value: 'platform', label: 'Platform' },
          { value: 'vendor', label: 'Vendor' },
        ]}
      />
      <p className="text-xs text-gray-500 -mt-2">Who absorbs the discount cost (settlement).</p>

      {/* Applies to */}
      <Select
        label="Applies to"
        value={form.applies_to}
        onChange={(e) => updateField('applies_to', e.target.value)}
        disabled={isEdit}
        options={[
          { value: 'service', label: 'Service price (pay at salon)' },
          { value: 'convenience_fee', label: 'Convenience fee (pay now)' },
        ]}
      />

      {/* Discount type + value */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Discount type"
          value={form.discount_type}
          onChange={(e) => updateField('discount_type', e.target.value)}
          disabled={isEdit}
          options={[
            { value: 'percentage', label: 'Percentage (%)' },
            { value: 'flat_amount', label: 'Flat amount (₹)' },
          ]}
        />
        <Input
          label={form.discount_type === 'percentage' ? 'Value (%) *' : 'Value (₹) *'}
          type="number"
          min="0"
          step="0.01"
          value={form.discount_value}
          onChange={(e) => updateField('discount_value', e.target.value)}
          error={formErrors.discount_value}
        />
      </div>

      {/* Caps */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Max discount cap (₹)"
          type="number"
          min="0"
          step="0.01"
          value={form.max_discount_cap}
          onChange={(e) => updateField('max_discount_cap', e.target.value)}
          placeholder="e.g. 300 (for 'upto X%')"
        />
        <Input
          label="Minimum order amount (₹)"
          type="number"
          min="0"
          step="0.01"
          value={form.min_order_amount}
          onChange={(e) => updateField('min_order_amount', e.target.value)}
        />
      </div>

      {/* First-time restriction */}
      <Select
        label="First-time only"
        value={form.first_time_scope}
        onChange={(e) => updateField('first_time_scope', e.target.value)}
        disabled={isEdit}
        options={[
          { value: '', label: 'Anyone' },
          { value: 'platform', label: 'First booking on platform' },
          { value: 'vendor', label: 'First booking at this salon' },
        ]}
      />

      {/* Usage limits */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Usage limit (total)"
          type="number"
          min="0"
          value={form.usage_limit_total}
          onChange={(e) => updateField('usage_limit_total', e.target.value)}
          placeholder="Blank = unlimited"
        />
        <Input
          label="Per user"
          type="number"
          min="0"
          value={form.usage_limit_per_user}
          onChange={(e) => updateField('usage_limit_per_user', e.target.value)}
          placeholder="Blank = unlimited"
        />
      </div>

      {/* Validity */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Valid from"
          type="datetime-local"
          value={form.valid_from}
          onChange={(e) => updateField('valid_from', e.target.value)}
          disabled={isEdit}
        />
        <Input
          label="Valid until"
          type="datetime-local"
          value={form.valid_until}
          onChange={(e) => updateField('valid_until', e.target.value)}
          error={formErrors.valid_until}
        />
      </div>

      {/* Active toggle (edit only) */}
      {isEdit && (
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => updateField('is_active', e.target.checked)}
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      )}
    </div>
  );


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage code-based discounts ({filteredCoupons.length} coupon{filteredCoupons.length !== 1 ? 's' : ''})
          </p>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
          + Add Coupon
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <input
            type="text"
            placeholder="Search by code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          />
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="">All Scopes</option>
            <option value="platform">Platform</option>
            <option value="vendor">Vendor</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table columns={columns} data={filteredCoupons} isLoading={isLoading} />
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForm(); }}
        title="Add New Coupon"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!isFormValid || isCreating}>
              {isCreating ? 'Creating...' : 'Create Coupon'}
            </Button>
          </div>
        }
      >
        {couponFormJSX}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); resetForm(); }}
        title={`Edit: ${selectedCoupon?.code || 'Coupon'}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdate} disabled={!isFormValid || isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {couponFormJSX}
      </Modal>
    </div>
  );
};

export default Coupons;
