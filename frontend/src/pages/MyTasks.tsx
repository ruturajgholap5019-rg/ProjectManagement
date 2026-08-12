import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCategoryFilterStore } from '../store/categoryFilterStore';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { Input, TextArea, Select } from '../components/UI/Input';
import {
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Clock,
  Plus,
  Calendar,
  CheckSquare,
  MessageSquare,
  Edit2,
  ThumbsUp,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  completedAt?: string;
  completionNotes?: string;
  isBlocked: boolean;
  blockedReason?: string;
  project: { id: string; name: string; projectType?: string };
  milestone?: { id: string; name: string };
  assignee?: { id: string; firstName: string; lastName: string; email: string };
}

interface MyTasksPageProps {
  onSelectProject?: (projectId: string) => void;
}

export const MyTasksPage: React.FC<MyTasksPageProps> = ({ onSelectProject }) => {
  const user = useAuthStore((state) => state.user);
  const { selectedCategory } = useCategoryFilterStore();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Edit Task Modal State (For Admin & Project Lead & Assignee)
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<string>('MEDIUM');
  const [editDueDate, setEditDueDate] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Blocker Modal State
  const [blockTaskId, setBlockTaskId] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState('');

  // Log Effort Modal State
  const [logTaskId, setLogTaskId] = useState<string | null>(null);
  const [logHours, setLogHours] = useState('2.0');
  const [logNotes, setLogNotes] = useState('');

  // Completion Notes Modal State
  const [completionTaskId, setCompletionTaskId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('COMPLETED');
  const [completionNotes, setCompletionNotes] = useState('');

  const fetchMyTasks = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<TaskItem[]>('/tasks/my-tasks');
      setTasks(data);
    } catch (err: any) {
      console.error('Failed to fetch assigned tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const handleOpenEdit = (t: TaskItem) => {
    setEditingTask(t);
    setEditTitle(t.title);
    setEditDescription(t.description || '');
    setEditPriority(t.priority || 'MEDIUM');
    setEditDueDate(t.dueDate ? t.dueDate.split('T')[0] : '');
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    setIsSavingTask(true);
    try {
      await apiFetch(`/tasks/${editingTask.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || undefined,
          priority: editPriority,
          dueDate: editDueDate || undefined,
        }),
      });

      showToast('Task updated successfully!', 'success');
      setEditingTask(null);
      fetchMyTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
    } finally {
      setIsSavingTask(false);
    }
  };

  const executeStatusChange = async (taskId: string, newStatus: string, notes?: string) => {
    // Optimistic UI state update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus as any,
              completionNotes: notes !== undefined ? notes : t.completionNotes,
              completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
    showToast(`Task status updated to ${newStatus.replace('_', ' ')}`, 'success');

    try {
      await apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, completionNotes: notes }),
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to update task status', 'error');
      fetchMyTasks(); // Revert on failure
    }
  };

  const handleStatusSelect = (taskId: string, newStatus: string) => {
    if (newStatus === 'COMPLETED' || newStatus === 'REVIEW') {
      setCompletionTaskId(taskId);
      setTargetStatus(newStatus);
      setCompletionNotes('');
    } else {
      executeStatusChange(taskId, newStatus);
    }
  };

  const handleConfirmCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionTaskId) return;
    executeStatusChange(completionTaskId, targetStatus, completionNotes);
    setCompletionTaskId(null);
    setCompletionNotes('');
  };

  const handleMarkBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTaskId || !blockedReason.trim()) return;

    try {
      await apiFetch(`/tasks/${blockTaskId}/block`, {
        method: 'PATCH',
        body: JSON.stringify({ blockedReason }),
      });
      showToast('Blocker flagged successfully', 'warning');
      setBlockTaskId(null);
      setBlockedReason('');
      fetchMyTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to flag manual blocker', 'error');
    }
  };

  const handleLogEffort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTaskId || !logNotes.trim()) return;

    const targetTask = tasks.find((t) => t.id === logTaskId);
    if (!targetTask) return;

    try {
      await apiFetch('/activities', {
        method: 'POST',
        body: JSON.stringify({
          projectId: targetTask.project.id,
          workDescription: `[${targetTask.title}] ${logNotes.trim()}`,
          hoursSpent: parseFloat(logHours) || 1.0,
        }),
      });
      showToast(`Logged ${logHours} hours to activity log! 🎉`, 'success');
      setLogTaskId(null);
      setLogNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to log effort', 'error');
    }
  };

  // Telemetry Calculations
  const categoryFilteredTasks = tasks.filter(
    (t) => !selectedCategory || (t.project?.projectType && t.project.projectType === selectedCategory)
  );

  const completedCount = categoryFilteredTasks.filter((t) => t.status === 'COMPLETED').length;
  const totalCount = categoryFilteredTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = categoryFilteredTasks.filter((t) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'COMPLETED') return t.status === 'COMPLETED';
    return t.status === activeTab;
  });

  // Group filtered tasks by project
  const projectGroupMap = filteredTasks.reduce((acc, t) => {
    const pId = t.project.id;
    if (!acc[pId]) {
      acc[pId] = {
        project: t.project,
        tasks: [],
      };
    }
    acc[pId].tasks.push(t);
    return acc;
  }, {} as Record<string, { project: { id: string; name: string; projectType?: string }; tasks: TaskItem[] }>);

  const projectGroups = Object.values(projectGroupMap);

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const isPast = date < new Date() && new Date().toDateString() !== date.toDateString();
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOverdue: isPast,
    };
  };

  const isCanEditTask = user?.role === 'ADMIN' || user?.role === 'PROJECT_LEAD';

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Deliverables & <span className="text-gradient">Tasks Workspace</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Deliverables are grouped by Project. Click on any Project Card to view or hide its tasks.
          </p>
        </div>

        {/* Task Completion Progress Card */}
        <div className="glass-card" style={{ padding: '16px 22px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} color="var(--primary)" /> Progress Telemetry
            </span>
            <span style={{ color: 'var(--primary)' }}>{completedCount} / {totalCount} ({progressPercent}%)</span>
          </div>

          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
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
      </div>

      {/* Filter Tabs Glass Bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: activeTab === tab ? 'var(--primary-light)' : 'transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 700 : 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              const allExp: Record<string, boolean> = {};
              projectGroups.forEach((g) => {
                allExp[g.project.id] = true;
              });
              setExpandedProjects(allExp);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: '0.80rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => setExpandedProjects({})}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: '0.80rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tasks List Grouped By Project */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <Sparkles className="animate-pulse-glow" size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
          <p style={{ fontWeight: 600 }}>Loading deliverables...</p>
        </div>
      ) : projectGroups.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <CheckCircle2 size={44} color="var(--success)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Deliverables Found</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            No deliverables found under the selected "{activeTab.replace('_', ' ')}" status tab.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {projectGroups.map(({ project, tasks: projTasks }) => {
            const isExpanded = Boolean(expandedProjects[project.id]);
            const projCompletedCount = projTasks.filter((t) => t.status === 'COMPLETED').length;

            return (
              <div key={project.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {/* Project Header Bar - Click to Expand / Collapse */}
                <div
                  onClick={() => toggleProjectExpansion(project.id)}
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-card-hover)',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    userSelect: 'none',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FolderKanban size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                          {project.name}
                        </h2>
                        {project.projectType && (
                          <Badge variant="neutral">{project.projectType.replace(/_/g, ' ')}</Badge>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {projTasks.length} Deliverable{projTasks.length > 1 ? 's' : ''} ({projCompletedCount} Completed)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {onSelectProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(project.id);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--primary)',
                          fontSize: '0.80rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="View Full Project Details"
                      >
                        <span>View Project</span>
                        <ExternalLink size={13} />
                      </button>
                    )}

                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                </div>

                {/* Deliverables List under this Project */}
                {isExpanded && (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-main)' }}>
                    {projTasks.map((t) => {
                      const dueInfo = formatDueDate(t.dueDate);
                      const isCompleted = t.status === 'COMPLETED';
                      const isUnderReview = t.status === 'REVIEW';

                      return (
                        <div
                          key={t.id}
                          className="glass-card hover-lift"
                          style={{
                            padding: '20px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '16px',
                            backgroundColor: 'var(--bg-card)',
                            borderLeft: t.isBlocked
                              ? '4px solid var(--danger)'
                              : isCompleted
                              ? '4px solid var(--success)'
                              : isUnderReview
                              ? '4px solid var(--accent-purple)'
                              : t.priority === 'CRITICAL'
                              ? '4px solid var(--danger)'
                              : '4px solid var(--primary)',
                          }}
                        >
                          <div style={{ flex: 1, paddingRight: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              {t.milestone && <Badge variant="info">{t.milestone.name}</Badge>}
                              <Badge variant={t.priority === 'CRITICAL' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                                {t.priority}
                              </Badge>
                              {t.assignee && (
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                  Assignee: {t.assignee.firstName} {t.assignee.lastName}
                                </span>
                              )}

                              {/* Deadline Badge */}
                              {dueInfo && (
                                <span
                                  style={{
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    padding: '3px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    backgroundColor: dueInfo.isOverdue && !isCompleted ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-main)',
                                    color: dueInfo.isOverdue && !isCompleted ? 'var(--danger)' : 'var(--text-secondary)',
                                    border: dueInfo.isOverdue && !isCompleted ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                  }}
                                >
                                  <Calendar size={13} />
                                  {dueInfo.isOverdue && !isCompleted ? `Overdue (${dueInfo.text})` : `Deadline: ${dueInfo.text}`}
                                </span>
                              )}
                            </div>

                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                              {t.title}
                            </h3>

                            {t.description && (
                              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{t.description}</p>
                            )}

                            {/* Completion Work Notes Display */}
                            {t.completionNotes && (
                              <div
                                style={{
                                  marginTop: '10px',
                                  backgroundColor: 'var(--bg-main)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '10px 14px',
                                  borderLeft: '3px solid var(--success)',
                                  fontSize: '0.85rem',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--success)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <MessageSquare size={13} /> Deliverable Submission / Review Notes:
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.4' }}>{t.completionNotes}</p>
                              </div>
                            )}

                            {t.isBlocked && (
                              <div style={{ marginTop: '10px', color: 'var(--danger)', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={15} /> Blocked: {t.blockedReason}
                              </div>
                            )}
                          </div>

                          {/* Status Dropdown & Action Controls */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '190px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status:</span>
                              <select
                                value={t.status}
                                onChange={(e) => handleStatusSelect(t.id, e.target.value)}
                                style={{
                                  backgroundColor: isCompleted ? 'var(--success-light)' : isUnderReview ? 'var(--primary-light)' : 'var(--bg-main)',
                                  border: isCompleted ? '1px solid var(--success)' : isUnderReview ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                  color: isCompleted ? 'var(--success)' : isUnderReview ? 'var(--primary)' : 'var(--text-primary)',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  padding: '6px 12px',
                                  borderRadius: 'var(--radius-md)',
                                  outline: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="REVIEW">Under Review</option>
                                <option value="COMPLETED">Completed</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {isCanEditTask && (
                                <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(t)} title="Edit Task Details">
                                  <Edit2 size={14} /> Edit
                                </Button>
                              )}

                              <Button size="sm" variant="secondary" onClick={() => { setLogTaskId(t.id); setLogNotes(''); setLogHours('2.0'); }} title="Log Work Effort">
                                <Clock size={14} /> Log Effort
                              </Button>

                              {/* Admin / Lead Review Approval Action */}
                              {isCanEditTask && isUnderReview && (
                                <Button
                                  size="sm"
                                  variant="gradient"
                                  onClick={() => {
                                    setCompletionTaskId(t.id);
                                    setTargetStatus('COMPLETED');
                                    setCompletionNotes('Approved deliverable review.');
                                  }}
                                  title="Approve Deliverable Review"
                                >
                                  <ThumbsUp size={14} /> Approve Review
                                </Button>
                              )}

                              {!isCompleted && !isUnderReview && (
                                <Button
                                  size="sm"
                                  variant="gradient"
                                  onClick={() => {
                                    setCompletionTaskId(t.id);
                                    setTargetStatus('COMPLETED');
                                    setCompletionNotes(t.completionNotes || '');
                                  }}
                                >
                                  <CheckCircle2 size={14} /> Mark Completed
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Task Modal (For Admin & Project Lead) */}
      <Modal isOpen={Boolean(editingTask)} onClose={() => setEditingTask(null)} title="Edit Task Details">
        {editingTask && (
          <form onSubmit={handleSaveEditTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input label="Task Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
            <TextArea label="Description (Optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Select
                label="Priority"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
              />
              <Input label="Due Date (Optional)" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <Button variant="gradient" type="submit" isLoading={isSavingTask} style={{ flex: 1 }}>
                Save Task Changes
              </Button>
              <Button variant="secondary" type="button" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Completion Notes Modal */}
      <Modal isOpen={Boolean(completionTaskId)} onClose={() => setCompletionTaskId(null)} title="Complete Task & Add Completion Notes">
        <form onSubmit={handleConfirmCompletion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Updating deliverable status to <strong>{targetStatus.replace('_', ' ')}</strong>. You can optionally summarize what was completed, tested, or merged:
          </p>

          <TextArea
            label="Completion Work Notes (Optional)"
            placeholder="e.g. Implemented REST API endpoints, tested DB migrations, verified frontend integration..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />

          <Button variant="gradient" type="submit" style={{ marginTop: '8px' }}>
            <CheckCircle2 size={16} /> Save Status & Completion Summary
          </Button>
        </form>
      </Modal>

      {/* Manual Blocker Dialog */}
      <Modal isOpen={!!blockTaskId} onClose={() => setBlockTaskId(null)} title="Report Manual Blocker">
        <form onSubmit={handleMarkBlocked} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <TextArea
            label="Reason for Blocker (Required)"
            placeholder="Describe missing credentials, pending decisions, or technical blockers preventing progress..."
            value={blockedReason}
            onChange={(e) => setBlockedReason(e.target.value)}
            required
          />
          <Button type="submit" variant="danger" style={{ marginTop: '8px' }}>
            Flag Task as Blocked
          </Button>
        </form>
      </Modal>

      {/* Log Work Effort Dialog */}
      <Modal isOpen={!!logTaskId} onClose={() => setLogTaskId(null)} title="Log Work Effort for Deliverable">
        <form onSubmit={handleLogEffort} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <TextArea
            label="Work Summary / Notes"
            placeholder="Describe progress made during this session..."
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            required
          />
          <Button type="submit" variant="gradient" style={{ marginTop: '8px' }}>
            <Plus size={16} /> Save to Work Activity Log
          </Button>
        </form>
      </Modal>
    </div>
  );
};
