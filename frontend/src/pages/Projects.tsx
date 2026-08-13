import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCategoryFilterStore } from '../store/categoryFilterStore';
import { useDateFilterStore } from '../store/dateFilterStore';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Badge } from '../components/UI/Badge';
import { FolderPlus, Search, Users, CheckCircle2, User as UserIcon, Sparkles, Layers, X, ArrowLeft, Settings } from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  scope?: string;
  projectType: string;
  status: 'PLANNING' | 'ONGOING' | 'ACTIVE' | 'ON_HOLD' | 'AT_RISK' | 'COMPLETED' | 'CANCELLED';
  statusReason?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalTasks: number;
  completedTasks: number;
  memberCount: number;
  lead?: { id: string; firstName: string; lastName: string; email: string };
  client?: { id: string; name: string; phone?: string; email?: string; address?: string; referencePerson?: string };
  referencePerson?: string;
  createdAt: string;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface ProjectsPageProps {
  onSelectProject?: (id: string) => void;
  onToggleFullScreenForm?: (active: boolean) => void;
  onOpenCategoryManager?: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject, onToggleFullScreenForm, onOpenCategoryManager }) => {
  const user = useAuthStore((state) => state.user);
  const { selectedCategory, categories } = useCategoryFilterStore();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Project Modal / Page View State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [scope, setScope] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('WEBSITE_WEBAPP');
  const [leadId, setLeadId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [availableMembers, setAvailableMembers] = useState<UserOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [referencePerson, setReferencePerson] = useState('');
  const [availableClients, setAvailableClients] = useState<{ id: string; name: string }[]>([]);

  const openCreateForm = () => {
    setIsCreateOpen(true);
    if (onToggleFullScreenForm) onToggleFullScreenForm(true);
  };

  const closeCreateForm = () => {
    setIsCreateOpen(false);
    if (onToggleFullScreenForm) onToggleFullScreenForm(false);
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const data = await apiFetch<ProjectItem[]>(`/projects?${params.toString()}`);
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await apiFetch<UserOption[]>('/users');
      setAvailableMembers(data);
    } catch {
      // Ignore
    }
  };

  const fetchClients = async () => {
    try {
      const data = await apiFetch<{ id: string; name: string }[]>('/clients');
      setAvailableClients(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchMembers();
      fetchClients();
    }
  }, [user]);

  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingProject) return;
    setIsCreatingProject(true);
    try {
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          scope,
          description,
          projectType,
          leadId: leadId || undefined,
          clientId: clientId || undefined,
          referencePerson: referencePerson || undefined,
          startDate: formStartDate || undefined,
          targetEndDate: targetEndDate || undefined,
          priority,
        }),
      });

      closeCreateForm();
      setName('');
      setScope('');
      setDescription('');
      setLeadId('');
      setClientId('');
      setReferencePerson('');
      setFormStartDate('');
      setTargetEndDate('');
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const getStatusBadge = (status: ProjectItem['status']) => {
    switch (status) {
      case 'ACTIVE':
      case 'ONGOING':
        return <Badge variant="success" pulse>Active</Badge>;
      case 'AT_RISK':
        return <Badge variant="danger" pulse>At Risk</Badge>;
      case 'ON_HOLD':
        return <Badge variant="warning">On Hold</Badge>;
      case 'COMPLETED':
        return <Badge variant="info">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'PLANNING':
      default:
        return <Badge variant="neutral">Planning</Badge>;
    }
  };

  const { rangeType, startDate, endDate } = useDateFilterStore();

  const filteredProjects = projects.filter((p) => {
    if (selectedCategory && p.projectType !== selectedCategory) {
      return false;
    }
    if (rangeType && rangeType !== 'all' && (startDate || endDate)) {
      const pDate = new Date(p.createdAt);
      if (startDate && pDate < new Date(startDate)) return false;
      if (endDate && pDate > new Date(endDate + 'T23:59:59')) return false;
    }
    if (statusFilter) {
      if (statusFilter === 'ONGOING' || statusFilter === 'ACTIVE') {
        if (p.status !== 'ONGOING' && p.status !== 'ACTIVE') return false;
      } else if (p.status !== statusFilter) {
        return false;
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesScope = p.scope?.toLowerCase().includes(q);
      const matchesLead = p.lead ? `${p.lead.firstName} ${p.lead.lastName}`.toLowerCase().includes(q) : false;
      if (!matchesName && !matchesScope && !matchesLead) return false;
    }
    return true;
  });

  // Dedicated Page view for Creating & Assigning New Project
  if (isCreateOpen) {
    return (
      <div className="animate-fade-in" style={{ padding: '36px 0', width: '90%', maxWidth: '1200px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={closeCreateForm}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            marginBottom: '24px',
          }}
        >
          <ArrowLeft size={18} /> Back to Projects Directory
        </button>

        <div className="glass-card" style={{ padding: '36px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              Create & Assign <span className="text-gradient">New Project</span>
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Fill in project deliverables, target deadlines, and directly assign a lead team member.
            </p>
          </div>

          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Input
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mobile Application Overhaul"
                required
              />
              <Select
                label="Project Type / Category"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                options={categories.map((c) => ({
                  value: c.code,
                  label: `${c.icon || '📁'} ${c.name}`,
                }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Select
                label="Assign Team Member (Optional)"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                options={[
                  { value: '', label: 'None (Unassigned - Assign Later)' },
                  ...availableMembers.map((u) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName} (${u.role})`,
                  })),
                ]}
              />
              <Select
                label="Priority Level"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Select
                label="🏢 Client (Optional)"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                options={[
                  { value: '', label: 'None (Internal / No Client)' },
                  ...availableClients.map((c) => ({
                    value: c.id,
                    label: `🏢 ${c.name}`,
                  })),
                ]}
              />
              <Input
                label="👨‍🏫 Referred By / Reference Person or Teacher (Optional)"
                placeholder="e.g. Dr. Sharma / Prof. Kulkarni"
                value={referencePerson}
                onChange={(e) => setReferencePerson(e.target.value)}
                helperText="Person or teacher who referred this project/client"
              />
            </div>

            {/* Supervisor / Creator Info Banner */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <span style={{ fontSize: '1.2rem' }}>👨‍🏫</span>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Assigned By / Supervisor: </span>
                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                  {user ? `${user.firstName} ${user.lastName} (${user.role})` : 'System Admin'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Input
                label="📅 Started Date (Optional)"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                helperText="Project start date. Leave empty if Not Set."
              />
              <Input
                label="🎯 Target Delivery Date (Optional)"
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                helperText="Target completion deadline. Automatically sets status to AT_RISK if overdue."
              />
            </div>

            <TextArea
              label="Project Scope & Key Deliverables"
              placeholder="Detailed scope of deliverables included in this project..."
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              required
              rows={4}
            />

            <TextArea
              label="Additional Notes / Description (Optional)"
              placeholder="Optional notes or background information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
              <Button variant="gradient" type="submit" isLoading={isCreatingProject} disabled={isCreatingProject} style={{ flex: 1, padding: '12px' }}>
                <FolderPlus size={18} style={{ marginRight: '8px' }} />
                Create & Register Project
              </Button>
              <Button variant="secondary" type="button" onClick={closeCreateForm} style={{ padding: '12px 24px' }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Digital <span className="text-gradient">Projects</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Admin project creation, direct student assignments, scopes, and deliverable tracking.
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <Button variant="gradient" onClick={openCreateForm}>
              <FolderPlus size={18} />
              Create & Assign Project
            </Button>
            {onOpenCategoryManager && (
              <Button size="sm" variant="secondary" onClick={onOpenCategoryManager} style={{ fontSize: '0.82rem' }}>
                <Settings size={14} color="var(--primary)" /> Manage Project Categories
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filters Glass Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px 24px',
          marginBottom: '28px',
        }}
      >
        {/* Search Project Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 18px',
          }}
        >
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search projects by title, scope, or assigned student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTimeout(fetchProjects, 0);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Buttons Line (Horizontal Row Below Search) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              marginRight: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Category:
          </span>

          {[
            { value: '', label: 'All Projects' },
            { value: 'ONGOING', label: 'Active' },
            { value: 'PLANNING', label: 'Planning' },
            { value: 'AT_RISK', label: 'At Risk' },
            { value: 'ON_HOLD', label: 'On Hold' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ].map((cat) => {
            const isActive = statusFilter === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setStatusFilter(cat.value)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isActive ? '1px solid transparent' : '1px solid var(--border-color)',
                  background: isActive
                    ? 'linear-gradient(135deg, var(--primary), var(--accent-purple))'
                    : 'var(--bg-card)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Cards Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <Sparkles className="animate-pulse-glow" size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
          <p style={{ fontWeight: 600 }}>Loading project portfolios...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)' }}>
          <Layers size={44} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Projects Found</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            No projects match the selected category or filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
          {filteredProjects.map((p) => {
            const progressPercent = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;

            return (
              <div
                key={p.id}
                className="glass-card hover-lift"
                onClick={() => onSelectProject?.(p.id)}
                style={{
                  padding: '26px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Accent Top Border */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: p.status === 'AT_RISK' ? 'var(--danger)' : p.status === 'ONGOING' ? 'linear-gradient(90deg, var(--primary), var(--accent-purple))' : 'var(--border-color)',
                  }}
                />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <Badge variant="neutral">{p.projectType.replace(/_/g, ' ')}</Badge>
                    {getStatusBadge(p.status)}
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                    {p.name}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.scope || p.description || 'No scope details specified.'}
                  </p>

                  {(p.client || p.referencePerson) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '0.8rem' }}>
                      {p.client && (
                        <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          🏢 Client: {p.client.name}
                        </span>
                      )}
                      {(p.referencePerson || p.client?.referencePerson) && (
                        <span style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)', fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          👨‍🏫 Referred By: {p.referencePerson || p.client?.referencePerson}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Task Count Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <CheckCircle2 size={15} color="var(--primary)" />
                        Progress
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {p.completedTasks}/{p.totalTasks} ({progressPercent}%)
                      </strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          background: 'linear-gradient(90deg, var(--primary), var(--accent-purple))',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Assigned Member & Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={14} color="var(--primary)" />
                      <span>Assigned: <strong style={{ color: 'var(--text-primary)' }}>{p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : 'Unassigned'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} />
                      <span>{p.memberCount} members</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
