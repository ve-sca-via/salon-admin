/**
 * Products.jsx - Admin Product Management Page
 *
 * CRUD management for e-commerce products:
 * - Table with search, category filter, featured filter
 * - Create / Edit modal with image URL inputs
 * - Toggle active/featured, soft-delete
 *
 * Follows the same patterns as Services.jsx (Card, Table, Modal, Badge, Button)
 */

import { useState, useMemo, useRef } from 'react';
import {
  useGetAllProductsQuery,
  useGetProductCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
} from '../services/api/productApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { toast } from 'react-toastify';


// =====================================================
// INITIAL FORM STATE
// =====================================================
const EMPTY_FORM = {
  name: '',
  description: '',
  short_description: '',
  price: '',
  discount_price: '',
  sku: '',
  category: 'general',
  brand: '',
  image_urls: [''],
  stock_quantity: 0,
  is_active: true,
  is_featured: false,
  tags: '',
  weight: '',
  b2b_price: '',
};


// =====================================================
// COMPONENT
// =====================================================
const Products = () => {
  // ---- Filters ----
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');

  // ---- API Hooks ----
  const { data: productsData, isLoading } = useGetAllProductsQuery({
    category: categoryFilter || undefined,
    is_featured: featuredFilter === '' ? undefined : featuredFilter === 'true',
    search: searchQuery || undefined,
    limit: 100,
  });
  const { data: categoriesData } = useGetProductCategoriesQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [uploadImage] = useUploadProductImageMutation();

  const products = productsData?.products || [];
  const categories = categoriesData?.categories || [];

  // ---- Modal / Form State ----
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [pendingFiles, setPendingFiles] = useState([]);

  // ---- Helpers ----
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setSelectedProduct(null);
    setPendingFiles([]);
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ---- Image upload state ----
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  /** Handle file selection and hold in pending state */
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 5MB size limit`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;

    const newPending = validFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingFiles((prev) => [...prev, ...newPending]);

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  /** Remove an uploaded image URL */
  const removeImageUrl = (index) => {
    setForm((prev) => {
      const urls = prev.image_urls.filter((_, i) => i !== index);
      return { ...prev, image_urls: urls };
    });
  };

  /** Build payload from form state */
  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'general',
      price: parseFloat(form.price),
      stock_quantity: parseInt(form.stock_quantity, 10) || 0,
      is_active: form.is_active,
      is_featured: form.is_featured,
      image_urls: form.image_urls.filter((u) => u.trim() !== ''),
    };

    if (form.description.trim()) payload.description = form.description.trim();
    if (form.short_description.trim()) payload.short_description = form.short_description.trim();
    if (form.discount_price !== '' && form.discount_price !== null) {
      payload.discount_price = parseFloat(form.discount_price);
    }
    if (form.sku.trim()) payload.sku = form.sku.trim();
    if (form.brand.trim()) payload.brand = form.brand.trim();
    if (form.weight.trim()) payload.weight = form.weight.trim();
    if (form.tags.trim()) {
      payload.tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (form.b2b_price !== '' && form.b2b_price !== null) {
      payload.b2b_price = parseFloat(form.b2b_price);
    }

    return payload;
  };

  // ---- Validation ----
  const formErrors = useMemo(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.price || parseFloat(form.price) <= 0) errs.price = 'Price must be greater than 0';
    if (
      form.discount_price !== '' &&
      form.discount_price !== null &&
      parseFloat(form.discount_price) >= parseFloat(form.price)
    ) {
      errs.discount_price = 'Discount price must be less than original price';
    }
    return errs;
  }, [form.name, form.price, form.discount_price]);

  const isFormValid = Object.keys(formErrors).length === 0 && form.name.trim() && form.price;


  // =====================================================
  // HANDLERS
  // =====================================================

  const uploadPendingFiles = async () => {
    if (!pendingFiles.length) return [];
    
    setIsUploading(true);
    const uploadedUrls = [];
    
    for (const { file } of pendingFiles) {
      try {
        const result = await uploadImage(file).unwrap();
        if (result?.url) {
          uploadedUrls.push(result.url);
        }
      } catch (err) {
        toast.error(`Failed to upload "${file.name}"`);
        throw err;
      }
    }
    
    setIsUploading(false);
    return uploadedUrls;
  };

  const handleCreate = async () => {
    if (!isFormValid) return;
    try {
      const newUrls = await uploadPendingFiles();
      const payload = buildPayload();
      payload.image_urls = [...payload.image_urls, ...newUrls];

      await createProduct(payload).unwrap();
      toast.success('Product created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      setIsUploading(false);
      const msg = error?.data?.detail || error?.data?.message || error?.message || 'Failed to create product';
      toast.error(msg);
    }
  };

  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      short_description: product.short_description || '',
      price: product.price ?? '',
      discount_price: product.discount_price ?? '',
      sku: product.sku || '',
      category: product.category || 'general',
      brand: product.brand || '',
      image_urls: product.image_urls?.length ? [...product.image_urls] : [''],
      stock_quantity: product.stock_quantity ?? 0,
      is_active: product.is_active ?? true,
      is_featured: product.is_featured ?? false,
      tags: (product.tags || []).join(', '),
      weight: product.weight || '',
      b2b_price: product.b2b_price ?? '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!isFormValid || !selectedProduct) return;
    try {
      const newUrls = await uploadPendingFiles();
      const payload = buildPayload();
      payload.image_urls = [...payload.image_urls, ...newUrls];

      await updateProduct({
        productId: selectedProduct.id,
        data: payload,
      }).unwrap();
      toast.success('Product updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      setIsUploading(false);
      const msg = error?.data?.detail || error?.data?.message || error?.message || 'Failed to update product';
      toast.error(msg);
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await updateProduct({
        productId: product.id,
        data: { is_active: !product.is_active },
      }).unwrap();
      toast.success(product.is_active ? 'Product deactivated' : 'Product activated');
    } catch (error) {
      toast.error('Failed to toggle product status');
    }
  };

  const handleToggleFeatured = async (product) => {
    try {
      await updateProduct({
        productId: product.id,
        data: { is_featured: !product.is_featured },
      }).unwrap();
      toast.success(product.is_featured ? 'Removed from featured' : 'Added to featured');
    } catch (error) {
      toast.error('Failed to toggle featured status');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This will deactivate the product.`)) return;
    try {
      await deleteProduct({ productId: product.id }).unwrap();
      toast.success('Product deleted successfully');
    } catch (error) {
      const msg = error?.data?.detail || error?.data?.message || 'Failed to delete product';
      toast.error(msg, { autoClose: 6000 });
    }
  };


  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  const columns = [
    {
      header: 'Image',
      cell: (row) => (
        <div className="flex items-center justify-center w-14 h-14">
          {row.image_urls?.[0] ? (
            <img src={row.image_urls[0]} alt={row.name} className="w-12 h-12 object-cover rounded-lg border" />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Product',
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{row.name}</div>
          {row.brand && <div className="text-xs text-gray-500 mt-0.5">{row.brand}</div>}
          {row.sku && <div className="text-xs text-gray-400 mt-0.5">SKU: {row.sku}</div>}
        </div>
      ),
    },
    {
      header: 'Price',
      cell: (row) => (
        <div>
          {row.discount_price != null ? (
            <>
              <div className="font-semibold text-green-700">₹{Number(row.discount_price).toFixed(2)}</div>
              <div className="text-xs text-gray-400 line-through">₹{Number(row.price).toFixed(2)}</div>
              {row.discount_percentage != null && (
                <span className="text-xs text-green-600 font-medium">{Number(row.discount_percentage).toFixed(0)}% off</span>
              )}
            </>
          ) : (
            <div className="font-semibold text-gray-900">₹{Number(row.price).toFixed(2)}</div>
          )}
          {row.b2b_price != null && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1 rounded border border-blue-100">B2B</span>
              <span className="text-xs font-bold text-blue-700">₹{Number(row.b2b_price).toFixed(2)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (row) => <Badge variant="info">{row.category}</Badge>,
    },
    {
      header: 'Stock',
      cell: (row) => (
        <span className={`font-medium ${row.stock_quantity <= 0 ? 'text-red-600' : row.stock_quantity <= 5 ? 'text-amber-600' : 'text-gray-700'}`}>
          {row.stock_quantity}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <Badge variant={row.is_active ? 'success' : 'warning'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
          {row.is_featured && <Badge variant="info">Featured</Badge>}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(row)}>Edit</Button>
          <Button size="sm" variant={row.is_active ? 'warning' : 'success'} onClick={() => handleToggleActive(row)}>
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant={row.is_featured ? 'outline' : 'primary'} onClick={() => handleToggleFeatured(row)}>
            {row.is_featured ? '★ Unfeature' : '☆ Feature'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row)}>Delete</Button>
        </div>
      ),
    },
  ];


  // =====================================================
  // PRODUCT FORM JSX (plain variable, NOT a component)
  // Using a variable instead of a function component prevents
  // React from unmounting/remounting the form on every keystroke.
  // =====================================================

  const productFormJSX = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Name */}
      <Input
        label="Product Name *"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., Premium Hair Serum"
        required
      />
      {formErrors.name && <p className="text-red-500 text-xs -mt-3">{formErrors.name}</p>}

      {/* Short Description */}
      <Input
        label="Short Description"
        value={form.short_description}
        onChange={(e) => updateField('short_description', e.target.value)}
        placeholder="Brief tagline for product cards (max 300 chars)"
      />

      {/* Description */}
      <Textarea
        label="Full Description"
        value={form.description}
        onChange={(e) => updateField('description', e.target.value)}
        placeholder="Detailed product description..."
        rows={3}
      />

      {/* Price / Discount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input
            label="Price (₹) *"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="499.00"
            required
          />
          {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
        </div>
        <div>
          <Input
            label="Discount Price (₹)"
            type="number"
            min="0"
            step="0.01"
            value={form.discount_price}
            onChange={(e) => updateField('discount_price', e.target.value)}
            placeholder="399.00"
          />
          {formErrors.discount_price && <p className="text-red-500 text-xs mt-1">{formErrors.discount_price}</p>}
        </div>
      </div>
      
      {/* B2B Price */}
      <div className="pt-2 border-t border-gray-100">
        <Input
          label="B2B / Wholesale Price (₹)"
          type="number"
          min="0"
          step="0.01"
          value={form.b2b_price}
          onChange={(e) => updateField('b2b_price', e.target.value)}
          placeholder="299.00"
          helperText="Special price shown to Vendors and Regular Buyers"
        />
      </div>

      {/* Category / Brand */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Category"
          value={form.category}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="hair-care, skin-care, tools..."
        />
        <Input
          label="Brand"
          value={form.brand}
          onChange={(e) => updateField('brand', e.target.value)}
          placeholder="e.g., L'Oréal, Dove"
        />
      </div>

      {/* SKU / Weight / Stock */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="SKU"
          value={form.sku}
          onChange={(e) => updateField('sku', e.target.value)}
          placeholder="LUB-HS-250"
        />
        <Input
          label="Weight / Volume"
          value={form.weight}
          onChange={(e) => updateField('weight', e.target.value)}
          placeholder="250ml, 100g"
        />
        <Input
          label="Stock Qty"
          type="number"
          min="0"
          value={form.stock_quantity}
          onChange={(e) => updateField('stock_quantity', e.target.value)}
        />
      </div>

      {/* Product Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>

        {/* Uploaded thumbnails */}
        {(form.image_urls.filter((u) => u.trim() !== '').length > 0 || pendingFiles.length > 0) && (
          <div className="flex flex-wrap gap-3 mb-3">
            {form.image_urls.filter((u) => u.trim() !== '').map((url, index) => (
              <div key={url + index} className="relative group w-20 h-20 rounded-lg border overflow-hidden flex-shrink-0">
                <img
                  src={url}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ccc%22><path d=%22M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z%22/></svg>'; }}
                />
                <button
                  type="button"
                  onClick={() => removeImageUrl(index)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                  title="Remove image"
                >
                  ✕
                </button>
                {index === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                    Primary
                  </span>
                )}
              </div>
            ))}

            {/* Pending previews */}
            {pendingFiles.map((pf, index) => (
              <div key={pf.previewUrl + index} className="relative group w-20 h-20 rounded-lg border-2 border-orange-300 overflow-hidden flex-shrink-0">
                <img
                  src={pf.previewUrl}
                  alt={`Pending ${index + 1}`}
                  className="w-full h-full object-cover opacity-75"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <span className="text-white text-[10px] font-bold">Pending</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePendingFile(index)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none z-10"
                  title="Remove pending image"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {form.image_urls.filter((u) => u.trim() !== '').length > 0 ? 'Add more images' : 'Select images'}
            </>
          )}
        </button>
        <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP • Max 5MB each • First image is the primary</p>
      </div>

      {/* Tags */}
      <Input
        label="Tags (comma-separated)"
        value={form.tags}
        onChange={(e) => updateField('tags', e.target.value)}
        placeholder="bestseller, organic, salon-use"
      />

      {/* Toggles */}
      <div className="flex gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => updateField('is_active', e.target.checked)}
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => updateField('is_featured', e.target.checked)}
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Featured (show in carousel)</span>
        </label>
      </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your product catalog ({products.length} product{products.length !== 1 ? 's' : ''})
          </p>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
          + Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="">All Products</option>
            <option value="true">Featured Only</option>
            <option value="false">Non-Featured</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table columns={columns} data={products} isLoading={isLoading} />
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForm(); }}
        title="Add New Product"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isUploading} onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!isFormValid || isCreating || isUploading}>
              {isUploading ? 'Uploading...' : isCreating ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        }
      >
        {productFormJSX}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); resetForm(); }}
        title={`Edit: ${selectedProduct?.name || 'Product'}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isUploading} onClick={() => { setIsEditModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdate} disabled={!isFormValid || isUpdating || isUploading}>
              {isUploading ? 'Uploading...' : isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {productFormJSX}
      </Modal>
    </div>
  );
};

export default Products;
