import React, { useState } from 'react';
import { useCategoryFilterStore, CategoryItem } from '../../store/categoryFilterStore';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Plus, Edit2, Trash2, Tag, Check, X, FolderPlus } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose }) => {
  const { categories, createCategory, updateCategory, deleteCategory } = useCategoryFilterStore();

  // Create Form State
  const [isAddMode, setIsAddMode] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Inline State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const resetCreateForm = () => {
    setCode('');
    setName('');
    setIcon('📁');
    setDescription('');
    setIsAddMode(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await createCategory({ code, name, icon, description });
      resetCreateForm();
    } catch (err: any) {
      alert(err.message || 'Failed to create project category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditCode(cat.code);
    setEditName(cat.name);
    setEditIcon(cat.icon || '📁');
    setEditDescription(cat.description || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateCategory(id, { code: editCode, name: editName, icon: editIcon, description: editDescription });
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update category');
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Project Categories (Admin)" maxWidth="720px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Action bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} color="var(--primary)" /> Active Categories ({categories.length})
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Create, update, or delete project categories. Changes reflect system-wide.
            </p>
          </div>

          {!isAddMode && (
            <Button size="sm" variant="gradient" onClick={() => setIsAddMode(true)}>
              <Plus size={16} /> Add Category
            </Button>
          )}
        </div>

        {/* Add Category Form Panel */}
        {isAddMode && (
          <form
            onSubmit={handleCreate}
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderPlus size={18} /> Create New Category
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
              <Input
                label="Category Code"
                placeholder="e.g. AI_ML"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                required
                helperText="Unique uppercase identifier"
              />
              <Input
                label="Display Name"
                placeholder="e.g. Artificial Intelligence & ML"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Icon Emoji"
                placeholder="🤖"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              />
            </div>

            <TextArea
              label="Description (Optional)"
              placeholder="Scope or domain covered by this category..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <Button type="submit" variant="gradient" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
                Save & Create Category
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={resetCreateForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Categories List Table */}
        <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', width: '50px' }}>Icon</th>
                <th style={{ padding: '12px 16px' }}>Category Name</th>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;
                return (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-color)', background: isEditing ? 'var(--primary-light)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontSize: '1.2rem', textAlign: 'center' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          style={{ width: '36px', textAlign: 'center', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        cat.icon || '📁'
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cat.name}</div>
                          {cat.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{cat.description}</div>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                          style={{ width: '120px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', textTransform: 'uppercase', fontFamily: 'monospace' }}
                        />
                      ) : (
                        cat.code
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <Button size="sm" variant="gradient" onClick={() => handleSaveEdit(cat.id)}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <Button size="sm" variant="secondary" onClick={() => handleStartEdit(cat)} title="Edit category name/icon">
                            <Edit2 size={14} />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(cat)} title="Delete category">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
