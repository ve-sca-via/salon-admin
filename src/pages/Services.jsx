import { useState, useRef } from 'react';
import {
  useGetAllServiceCategoriesQuery,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  useToggleServiceCategoryStatusMutation,
  useDeleteServiceCategoryMutation,
  useUploadServiceCategoryIconMutation,
  useGetSubcategoriesByCategoryQuery,
  useCreateSubcategoryMutation,
  useUpdateSubcategoryMutation,
  useToggleSubcategoryStatusMutation,
  useDeleteSubcategoryMutation,
} from '../services/api/serviceCategoryApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { toast } from 'react-toastify';

// =====================================================
// SUBCATEGORY PANEL COMPONENT
// =====================================================
const SubcategoryPanel = ({ category, onClose }) => {
  const { data: subcategoriesData, isLoading } = useGetSubcategoriesByCategoryQuery({
    categoryId: category.id,
  });
  const [createSubcategory] = useCreateSubcategoryMutation();
  const [updateSubcategory] = useUpdateSubcategoryMutation();
  const [toggleStatus] = useToggleSubcategoryStatusMutation();
  const [deleteSubcategory] = useDeleteSubcategoryMutation();
  const [uploadIcon] = useUploadServiceCategoryIconMutation();

  const subcategories = subcategoriesData?.data || [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subForm, setSubForm] = useState({
    name: '',
    description: '',
    icon_url: '',
    display_order: 0,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const resetSubForm = () => {
    setSubForm({ name: '', description: '', icon_url: '', display_order: 0, is_active: true });
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return subForm.icon_url;

    setIsUploading(true);
    try {
      const result = await uploadIcon(imageFile).unwrap();
      return result.url;
    } catch (error) {
      toast.error('Failed to upload image');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateSubcategory = async () => {
    try {
      const iconUrl = await uploadImageIfNeeded();
      await createSubcategory({
        categoryId: category.id,
        data: { ...subForm, icon_url: iconUrl || null },
      }).unwrap();
      toast.success('Subcategory created successfully');
      setIsCreateOpen(false);
      resetSubForm();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create subcategory');
    }
  };

  const handleEditSubcategory = (sub) => {
    setSelectedSubcategory(sub);
    setSubForm({
      name: sub.name,
      description: sub.description || '',
      icon_url: sub.icon_url || '',
      display_order: sub.display_order || 0,
      is_active: sub.is_active,
    });
    setImagePreview(sub.icon_url || '');
    setIsEditOpen(true);
  };

  const handleUpdateSubcategory = async () => {
    try {
      const iconUrl = await uploadImageIfNeeded();
      await updateSubcategory({
        subcategoryId: selectedSubcategory.id,
        data: { ...subForm, icon_url: iconUrl || subForm.icon_url || null },
      }).unwrap();
      toast.success('Subcategory updated successfully');
      setIsEditOpen(false);
      resetSubForm();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update subcategory');
    }
  };

  const handleToggleSubcategoryStatus = async (subcategoryId, currentStatus) => {
    try {
      await toggleStatus({
        subcategoryId,
        is_active: !currentStatus,
      }).unwrap();
      toast.success(`Subcategory ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (window.confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await deleteSubcategory(subcategoryId).unwrap();
        toast.success('Subcategory deleted successfully');
      } catch (error) {
        toast.error(error?.data?.detail || 'Failed to delete subcategory', { autoClose: 8000 });
      }
    }
  };

  const subColumns = [
    {
      header: 'Icon',
      cell: (row) => (
        <div className="flex items-center justify-center w-10 h-10">
          {row.icon_url ? (
            <img
              src={row.icon_url}
              alt={row.name}
              className="w-8 h-8 object-cover rounded"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-400">
              <span className="text-[10px]">No Icon</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Subcategory Name',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          {row.description && (
            <div className="text-sm text-gray-500 mt-1 line-clamp-2">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Order',
      cell: (row) => <Badge variant="info">{row.display_order}</Badge>,
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'warning'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEditSubcategory(row)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant={row.is_active ? 'warning' : 'success'}
            onClick={() => handleToggleSubcategoryStatus(row.id, row.is_active)}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteSubcategory(row.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Subcategories under &quot;{category.name}&quot;
          </h3>
          <p className="text-sm text-gray-500">
            {subcategories.length} subcategorie{subcategories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            + Add Subcategory
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {subcategories.length > 0 ? (
        <div className="bg-gray-50 rounded-lg p-3">
          <Table columns={subColumns} data={subcategories} isLoading={isLoading} />
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
          {isLoading ? 'Loading subcategories...' : 'No subcategories yet. Click "+ Add Subcategory" to create one.'}
        </div>
      )}

      {/* Create Subcategory Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); resetSubForm(); }}
        title={`Create Subcategory under "${category.name}"`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetSubForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateSubcategory} disabled={isUploading || !subForm.name}>
              {isUploading ? 'Uploading...' : 'Create Subcategory'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Subcategory Name"
            value={subForm.name}
            onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
            placeholder="e.g., Haircut, Hair Color, Hair Treatment"
            required
          />
          <Textarea
            label="Description"
            value={subForm.description}
            onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
            placeholder="Brief description..."
            rows={2}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subcategory Icon
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {imageFile ? 'Change Image' : 'Select Image'}
                </Button>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, WebP or SVG (max 5MB)
                </p>
              </div>
              {imagePreview && (
                <div className="w-16 h-16 border rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <Input
            label="Display Order"
            type="number"
            value={subForm.display_order}
            onChange={(e) => setSubForm({ ...subForm, display_order: parseInt(e.target.value) || 0 })}
            helpText="Lower numbers appear first"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sub_is_active_create"
              checked={subForm.is_active}
              onChange={(e) => setSubForm({ ...subForm, is_active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="sub_is_active_create" className="text-sm font-medium text-gray-700">
              Active (visible to salons)
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Subcategory Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); resetSubForm(); }}
        title="Edit Subcategory"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetSubForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateSubcategory} disabled={isUploading || !subForm.name}>
              {isUploading ? 'Uploading...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Subcategory Name"
            value={subForm.name}
            onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={subForm.description}
            onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
            rows={2}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subcategory Icon
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {imageFile ? 'Change Image' : 'Update Image'}
                </Button>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, WebP or SVG (max 5MB)
                </p>
              </div>
              {imagePreview && (
                <div className="w-16 h-16 border rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <Input
            label="Display Order"
            type="number"
            value={subForm.display_order}
            onChange={(e) => setSubForm({ ...subForm, display_order: parseInt(e.target.value) || 0 })}
            helpText="Lower numbers appear first"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sub_is_active_edit"
              checked={subForm.is_active}
              onChange={(e) => setSubForm({ ...subForm, is_active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="sub_is_active_edit" className="text-sm font-medium text-gray-700">
              Active (visible to salons)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};


// =====================================================
// MAIN SERVICES PAGE
// =====================================================
export const Services = () => {
  const { data: categoriesData, isLoading } = useGetAllServiceCategoriesQuery({});
  const { data: allSubcategoriesData } = useGetAllSubcategoriesQuery({});
  const [createCategory] = useCreateServiceCategoryMutation();
  const [updateCategory] = useUpdateServiceCategoryMutation();
  const [toggleStatus] = useToggleServiceCategoryStatusMutation();
  const [deleteCategory] = useDeleteServiceCategoryMutation();
  const [uploadIcon] = useUploadServiceCategoryIconMutation();

  const categories = categoriesData?.data || [];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon_url: '',
    display_order: 0,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      icon_url: '',
      display_order: 0,
      is_active: true,
    });
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return form.icon_url;

    setIsUploading(true);
    try {
      const result = await uploadIcon(imageFile).unwrap();
      return result.url;
    } catch (error) {
      toast.error('Failed to upload image');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Upload image first if selected
      const iconUrl = await uploadImageIfNeeded();

      await createCategory({
        ...form,
        icon_url: iconUrl || null,
      }).unwrap();

      toast.success('Service category created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create service category');
      console.error(error);
    }
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      icon_url: category.icon_url || '',
      display_order: category.display_order || 0,
      is_active: category.is_active,
    });
    setImagePreview(category.icon_url || '');
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      // Upload new image if selected
      const iconUrl = await uploadImageIfNeeded();

      await updateCategory({
        categoryId: selectedCategory.id,
        data: {
          ...form,
          icon_url: iconUrl || form.icon_url || null,
        },
      }).unwrap();

      toast.success('Service category updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to update service category');
      console.error(error);
    }
  };

  const handleToggleStatus = async (categoryId, currentStatus) => {
    try {
      await toggleStatus({
        categoryId,
        is_active: !currentStatus,
      }).unwrap();
      toast.success(`Service category ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle status');
      console.error(error);
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this service category? This action cannot be undone.')) {
      try {
        await deleteCategory(categoryId).unwrap();
        toast.success('Service category deleted successfully');
      } catch (error) {
        // Extract the detailed error message from the backend
        const errorMessage = 
          error?.data?.detail ||           // FastAPI error format
          error?.data?.message ||          // Alternative format
          error?.message ||                // Generic error message
          'Failed to delete service category';
          
        toast.error(errorMessage, { 
          autoClose: 8000, // Longer duration for detailed messages
        });
      }
    }
  };

  const toggleSubcategories = (categoryId) => {
    setExpandedCategoryId(expandedCategoryId === categoryId ? null : categoryId);
  };

  const columns = [
    {
      header: 'Icon',
      cell: (row) => (
        <div className="flex items-center justify-center w-12 h-12">
          {row.icon_url ? (
            <img
              src={row.icon_url}
              alt={row.name}
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400">
              <span className="text-xs">No Icon</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Category Name',
      cell: (row) => {
        const subCount = allSubcategoriesData?.data?.filter(sub => sub.parent_category_id === row.id)?.length || 0;
        return (
          <div>
            <div className="font-medium text-gray-900 flex items-center gap-2">
              {row.name}
              {subCount > 0 && (
                <Badge variant="info" className="text-xs">
                  {subCount} subcategorie{subCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {row.description && (
              <div className="text-sm text-gray-500 mt-1 line-clamp-2">{row.description}</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Display Order',
      cell: (row) => (
        <Badge variant="info">{row.display_order}</Badge>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'warning'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleSubcategories(row.id)}
          >
            {expandedCategoryId === row.id ? '▲ Hide Subcategories' : '▼ Subcategories'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={row.is_active ? 'warning' : 'success'}
            onClick={() => handleToggleStatus(row.id, row.is_active)}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Custom row renderer to support expandable subcategory panels
  const renderCategoryRow = (category, index) => (
    <div key={category.id}>
      {/* Standard row via Table component handles this */}
      {expandedCategoryId === category.id && (
        <tr>
          <td colSpan={columns.length} className="px-4 py-0 bg-white">
            <SubcategoryPanel
              category={category}
              onClose={() => setExpandedCategoryId(null)}
            />
          </td>
        </tr>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage service categories and their subcategories for all salons
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          + Add Category
        </Button>
      </div>

      {/* Categories Table */}
      <Card>
        <Table columns={columns} data={categories} isLoading={isLoading} />

        {/* Render expanded subcategory panels inline */}
        {expandedCategoryId && categories.find(c => c.id === expandedCategoryId) && (
          <div className="px-4 pb-4">
            <SubcategoryPanel
              category={categories.find(c => c.id === expandedCategoryId)}
              onClose={() => setExpandedCategoryId(null)}
            />
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New Service Category"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isUploading || !form.name}
            >
              {isUploading ? 'Uploading...' : 'Create Category'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Hair, Skin, Nails, Bridal"
            required
          />
          
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of this category..."
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Icon
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {imageFile ? 'Change Image' : 'Select Image'}
                </Button>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, WebP or SVG (max 5MB)
                </p>
              </div>
              {imagePreview && (
                <div className="w-20 h-20 border rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_create"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active_create" className="text-sm font-medium text-gray-700">
              Active (visible to salons)
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
        title="Edit Service Category"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={isUploading || !form.name}
            >
              {isUploading ? 'Uploading...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Icon
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {imageFile ? 'Change Image' : 'Update Image'}
                </Button>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, WebP or SVG (max 5MB)
                </p>
              </div>
              {imagePreview && (
                <div className="w-20 h-20 border rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <Input
            label="Display Order"
            type="number"
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            helpText="Lower numbers appear first"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active_edit" className="text-sm font-medium text-gray-700">
              Active (visible to salons)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};
