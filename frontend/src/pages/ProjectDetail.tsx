import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCategoryFilterStore } from '../store/categoryFilterStore';
import { Button } from '../components/UI/Button';
import { Select, TextArea, Input } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { Badge } from '../components/UI/Badge';
import { generateProjectPdfReport } from '../utils/pdfReportGenerator';
import { CheckCircle2, UserPlus, UserX, AlertTriangle, Plus, MessageSquare, Paperclip, Download, Sparkles, FileText, Trash2 } from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onToggleFullScreenForm?: (isFullScreen: boolean) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailProps> = ({ projectId, onBack, onToggleFullScreenForm }) => {
  const user = useAuthStore((state) => state.user);
  const { categories } = useCategoryFilterStore();

  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [projectActivities, setProjectActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'activities' | 'members' | 'comments' | 'files'>('overview');

  // Edit Project Settings Modal
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editProjectType, setEditProjectType] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editScope, setEditScope] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editTargetEndDate, setEditTargetEndDate] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editReferencePerson, setEditReferencePerson] = useState('');
  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);
  const [isSavingProject, setIsSavingProject] = useState(false);

  const fetchClientsList = async () => {
    try {
      const data = await apiFetch<{ id: string; name: string }[]>('/clients');
      setClientsList(data);
    } catch {
      // Ignore
    }
  };

  const openEditModal = () => {
    if (!project) return;
    setEditName(project.name || '');
    setEditProjectType(project.projectType || 'WEBSITE_WEBAPP');
    setEditPriority(project.priority || 'MEDIUM');
    setEditScope(project.scope || '');
    setEditDescription(project.description || '');
    setEditStartDate(project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : '');
    setEditTargetEndDate(project.targetEndDate ? new Date(project.targetEndDate).toISOString().slice(0, 10) : '');
    setEditClientId(project.clientId || project.client?.id || '');
    setEditReferencePerson(project.referencePerson || project.client?.referencePerson || '');
    fetchClientsList();
    setIsEditProjectOpen(true);
  };

  const handleUpdateProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProject(true);
    try {
      await apiFetch(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          projectType: editProjectType,
          priority: editPriority,
          scope: editScope,
          description: editDescription,
          clientId: editClientId || null,
          referencePerson: editReferencePerson.trim() || null,
          startDate: editStartDate || null,
          targetEndDate: editTargetEndDate || null,
        }),
      });

      setIsEditProjectOpen(false);
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update project details');
    } finally {
      setIsSavingProject(false);
    }
  };

  // Status Change Modal
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('ACTIVE');
  const [statusReason, setStatusReason] = useState<string>('');

  // Add Member Modal
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Create Milestone Modal
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');

  // Create Task Modal
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [taskMilestone, setTaskMilestone] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');

  const toggleTaskAssignee = (userId: string) => {
    setTaskAssignees((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= 2) {
        alert("A task can have a maximum of 2 assignees.");
        return prev;
      }
      return [...prev, userId];
    });
  };

  // Submitting States
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const openTaskModal = () => {
    setIsTaskOpen(true);
    if (onToggleFullScreenForm) onToggleFullScreenForm(true);
  };
  const closeTaskModal = () => {
    setIsTaskOpen(false);
    if (onToggleFullScreenForm) onToggleFullScreenForm(false);
  };

  const openMilestoneModal = () => {
    setIsMilestoneOpen(true);
    if (onToggleFullScreenForm) onToggleFullScreenForm(true);
  };
  const closeMilestoneModal = () => {
    setIsMilestoneOpen(false);
    if (onToggleFullScreenForm) onToggleFullScreenForm(false);
  };

  const closeAddMemberModal = () => {
    setIsAddMemberOpen(false);
    if (onToggleFullScreenForm) onToggleFullScreenForm(false);
  };

  // New Comment
  const [newComment, setNewComment] = useState('');

  // Upload File
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // PDF Report Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfTimeRange, setPdfTimeRange] = useState('ALL');
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate] = useState('');
  const [pdfStatusFilter, setPdfStatusFilter] = useState('ALL');
  const [pdfSections, setPdfSections] = useState({
    summary: true,
    members: true,
    tasks: true,
    comments: true,
    attachments: true,
  });

  const handleGeneratePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    let activitiesData: any[] = [];
    try {
      const res = await apiFetch<any>(`/activities?projectId=${projectId}`);
      activitiesData = res.activities || [];
    } catch {
      // Ignore
    }

    generateProjectPdfReport({
      project,
      members,
      milestones,
      tasks,
      comments,
      attachments,
      activities: activitiesData,
      timeRange: pdfTimeRange,
      startDate: pdfStartDate,
      endDate: pdfEndDate,
      statusFilter: pdfStatusFilter,
      includeSections: pdfSections,
    });
    setIsPdfModalOpen(false);
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [removeMemberUserId, setRemoveMemberUserId] = useState<string | null>(null);

  const fetchProjectDetails = async () => {
    setIsLoading(true);
    try {
      const [projData, membersData, msData, taskData, commentData, attachData, actData] = await Promise.all([
        apiFetch<any>(`/projects/${projectId}`),
        apiFetch<any[]>(`/projects/${projectId}/members`),
        apiFetch<any[]>(`/projects/${projectId}/milestones`),
        apiFetch<any[]>(`/projects/${projectId}/tasks`),
        apiFetch<any[]>(`/comments?projectId=${projectId}`),
        apiFetch<any[]>(`/attachments?projectId=${projectId}`),
        apiFetch<any>(`/activities?projectId=${projectId}`),
      ]);

      setProject(projData);
      setNewStatus(projData.status);
      setMembers(membersData);
      setMilestones(msData);
      setTasks(taskData);
      setComments(commentData);
      setAttachments(attachData);
      setProjectActivities(actData.activities || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (['AT_RISK', 'ON_HOLD', 'CANCELLED'].includes(newStatus) && !statusReason.trim()) {
      alert(`Reason for status change is required when setting status to ${newStatus.replace('_', ' ')}.`);
      return;
    }

    try {
      await apiFetch(`/projects/${projectId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, statusReason: statusReason.trim() || undefined }),
      });

      setIsStatusOpen(false);
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleOpenAddMember = async () => {
    try {
      const users = await apiFetch<any[]>('/users');
      setAllUsers(users);
      setIsAddMemberOpen(true);
      if (onToggleFullScreenForm) onToggleFullScreenForm(true);
    } catch {
      alert('Failed to load user list');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || isAddingMember) return;

    setIsAddingMember(true);
    try {
      await apiFetch(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUserId }),
      });

      closeAddMemberModal();
      setSelectedUserId('');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!removeMemberUserId) return;
    try {
      await apiFetch(`/projects/${projectId}/members/${removeMemberUserId}`, {
        method: 'DELETE',
      });
      setRemoveMemberUserId(null);
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleConfirmDeleteProject = async () => {
    setIsDeletingProject(true);
    try {
      await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
      setIsDeleteConfirmOpen(false);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingMilestone) return;

    setIsCreatingMilestone(true);
    try {
      await apiFetch(`/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ name: milestoneName, description: milestoneDesc }),
      });
      closeMilestoneModal();
      setMilestoneName('');
      setMilestoneDesc('');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to create milestone');
    } finally {
      setIsCreatingMilestone(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingTask) return;

    setIsCreatingTask(true);
    try {
      await apiFetch(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          assigneeId: taskAssignees[0] || taskAssignee || undefined,
          coAssigneeId: taskAssignees[1] || undefined,
          milestoneId: taskMilestone || undefined,
          priority: taskPriority,
        }),
      });
      closeTaskModal();
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskAssignees([]);
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleDeleteMilestone = async (msId: string) => {
    if (!window.confirm('Are you sure you want to delete this milestone? Associated tasks will be unlinked.')) return;
    try {
      await apiFetch(`/milestones/${msId}`, { method: 'DELETE' });
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete milestone');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPostingComment) return;

    setIsPostingComment(true);
    try {
      await apiFetch('/comments', {
        method: 'POST',
        body: JSON.stringify({ projectId, content: newComment }),
      });
      setNewComment('');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);

      const token = useAuthStore.getState().accessToken;
      const res = await fetch('/api/v1/attachments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }

      setSelectedFile(null);
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '36px' }}>Loading project details...</div>;
  }

  if (isEditProjectOpen) {
    return (
      <div className="animate-fade-in" style={{ padding: '24px 36px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="glass-card" style={{ padding: '36px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Edit Project Details
            </h2>
          </div>

          <form onSubmit={handleUpdateProjectDetails} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <Input
              label="Project Title"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Project name..."
              required
            />

            <Select
              label="Project Type / Category"
              value={editProjectType}
              onChange={(e) => setEditProjectType(e.target.value)}
              options={categories.map((c) => ({
                value: c.code,
                label: `${c.icon || '📁'} ${c.name}`,
              }))}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Select
                label="🏢 Client (Optional)"
                value={editClientId}
                onChange={(e) => setEditClientId(e.target.value)}
                options={[
                  { value: '', label: 'None (Internal / No Client)' },
                  ...clientsList.map((c) => ({
                    value: c.id,
                    label: `🏢 ${c.name}`,
                  })),
                ]}
              />
              <Input
                label="👨‍🏫 Referred By (Person / Teacher)"
                placeholder="e.g. Dr. Sharma / Prof. Kulkarni"
                value={editReferencePerson}
                onChange={(e) => setEditReferencePerson(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input
                label="📅 Started Date (Optional)"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                helperText="Leave empty if Not Set"
              />
              <Input
                label="🎯 Target Delivery Date (Optional)"
                type="date"
                value={editTargetEndDate}
                onChange={(e) => setEditTargetEndDate(e.target.value)}
                helperText="Target completion deadline"
              />
            </div>

            <TextArea
              label="Project Scope & Deliverables"
              value={editScope}
              onChange={(e) => setEditScope(e.target.value)}
              placeholder="Detailed scope..."
              rows={4}
            />

            <TextArea
              label="Background Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Notes or description..."
              rows={3}
            />

            <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
              <Button variant="gradient" type="submit" isLoading={isSavingProject} style={{ flex: 1, padding: '12px' }}>
                Save Changes
              </Button>
              <Button variant="secondary" type="button" onClick={() => setIsEditProjectOpen(false)} style={{ padding: '12px 24px' }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Sparkles className="animate-pulse-glow" size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
        <p style={{ fontWeight: 600 }}>Loading project workbench...</p>
      </div>
    );
  }

  const isLeadOrAdmin = user?.role === 'ADMIN' || project.leadId === user?.id;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = tasks.filter((t) => ['IN_PROGRESS', 'REVIEW', 'REVISION'].includes(t.status)).length;
  const todoCount = tasks.filter((t) => t.status === 'TODO').length;
  const totalCount = tasks.length || project.totalTasks || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* Main Header Banner */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <Badge
                variant="gradient"
                style={{ cursor: user?.role === 'ADMIN' ? 'pointer' : 'default' }}
                title={user?.role === 'ADMIN' ? 'Click to edit category / project type' : undefined}
                onClick={() => user?.role === 'ADMIN' && openEditModal()}
              >
                {project.projectType.replace(/_/g, ' ')}
                {user?.role === 'ADMIN' && <span style={{ marginLeft: '4px', opacity: 0.8 }}>✏️</span>}
              </Badge>
              <Badge
                variant={project.priority === 'CRITICAL' ? 'danger' : project.priority === 'HIGH' ? 'warning' : 'info'}
                style={{ cursor: user?.role === 'ADMIN' ? 'pointer' : 'default' }}
                title={user?.role === 'ADMIN' ? 'Click to edit project priority' : undefined}
                onClick={() => user?.role === 'ADMIN' && openEditModal()}
              >
                Priority: {project.priority}
                {user?.role === 'ADMIN' && <span style={{ marginLeft: '4px', opacity: 0.8 }}>✏️</span>}
              </Badge>
              <Badge variant={project.status === 'AT_RISK' ? 'danger' : project.status === 'ONGOING' || project.status === 'ACTIVE' ? 'success' : 'neutral'} pulse>
                {project.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {project.name}
            </h1>

            {/* Additional Context Metadata */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', fontSize: '0.85rem' }}>
              {project.client && (
                <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  🏢 Client: {project.client.name}
                </span>
              )}
              {(project.referencePerson || project.client?.referencePerson) && (
                <span style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  👨‍🏫 Referred By: {project.referencePerson || project.client?.referencePerson}
                </span>
              )}
              {project.lead && (
                <span style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  👤 Assigned To (Lead): {project.lead.firstName} {project.lead.lastName}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="gradient" onClick={() => setIsPdfModalOpen(true)}>
              <FileText size={16} /> Download PDF Report
            </Button>
            {user?.role === 'ADMIN' && (
              <Button variant="secondary" onClick={openEditModal}>
                Edit Details & Priority
              </Button>
            )}
            {isLeadOrAdmin && (
              <Button variant="secondary" onClick={() => setIsStatusOpen(true)}>
                Change Status
              </Button>
            )}
            {user?.role === 'ADMIN' && (
              <Button variant="danger" onClick={() => setIsDeleteConfirmOpen(true)}>
                Delete Project
              </Button>
            )}
          </div>
        </div>

        {project.statusReason && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px 18px',
              backgroundColor: 'var(--warning-light)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--warning)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={18} />
            <span>
              <strong>Status Reason:</strong> {project.statusReason}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs Glass Bar */}
      <div className="glass-card" style={{ display: 'flex', gap: '8px', padding: '8px 12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: `Milestones & Tasks (${tasks.length})` },
          { id: 'activities', label: `Work Activity (${projectActivities.length})` },
          { id: 'members', label: `Team Members (${members.length})` },
          { id: 'comments', label: `Comments (${comments.length})` },
          { id: 'files', label: `Files (${attachments.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Key Metadata Card */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--primary)" />
                Project Information & Key Dates
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>📅 Started Date</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>🎯 Target Delivery Date</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>👨‍🏫 Assigned By / Supervisor</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {project.creator ? `${project.creator.firstName} ${project.creator.lastName} (${project.creator.role})` : 'System Admin'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>🏢 Client Details</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {project.client ? (
                      <div>
                        <div>🏢 {project.client.name}</div>
                        {(project.client.phone || project.client.email) && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                            {project.client.phone && <span>📞 {project.client.phone} </span>}
                            {project.client.email && <span>✉️ {project.client.email}</span>}
                          </div>
                        )}
                      </div>
                    ) : (
                      'Internal Project (No Client)'
                    )}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>👨‍🏫 Referenced By (Person / Teacher)</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {project.referencePerson || project.client?.referencePerson ? (
                      <span>👨‍🏫 {project.referencePerson || project.client?.referencePerson}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Not set</span>
                    )}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>🏷️ Category / Domain</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {project.projectType ? project.projectType.replace(/_/g, ' ') : 'General Deliverable'}
                  </div>
                </div>
              </div>

              {project.maintenanceRequired && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.88rem' }}>
                  <strong>🔧 Maintenance Notes:</strong> {project.maintenanceNotes || 'Ongoing maintenance required.'}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Project Scope & Deliverables</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', lineHeight: '1.6' }}>
                {project.scope || project.description || 'No detailed scope provided.'}
              </p>

              {project.description && project.scope && (
                <>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '24px', marginBottom: '10px' }}>Background Description</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6' }}>{project.description}</p>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 color="var(--primary)" size={18} />
                  Project Progress
                </h3>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                  {progressPercent}%
                </span>
              </div>

              {/* Multi-stage Progress Bar */}
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #10b981, #6366f1)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease',
                  }}
                  title={`Completed: ${completedCount} / ${totalCount} tasks (${progressPercent}%)`}
                />
              </div>

              {/* Breakdown metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.78rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>{completedCount}</div>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Completed</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>{inProgressCount}</div>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>In Progress</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-secondary)', fontSize: '1rem' }}>{todoCount}</div>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Pending</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>Project Lead</h3>
              {project.lead ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, boxShadow: 'var(--shadow-glow)' }}>
                    {project.lead.firstName[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{project.lead.firstName} {project.lead.lastName}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{project.lead.email}</div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No Lead assigned yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Milestones & Tasks Tab */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Project Deliverables & Milestones</h3>
            {isLeadOrAdmin && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button size="sm" variant="secondary" onClick={openMilestoneModal}>
                  <Plus size={16} /> Create Milestone
                </Button>
                <Button size="sm" variant="gradient" onClick={openTaskModal}>
                  <Plus size={16} /> Create Task
                </Button>
              </div>
            )}
          </div>

          {/* Milestone Cards Grid */}
          {milestones.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {milestones.map((ms) => (
                <div key={ms.id} className="glass-card hover-lift" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{ms.name}</div>
                    {isLeadOrAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(ms.id)}
                        title="Delete Milestone"
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', borderRadius: 'var(--radius-sm)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {ms.completedTasks} of {ms.totalTasks} tasks completed
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Task List */}
          <div className="glass-card" style={{ padding: '28px' }}>
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                No tasks created for this project yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {tasks.map((t: any) => {
                  const isCompleted = t.status === 'COMPLETED';
                  const dueDateText = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !isCompleted;

                  return (
                    <div key={t.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: 1, paddingRight: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          {t.milestone && <Badge variant="info">{t.milestone.name}</Badge>}
                          <Badge variant={t.priority === 'CRITICAL' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>{t.priority}</Badge>
                          {t.assignee && <Badge variant="gradient">👤 {t.assignee.firstName} {t.assignee.lastName}</Badge>}
                          {t.coAssignee && <Badge variant="neutral">👥 {t.coAssignee.firstName} {t.coAssignee.lastName}</Badge>}
                          {dueDateText && (
                            <span
                              style={{
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-card)',
                                color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)',
                                border: isOverdue ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                              }}
                            >
                              📅 {isOverdue ? `Overdue (${dueDateText})` : `Deadline: ${dueDateText}`}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.02rem' }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{t.description}</div>}
                        {t.completionNotes && (
                          <div style={{ marginTop: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)', fontSize: '0.84rem' }}>
                            <strong style={{ color: 'var(--success)' }}>✅ Completion Summary:</strong> <span style={{ color: 'var(--text-secondary)' }}>{t.completionNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Interactive Task Status Selector Dropdown & Delete Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={t.status}
                          onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                          style={{
                            backgroundColor: isCompleted ? 'var(--success-light)' : 'var(--bg-card)',
                            border: isCompleted ? '1px solid var(--success)' : '1px solid var(--border-color)',
                            color: isCompleted ? 'var(--success)' : 'var(--text-primary)',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-md)',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="REVISION">Revision Required</option>
                          <option value="REVIEW">Under Review</option>
                          <option value="COMPLETED">Completed</option>
                        </select>

                        {isLeadOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            title="Delete Task"
                            style={{
                              backgroundColor: 'var(--danger-light)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: 'var(--danger)',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Work Activity Tab */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Work Activities</h3>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            {projectActivities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                No work activities logged for this project yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {projectActivities.map((act) => (
                  <div key={act.id} style={{ padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', minWidth: '90px' }}>
                      {new Date(act.dateTime || act.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {act.workDescription}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>👤 {act.user?.firstName} {act.user?.lastName}</span>
                        <span>⏱️ {act.hoursSpent} hrs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          {project.status === 'CANCELLED' && (
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--danger-light)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} />
              <span>This project is cancelled. Team member assignment is disabled.</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Assigned Team Members</h3>
            {user?.role === 'ADMIN' && (
              <Button size="sm" variant="gradient" onClick={handleOpenAddMember} disabled={project.status === 'CANCELLED'}>
                <UserPlus size={16} /> Add Member
              </Button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {members.map((m) => {
              const u = m.user || m;
              const firstName = u.firstName || 'User';
              const lastName = u.lastName || '';
              const email = u.email || '';
              const initials = `${firstName[0] || 'U'}${lastName[0] || ''}`;

              return (
                <div key={m.id || m.userId} className="glass-panel hover-lift" style={{ padding: '18px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{firstName} {lastName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{email}</div>
                    </div>
                  </div>
                  {user?.role === 'ADMIN' && m.userId !== project.leadId && (
                    <Button size="sm" variant="ghost" onClick={() => setRemoveMemberUserId(m.userId)} title="Remove Member">
                      <UserX size={16} color="var(--danger)" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={20} color="var(--primary)" /> Project Discussion
          </h3>

          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
            <div style={{ flex: 1 }}>
              <TextArea
                placeholder="Share project updates, technical notes, or client feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
              />
            </div>
            <Button variant="gradient" type="submit" style={{ height: '46px', alignSelf: 'flex-end' }}>
              Post Comment
            </Button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {comments.map((c) => (
              <div key={c.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '18px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{c.user?.firstName} {c.user?.lastName}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Paperclip size={20} color="var(--primary)" /> Project Attachments & Assets
          </h3>

          <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '12px', marginBottom: '28px', alignItems: 'center' }}>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ flex: 1, backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            />
            <Button variant="gradient" type="submit" isLoading={isUploading} disabled={!selectedFile}>
              Upload Attachment
            </Button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {attachments.map((a) => (
              <div key={a.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.96rem' }}>{a.fileName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {(a.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded by {a.uploader?.firstName} {a.uploader?.lastName}
                  </div>
                </div>
                <a
                  href={`/api/v1/attachments/${a.id}/download`}
                  download
                  style={{ textDecoration: 'none' }}
                >
                  <Button size="sm" variant="secondary">
                    <Download size={14} /> Download File
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} title="Update Project Status">
        <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Project Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'PLANNING', label: 'Planning' },
              { value: 'ONGOING', label: 'Ongoing' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'AT_RISK', label: 'At Risk' },
              { value: 'ON_HOLD', label: 'On Hold' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />

          <TextArea
            label={`Reason for Status Change ${['AT_RISK', 'ON_HOLD', 'CANCELLED'].includes(newStatus) ? '(Required for At Risk / On Hold / Cancelled)' : '(Optional)'}`}
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            required={['AT_RISK', 'ON_HOLD', 'CANCELLED'].includes(newStatus)}
            placeholder={['AT_RISK', 'ON_HOLD', 'CANCELLED'].includes(newStatus) ? 'Please explain why the project status is being changed...' : 'Optional notes...'}
          />

          <Button variant="gradient" type="submit" style={{ marginTop: '8px' }}>
            Update Project Status
          </Button>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={closeAddMemberModal} title="Add Team Member to Project">
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Select User"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            options={[
              { value: '', label: 'Select Student or Lead...' },
              ...allUsers.map((u) => ({
                value: u.id,
                label: `${u.firstName} ${u.lastName} (${u.email})`,
              })),
            ]}
          />
          <Button variant="gradient" type="submit" isLoading={isAddingMember} disabled={isAddingMember} style={{ marginTop: '8px' }}>
            Add Member
          </Button>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteProject}
        title="Delete & Remove Project"
        message="Are you sure you want to delete this project? The project and all its associated milestones, tasks, members, and activity logs will be permanently removed."
        confirmText="Delete & Remove Project"
        variant="danger"
        isLoading={isDeletingProject}
      />

      {/* Remove Member Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(removeMemberUserId)}
        onClose={() => setRemoveMemberUserId(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Remove Member from Project"
        message="Are you sure you want to remove this team member from the project?"
        confirmText="Remove Member"
        variant="danger"
      />

      {/* Create Milestone Modal */}
      <Modal isOpen={isMilestoneOpen} onClose={closeMilestoneModal} title="Create Project Milestone">
        <form onSubmit={handleCreateMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Milestone Name" value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} placeholder="e.g. Phase 1 — Database & Authentication" required />
          <TextArea label="Description" value={milestoneDesc} onChange={(e) => setMilestoneDesc(e.target.value)} placeholder="Key scope objectives of this milestone..." />
          <Button variant="gradient" type="submit" isLoading={isCreatingMilestone} disabled={isCreatingMilestone} style={{ marginTop: '8px' }}>
            Create Milestone
          </Button>
        </form>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={isTaskOpen} onClose={closeTaskModal} title="Create Project Task">
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Task Title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Implement User Role Auth Middleware" required />
          <TextArea label="Task Description" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Technical requirements, acceptance criteria..." />
          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Assign Team Member(s) (Maximum 2)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 'var(--radius-md)', maxHeight: '140px', overflowY: 'auto' }}>
              {members.length === 0 ? (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No team members assigned to project yet</span>
              ) : (
                members.map((m) => {
                  const u = m.user || m;
                  const uId = m.userId || u.id || m.id;
                  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Member';
                  const isSelected = taskAssignees.includes(uId);

                  return (
                    <button
                      key={uId}
                      type="button"
                      onClick={() => toggleTaskAssignee(uId)}
                      style={{
                        backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <Select
            label="Milestone (Optional)"
            value={taskMilestone}
            onChange={(e) => setTaskMilestone(e.target.value)}
            options={[
              { value: '', label: 'No Milestone' },
              ...milestones.map((ms) => ({
                value: ms.id,
                label: ms.name,
              })),
            ]}
          />
          <Select
            label="Priority"
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value)}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'CRITICAL', label: 'Critical' },
            ]}
          />
          <Button variant="gradient" type="submit" isLoading={isCreatingTask} disabled={isCreatingTask} style={{ marginTop: '8px' }}>
            Create Task
          </Button>
        </form>
      </Modal>

      {/* Generate PDF Report Modal */}
      <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="Generate Executive Project PDF Report">
        <form onSubmit={handleGeneratePdf} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Time Horizon / Date Range Filter"
            value={pdfTimeRange}
            onChange={(e) => setPdfTimeRange(e.target.value)}
            options={[
              { value: 'ALL', label: '📅 All Time (Entire Project History)' },
              { value: 'LAST_WEEK', label: '📌 Past 7 Days (Last Week)' },
              { value: 'LAST_MONTH', label: '🗓️ Past 1 Month' },
              { value: 'LAST_2_MONTHS', label: '📆 Past 2 Months' },
              { value: 'LAST_3_MONTHS', label: '📊 Past 3 Months' },
              { value: 'LAST_6_MONTHS', label: '📈 Past 6 Months' },
              { value: 'LAST_YEAR', label: '🏆 Past 1 Year' },
              { value: 'CUSTOM', label: '🛠️ Custom Date Range' },
            ]}
          />

          {pdfTimeRange === 'CUSTOM' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="Start Date" type="date" value={pdfStartDate} onChange={(e) => setPdfStartDate(e.target.value)} required />
              <Input label="End Date" type="date" value={pdfEndDate} onChange={(e) => setPdfEndDate(e.target.value)} required />
            </div>
          )}

          <Select
            label="Deliverable Tasks Filter"
            value={pdfStatusFilter}
            onChange={(e) => setPdfStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'Include All Deliverable Tasks' },
              { value: 'COMPLETED_ONLY', label: 'Only Completed Tasks' },
              { value: 'ACTIVE_ONLY', label: 'Only Active / In-Progress Tasks' },
            ]}
          />

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Include Report Sections:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pdfSections.summary}
                  onChange={(e) => setPdfSections({ ...pdfSections, summary: e.target.checked })}
                />
                Executive Overview & Progress
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pdfSections.members}
                  onChange={(e) => setPdfSections({ ...pdfSections, members: e.target.checked })}
                />
                Team Members Roster
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pdfSections.tasks}
                  onChange={(e) => setPdfSections({ ...pdfSections, tasks: e.target.checked })}
                />
                Tasks & Milestones Matrix
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pdfSections.comments}
                  onChange={(e) => setPdfSections({ ...pdfSections, comments: e.target.checked })}
                />
                Comments & Discussions
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pdfSections.attachments}
                  onChange={(e) => setPdfSections({ ...pdfSections, attachments: e.target.checked })}
                />
                Uploaded Files & Attachments
              </label>
            </div>
          </div>

          <Button variant="gradient" type="submit" style={{ marginTop: '8px' }}>
            <FileText size={16} /> Generate & Download PDF Report
          </Button>
        </form>
      </Modal>
    </div>
  );
};
