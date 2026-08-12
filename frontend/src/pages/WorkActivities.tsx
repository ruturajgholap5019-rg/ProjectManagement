import React, { useState, useEffect } from 'react';
import { useDateFilterStore } from '../store/dateFilterStore';
import { useCategoryFilterStore } from '../store/categoryFilterStore';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Download, Plus, Search, Clock, Sparkles, FileText, ArrowUpRight } from 'lucide-react';

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

  // Filters
  const [search, setSearch] = useState<string>('');

  // Log Activity Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logProjectId, setLogProjectId] = useState('');
  const [logMemberId, setLogMemberId] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [logHours, setLogHours] = useState('2.0');
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);

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
      if (search) params.append('search', search);

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

  const handleExportCSV = async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const params = new URLSearchParams();
      if (globalFilter.rangeType && globalFilter.rangeType !== 'all') {
        params.append('period', globalFilter.rangeType);
      }
      if (globalFilter.rangeType === 'custom') {
        if (globalFilter.startDate) params.append('startDate', globalFilter.startDate);
        if (globalFilter.endDate) params.append('endDate', globalFilter.endDate);
      }
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/activities/export/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work_activities_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message);
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
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchesDesc = act.workDescription ? act.workDescription.toLowerCase().includes(q) : false;
      const matchesProj = act.project?.name ? act.project.name.toLowerCase().includes(q) : false;
      const matchesUser = act.user ? `${act.user.firstName} ${act.user.lastName}`.toLowerCase().includes(q) : false;
      if (!matchesDesc && !matchesProj && !matchesUser) return false;
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

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="gradient" onClick={() => setIsLogModalOpen(true)}>
            <Plus size={18} /> Log Work Activity
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download size={18} /> Export Report (CSV)
          </Button>
        </div>
      </div>

      {/* Filter Options Glass Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search activities by description, project, or member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchActivities()}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.92rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Quick Summary Banner */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '18px', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%)' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={24} />
        </div>
        <div>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Time Recorded</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {totalHours.toFixed(1)} Hours <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>({filteredActivities.length} activity logs)</span>
          </div>
        </div>
      </div>

      {/* Internal Work Activity Table */}
      <div className="glass-card" style={{ padding: '28px', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} color="var(--primary)" />
          Activity Log Records
        </h3>

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
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((a) => (
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
                  </tr>
                ))}
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
    </div>
  );
};
