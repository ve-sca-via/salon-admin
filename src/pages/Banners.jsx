/**
 * Banners.jsx - Admin Home-Carousel Banner Management
 *
 * Manage the mobile home-screen carousel without an app release:
 * - Ordered list with thumbnails (move up / down to reorder)
 * - Create / Edit modal with single-image upload (Cloudinary) + optional link
 * - Toggle active, soft-delete
 *
 * Follows the same patterns as Products.jsx (Card, Button, Modal, Badge, toast).
 */

import { useEffect, useRef, useState } from 'react';
import {
  useGetAllBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useReorderBannersMutation,
  useDeleteBannerMutation,
  useUploadBannerImageMutation,
} from '../services/api/bannerApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/FormElements';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { toast } from 'react-toastify';

const EMPTY_FORM = {
  title: '',
  image_url: '',
  link_url: '',
  is_active: true,
};

const Banners = () => {
  const { data, isLoading } = useGetAllBannersQuery();
  const [createBanner, { isLoading: isCreating }] = useCreateBannerMutation();
  const [updateBanner, { isLoading: isUpdating }] = useUpdateBannerMutation();
  const [reorderBanners, { isLoading: isReordering }] = useReorderBannersMutation();
  const [deleteBanner] = useDeleteBannerMutation();
  const [uploadImage] = useUploadBannerImageMutation();

  const banners = data?.banners || [];

  // ---- Modal / form state ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null); // null = create
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [pendingFile, setPendingFile] = useState(null); // { file, previewUrl }
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Revoke object URLs when the pending preview changes / unmounts.
  useEffect(() => {
    return () => {
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    };
  }, [pendingFile]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setSelected(null);
    setPendingFile(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (banner) => {
    setSelected(banner);
    setForm({
      title: banner.title || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      is_active: banner.is_active ?? true,
    });
    setPendingFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // ---- Image selection ----
  const handleImageSelect = (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image exceeds the 5MB size limit');
      return;
    }
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile({ file, previewUrl: URL.createObjectURL(file) });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const previewSrc = pendingFile?.previewUrl || form.image_url || '';
  const isFormValid = Boolean(previewSrc); // an image (existing or pending) is required

  // ---- Save (create or update) ----
  const handleSave = async () => {
    if (!isFormValid) {
      toast.error('A banner image is required');
      return;
    }
    try {
      // Upload the pending file first (if any) to get a Cloudinary URL.
      let imageUrl = form.image_url;
      if (pendingFile) {
        setIsUploading(true);
        const result = await uploadImage(pendingFile.file).unwrap();
        imageUrl = result?.url || '';
        setIsUploading(false);
        if (!imageUrl) throw new Error('Upload did not return a URL');
      }

      const payload = {
        title: form.title.trim() || undefined,
        image_url: imageUrl,
        link_url: form.link_url.trim() || undefined,
        is_active: form.is_active,
      };

      if (selected) {
        // On update, send link_url/title even when cleared so they can be removed.
        await updateBanner({
          bannerId: selected.id,
          data: {
            title: form.title.trim(),
            image_url: imageUrl,
            link_url: form.link_url.trim(),
            is_active: form.is_active,
          },
        }).unwrap();
        toast.success('Banner updated');
      } else {
        await createBanner(payload).unwrap();
        toast.success('Banner created');
      }
      closeModal();
    } catch (error) {
      setIsUploading(false);
      const msg = error?.data?.detail || error?.data?.message || error?.message || 'Failed to save banner';
      toast.error(msg);
    }
  };

  // ---- Toggle active ----
  const handleToggleActive = async (banner) => {
    try {
      await updateBanner({ bannerId: banner.id, data: { is_active: !banner.is_active } }).unwrap();
      toast.success(banner.is_active ? 'Banner deactivated' : 'Banner activated');
    } catch {
      toast.error('Failed to toggle banner status');
    }
  };

  // ---- Delete ----
  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete this banner${banner.title ? ` ("${banner.title}")` : ''}? It will be removed from the app.`)) return;
    try {
      await deleteBanner({ bannerId: banner.id }).unwrap();
      toast.success('Banner deleted');
    } catch (error) {
      const msg = error?.data?.detail || error?.data?.message || 'Failed to delete banner';
      toast.error(msg);
    }
  };

  // ---- Reorder (move up / down) ----
  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;

    const reordered = [...banners];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);

    // Assign sequential sort_order to the full set and persist.
    const orders = reordered.map((b, i) => ({ id: b.id, sort_order: i }));
    try {
      await reorderBanners(orders).unwrap();
    } catch {
      toast.error('Failed to reorder banners');
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Home Banners</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the app home-screen carousel ({banners.length} banner{banners.length !== 1 ? 's' : ''}).
            Order here is the order shown in the app.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>+ Add Banner</Button>
      </div>

      {/* List */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading banners…</div>
        ) : banners.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500">No banners yet.</p>
            <p className="text-sm text-gray-400 mt-1">Add one to populate the app home carousel.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {banners.map((banner, index) => (
              <li key={banner.id} className="flex items-center gap-4 p-4">
                {/* Order controls */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || isReordering}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === banners.length - 1 || isReordering}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Position */}
                <span className="text-xs font-semibold text-gray-400 w-5 text-center">{index + 1}</span>

                {/* Thumbnail */}
                <div className="w-32 h-16 rounded-lg border overflow-hidden flex-shrink-0 bg-gray-50">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
                  )}
                </div>

                {/* Meta */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{banner.title || <span className="text-gray-400 italic">Untitled</span>}</div>
                  {banner.link_url && (
                    <div className="text-xs text-blue-600 truncate mt-0.5" title={banner.link_url}>{banner.link_url}</div>
                  )}
                  <div className="mt-1">
                    <Badge variant={banner.is_active ? 'success' : 'warning'}>{banner.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <Button size="sm" variant="outline" onClick={() => openEdit(banner)}>Edit</Button>
                  <Button size="sm" variant={banner.is_active ? 'warning' : 'success'} onClick={() => handleToggleActive(banner)}>
                    {banner.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(banner)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Create / Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selected ? 'Edit Banner' : 'Add New Banner'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isUploading} onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!isFormValid || isCreating || isUpdating || isUploading}>
              {isUploading ? 'Uploading…' : (isCreating || isUpdating) ? 'Saving…' : selected ? 'Save Changes' : 'Create Banner'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image *</label>
            <div className="w-full aspect-[2/1] max-h-48 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center mb-2">
              {previewSrc ? (
                <img src={previewSrc} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-gray-400">No image selected</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
            >
              {previewSrc ? 'Change image' : 'Select image'}
            </button>
            <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP • Max 5MB • Wide (2:1) images look best</p>
          </div>

          {/* Title */}
          <Input
            label="Title / Caption"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g., Flat 10% OFF this week"
          />

          {/* Link */}
          <Input
            label="Tap Link (optional)"
            value={form.link_url}
            onChange={(e) => updateField('link_url', e.target.value)}
            placeholder="https://… or an in-app deep link"
            helperText="Where the banner takes the user when tapped"
          />

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateField('is_active', e.target.checked)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Active (visible in the app)</span>
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default Banners;
