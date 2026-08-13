import React, { useState, useEffect } from 'react';
import { useDateFilterStore } from '../store/dateFilterStore';
import { useCategoryFilterStore } from '../store/categoryFilterStore';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { Download, Plus, Clock, Sparkles, FileText, ArrowUpRight, Edit2, Trash2 } from 'lucide-react';

interface WorkActivityItem {
  id: string;
  serialNo: number;
  dateTime: string;
  workDescription: string;
  hoursSpent: number;
  user: { id: string; firstName: string; lastName: string; email: string };
  project: { id: string; name: string; projectType: string; status: string };
  assignedBy?: { id: string; firstName: string; lastName: string };
}

export const WorkActivitiesPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const globalFilter = useDateFilterStore();
  const { selectedCategory } = useCategoryFilterStore();

  const [activities, setActivities] = useState<WorkActivityItem[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Log Activity Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logProjectId, setLogProjectId] = useState('');
  const [logMemberId, setLogMemberId] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [logHours, setLogHours] = useState('2.0');
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);

  // Edit Activity Modal
  const [editingActivity, setEditingActivity] = useState<WorkActivityItem | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editHours, setEditHours] = useState('2.0');
  const [editProjectId, setEditProjectId] = useState('');
  const [editMemberId, setEditMemberId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirm Modal
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditModal = (activity: WorkActivityItem) => {
    setEditingActivity(activity);
    setEditDescription(activity.workDescription || '');
    setEditHours(String(activity.hoursSpent || 1.0));
    setEditProjectId(activity.project?.id || '');
    setEditMemberId(activity.user?.id || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    setIsSavingEdit(true);
    try {
      await apiFetch(`/activities/${editingActivity.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          workDescription: editDescription.trim(),
          hoursSpent: Number(editHours),
          projectId: editProjectId || undefined,
          userId: user?.role === 'ADMIN' ? editMemberId : undefined,
        }),
      });
      setEditingActivity(null);
      fetchActivities();
    } catch (err: any) {
      alert(err.message || 'Failed to update work activity log');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingActivityId) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/activities/${deletingActivityId}`, {
        method: 'DELETE',
      });
      setDeletingActivityId(null);
      fetchActivities();
    } catch (err: any) {
      alert(err.message || 'Failed to delete work activity log');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (globalFilter.rangeType && globalFilter.rangeType !== 'all') {
        params.append('period', globalFilter.rangeType);
      }
      if (globalFilter.rangeType === 'custom') {
        if (globalFilter.startDate) params.append('startDate', globalFilter.startDate);
        if (globalFilter.endDate) params.append('endDate', globalFilter.endDate);
      }
      const res = await apiFetch<any>(`/activities?${params.toString()}`);
      setActivities(res.activities || []);
      setTotalHours(res.totalHours || 0);
    } catch (err: any) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [pData, uData] = await Promise.all([
        apiFetch<any[]>('/projects'),
        apiFetch<any[]>('/users'),
      ]);
      setProjectsList(pData);
      setMembersList(uData);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [globalFilter.rangeType, globalFilter.startDate, globalFilter.endDate]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleExportExcel = async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch('/api/v1/reports/export/excel', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed: ' + res.statusText);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VSS_Tracker_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export Excel report: ' + err.message);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/activities', {
        method: 'POST',
        body: JSON.stringify({
          userId: logMemberId || user?.id,
          projectId: logProjectId,
          workDescription: logDescription,
          hoursSpent: parseFloat(logHours),
        }),
      });

      setIsLogModalOpen(false);
      setLogDescription('');
      fetchActivities();
    } catch (err: any) {
      alert(err.message || 'Failed to log work activity');
    }
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedCategory && act.project?.projectType !== selectedCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Work Activities <span className="text-gradient">Log</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Log daily work activities, track hours spent, and generate organization activity reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="gradient" onClick={() => setIsLogModalOpen(true)}>
            <Plus size={18} /> Log Work Activity
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            style={{
              background: 'linear-gradient(135deg, #1D6F42, #217346)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
            }}
          >
            <Download size={18} /> Export Full Report (Excel)
          </Button>
        </div>
      </div>

      {/* Internal Work Activity Table */}
      <div className="glass-card" style={{ padding: '28px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="var(--primary)" />
            Activity Log Records
          </h3>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Clock size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Time Logged:</span>
            <strong style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
              {totalHours.toFixed(1)} Hours
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>({filteredActivities.length} logs)</span>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <Sparkles className="animate-pulse-glow" size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: 600 }}>Loading activity logs...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No work activity logs match the selected category or filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px', minWidth: '100px' }}>Serial No</th>
                  <th style={{ padding: '14px 16px', minWidth: '170px' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px', minWidth: '200px' }}>Team Member</th>
                  <th style={{ padding: '14px 16px', minWidth: '220px' }}>Project Name</th>
                  <th style={{ padding: '14px 16px', minWidth: '320px' }}>Work Description</th>
                  <th style={{ padding: '14px 16px', minWidth: '130px', textAlign: 'center' }}>Hours Spent</th>
                  <th style={{ padding: '14px 16px', minWidth: '160px' }}>Assigned By</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', minWidth: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((a) => {
                  const canManage = user?.role === 'ADMIN' || a.user.id === user?.id;
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--primary)', fontWeight: 800 }}>#{a.serialNo}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(a.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td
                        style={{ padding: '14px 16px', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
                        onClick={() => {
                          window.history.pushState({}, '', `/students/${a.user.id}`);
                          window.dispatchEvent(new Event('popstate'));
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {a.user.firstName} {a.user.lastName} <ArrowUpRight size={13} color="var(--text-muted)" />
                        </span>
                      </td>
                      <td
                        style={{ padding: '14px 16px', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
                        onClick={() => {
                          window.history.pushState({}, '', `/projects/${a.project.id}`);
                          window.dispatchEvent(new Event('popstate'));
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {a.project.name} <ArrowUpRight size={13} color="var(--text-muted)" />
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {a.workDescription}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {a.hoursSpent} hrs
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {a.assignedBy ? `${a.assignedBy.firstName} ${a.assignedBy.lastName}` : 'Admin'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {canManage ? (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <Button size="sm" variant="secondary" onClick={() => openEditModal(a)} title="Edit Activity Log">
                              <Edit2 size={14} />
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setDeletingActivityId(a.id)} title="Delete Activity Log">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Log Work Activity">
        <form onSubmit={handleLogActivity} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {user?.role === 'ADMIN' && (
            <Select
              label="Select Team Member"
              value={logMemberId}
              onChange={(e) => setLogMemberId(e.target.value)}
              options={[
                { value: '', label: 'Select Member...' },
                ...membersList.map((m) => ({
                  value: m.id,
                  label: `${m.firstName} ${m.lastName} (${m.role})`,
                })),
              ]}
              required
            />
          )}

          <Select
            label="Select Project"
            value={logProjectId}
            onChange={(e) => setLogProjectId(e.target.value)}
            options={[
              { value: '', label: 'Select Project...' },
              ...projectsList.map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
            required
          />

          <TextArea
            label="Work Description"
            placeholder="Describe the tasks completed or work performed during this session..."
            value={logDescription}
            onChange={(e) => setLogDescription(e.target.value)}
            required
          />

          <Input
            label="Hours Spent"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={logHours}
            onChange={(e) => setLogHours(e.target.value)}
            required
          />

          <Button variant="gradient" type="submit" style={{ marginTop: '8px' }}>
            Record Work Activity
          </Button>
        </form>
      </Modal>

      {/* Edit Activity Modal */}
      <Modal isOpen={Boolean(editingActivity)} onClose={() => setEditingActivity(null)} title="Edit Work Activity Log">
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {user?.role === 'ADMIN' && (
            <Select
              label="Team Member"
              value={editMemberId}
              onChange={(e) => setEditMemberId(e.target.value)}
              options={membersList.map((m) => ({
                value: m.id,
                label: `${m.firstName} ${m.lastName} (${m.role})`,
              }))}
              required
            />
          )}

          <Select
            label="Project"
            value={editProjectId}
            onChange={(e) => setEditProjectId(e.target.value)}
            options={projectsList.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            required
          />

          <TextArea
            label="Work Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            required
          />

          <Input
            label="Hours Spent"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            required
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button variant="gradient" type="submit" isLoading={isSavingEdit} disabled={isSavingEdit} style={{ flex: 1 }}>
              Save Changes
            </Button>
            <Button variant="secondary" type="button" onClick={() => setEditingActivity(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Activity Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingActivityId)}
        onClose={() => setDeletingActivityId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Work Activity Log"
        message="Are you sure you want to delete this work activity log entry? The logged hours will be deducted from activity totals."
        confirmText="Delete Activity Log"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
