import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { Badge } from '../components/UI/Badge';
import { StudentProfilePage } from './StudentProfile';
import { isValidPhone, isValidEmail } from '../utils/validation';
import { UserPlus, UserCheck, UserX, KeyRound, Edit2, Trash2, Users as UsersIcon, Sparkles, Shuffle, Copy, Check, LayoutDashboard, ArrowLeft, Eye, EyeOff, X, Plus, ChevronDown } from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'PROJECT_LEAD' | 'TEAM_MEMBER';
  memberType: 'STUDENT' | 'EMPLOYEE';
  phone?: string;
  skills?: { id: string; skillName: string }[];
  projectMemberships?: { project: { id: string; name: string; projectType?: string } }[];
  isActive: boolean;
  rawPassword?: string;
  createdAt: string;
}

interface ProjectItem {
  id: string;
  name: string;
  status: string;
}

const PRESET_SKILLS = [
  'React.js',
  'Node.js',
  'TypeScript',
  'JavaScript',
  'Python',
  'HTML/CSS',
  'UI/UX Design',
  'Figma',
  'Database & SQL',
  'MongoDB',
  'QA & Testing',
  'DevOps & Cloud',
  'Mobile App Dev',
  'Flutter',
  'React Native',
  'Content Writing',
  'Digital Marketing',
  'Video & Media Editing',
  'Data Science',
  'Project Management',
];

interface UsersPageProps {
  onSelectStudent?: (userId: string) => void;
  onToggleFullScreenForm?: (active: boolean) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onSelectStudent, onToggleFullScreenForm }) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Form View State
  const [isDedicatedFormPage, setIsDedicatedFormPage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [formProjectId, setFormProjectId] = useState('');
  const [formProjectRole, setFormProjectRole] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Created Account Credentials Modal State
  const [createdAccountDetails, setCreatedAccountDetails] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    tempPassword: string;
    role: string;
    memberType: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Activate & Assign Project Modal State
  const [activateUserId, setActivateUserId] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<string>('');

  // Delete Confirm Modal State
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password Management Modal State (View & Change Password Together)
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [isResetPassVisible, setIsResetPassVisible] = useState(false);
  const [selectedViewUserId, setSelectedViewUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<UserItem[]>('/users');
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await apiFetch<ProjectItem[]>('/projects');
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to fetch projects list:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pwd);
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setPhone(val);

    if (val.length > 10 || cleaned.length > 10) {
      setPhoneError('Invalid phone number: Exceeds 10 digits (Max 10 allowed)');
    } else if (val.trim() && cleaned.length < 10) {
      setPhoneError('Phone number must be exactly 10 digits (e.g. 9876543210)');
    } else if (val.trim() && val !== cleaned) {
      setPhoneError('Phone number can only contain numeric digits');
    } else {
      setPhoneError('');
    }
  };

  const closeForm = () => {
    setIsDedicatedFormPage(false);
    setIsModalOpen(false);
    setIsPresetDropdownOpen(false);
    if (onToggleFullScreenForm) onToggleFullScreenForm(false);
  };

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setSelectedSkills([]);
    setCustomSkillInput('');
    setIsPresetDropdownOpen(false);
    setFormProjectId('');
    setFormProjectRole('');
    setPhoneError('');
    setTempPassword('');
    setIsDedicatedFormPage(true);
    setIsModalOpen(false);
    if (onToggleFullScreenForm) onToggleFullScreenForm(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditingUserId(user.id);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPhone(user.phone || '');
    const userSkills = user.skills?.map((s) => s.skillName) || [];
    setSelectedSkills(userSkills);
    setCustomSkillInput('');
    setIsPresetDropdownOpen(false);
    setFormProjectId(user.projectMemberships?.[0]?.project?.id || '');
    setFormProjectRole('');
    setPhoneError('');
    setTempPassword('');
    setIsDedicatedFormPage(true);
    setIsModalOpen(false);
    if (onToggleFullScreenForm) onToggleFullScreenForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (phone.trim() && !isValidPhone(phone)) {
      setPhoneError('Please enter a valid 10-digit Indian phone number (e.g. 9876543210)');
      return;
    }

    const skillsString = selectedSkills.length > 0 ? selectedSkills.join(', ') : undefined;
    const finalTempPassword = tempPassword.trim() || `Temp#${Math.floor(1000 + Math.random() * 9000)}!`;

    try {
      if (editingUserId) {
        await apiFetch(`/users/${editingUserId}`, {
          method: 'PUT',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone: phone.trim() || undefined,
            rawPassword: tempPassword.trim() || undefined,
            skills: skillsString,
            projectId: formProjectId || undefined,
          }),
        });

        if (formProjectId && formProjectRole) {
          try {
            await apiFetch(`/projects/${formProjectId}/members`, {
              method: 'POST',
              body: JSON.stringify({
                userId: editingUserId,
                role: formProjectRole,
              }),
            });
          } catch {
            // Ignore if already project member
          }
        }
      } else {
        const createRes = await apiFetch<{ user?: UserItem; tempPassword?: string } | UserItem>('/users', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone: phone.trim() || undefined,
            tempPassword: finalTempPassword,
            role: 'TEAM_MEMBER',
            memberType: 'STUDENT',
            skills: skillsString,
            projectId: formProjectId || undefined,
          }),
        });

        const createdUser: UserItem = (createRes as any)?.user || createRes;
        const returnedTempPassword = (createRes as any)?.tempPassword || finalTempPassword;

        if (formProjectId && formProjectRole && createdUser?.id) {
          try {
            await apiFetch(`/projects/${formProjectId}/members`, {
              method: 'POST',
              body: JSON.stringify({
                userId: createdUser.id,
                role: formProjectRole,
              }),
            });
          } catch {
            // Ignore if already assigned
          }
        }

        setCreatedAccountDetails({
          email: createdUser.email || email,
          firstName: createdUser.firstName || firstName,
          lastName: createdUser.lastName || lastName,
          tempPassword: returnedTempPassword,
          role: createdUser.role || 'TEAM_MEMBER',
          memberType: createdUser.memberType || 'STUDENT',
        });
      }

      closeForm();
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to save account details.');
    }
  };

  const toggleUserActive = (user: UserItem) => {
    if (!user.isActive) {
      setActivateUserId(user.id);
      setAssignProjectId('');
    } else {
      executeToggleActive(user.id, false);
    }
  };

  const executeToggleActive = async (userId: string, isActive: boolean, projectId?: string) => {
    try {
      await apiFetch(`/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });

      if (isActive && projectId) {
        await apiFetch(`/projects/${projectId}/members`, {
          method: 'POST',
          body: JSON.stringify({
            userId,
            role: 'Team Contributor',
          }),
        });
      }

      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to change account status.');
    }
  };

  const handleConfirmActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateUserId) return;
    executeToggleActive(activateUserId, true, assignProjectId || undefined);
    setActivateUserId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUserId) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/users/${deletingUserId}`, {
        method: 'DELETE',
      });
      setDeletingUserId(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !newResetPassword.trim()) return;

    try {
      await apiFetch(`/users/${resetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: newResetPassword.trim() }),
      });
      alert('Password updated successfully!');
      setResetUserId(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update password.');
    }
  };

  const handleUserClick = (userId: string) => {
    if (onSelectStudent) {
      onSelectStudent(userId);
    } else {
      setSelectedViewUserId(userId);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole === 'ALL') return true;
    return u.role === filterRole;
  });

  const targetResetUser = users.find((u) => u.id === resetUserId);

  if (selectedViewUserId) {
    return (
      <StudentProfilePage
        userId={selectedViewUserId}
        onBack={() => setSelectedViewUserId(null)}
      />
    );
  }

  // Dedicated Page view for Creating or Editing Accounts
  if (isDedicatedFormPage) {
    return (
      <div className="animate-fade-in" style={{ padding: '36px 0', width: '90%', maxWidth: '1200px', margin: '0 auto' }}>
        <button
          onClick={closeForm}
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
          <ArrowLeft size={18} /> Back to Users Directory
        </button>

        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {editingUserId ? 'Edit User Details' : 'Register New Student / Team Member'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {editingUserId
              ? 'Update member profile information, assigned skills, and project membership.'
              : 'Create a new account. An automated credential email will be dispatched to the member.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="e.g. John" />
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="e.g. Doe" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={Boolean(editingUserId)} required placeholder="student@organization.com" />
              <Input
                label="Optional 10-Digit Mobile Number"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 9876543210"
                error={phoneError || undefined}
                helperText={phoneError ? undefined : 'Optional 10-digit mobile number'}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Skills (Optional)
              </label>

              {/* Active Skill Badges */}
              {selectedSkills.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {selectedSkills.map((sk) => (
                    <span
                      key={sk}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--primary)',
                      }}
                    >
                      {sk}
                      <button
                        type="button"
                        onClick={() => setSelectedSkills(selectedSkills.filter((s) => s !== sk))}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Remove skill"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Single Unified Skill Text Box with Dropdown Toggle & Right-Side + Add Icon Button */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2px 4px 2px 12px',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Type a skill name or click arrow for list..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = customSkillInput.trim();
                        if (val && !selectedSkills.includes(val)) {
                          setSelectedSkills([...selectedSkills, val]);
                          setCustomSkillInput('');
                          setIsPresetDropdownOpen(false);
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      outline: 'none',
                      height: '34px',
                    }}
                  />

                  {/* Show Dropdown List Icon Button */}
                  <button
                    type="button"
                    onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                    title="Toggle preset skills list"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronDown size={18} style={{ transform: isPresetDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                  </button>

                  {/* Right-Side + Add Icon Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const val = customSkillInput.trim();
                      if (val && !selectedSkills.includes(val)) {
                        setSelectedSkills([...selectedSkills, val]);
                        setCustomSkillInput('');
                        setIsPresetDropdownOpen(false);
                      }
                    }}
                    title="Add skill item"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 14px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                {/* Floating Preset Skills Dropdown List */}
                {isPresetDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '6px 0',
                    }}
                  >
                    {PRESET_SKILLS.filter(
                      (s) =>
                        !selectedSkills.includes(s) &&
                        s.toLowerCase().includes(customSkillInput.toLowerCase().trim())
                    ).length === 0 ? (
                      <div style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        No matching preset skills found. Type above to add as custom skill.
                      </div>
                    ) : (
                      PRESET_SKILLS.filter(
                        (s) =>
                          !selectedSkills.includes(s) &&
                          s.toLowerCase().includes(customSkillInput.toLowerCase().trim())
                      ).map((s) => (
                        <div
                          key={s}
                          onClick={() => {
                            setSelectedSkills([...selectedSkills, s]);
                            setCustomSkillInput('');
                            setIsPresetDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-main)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span>{s}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>+ Select</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Select
                label="Assign Project (Optional)"
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                options={[
                  { value: '', label: 'None (Unassigned)' },
                  ...projects.filter((p) => p.status !== 'CANCELLED').map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.status})`,
                  })),
                ]}
              />
              <Select
                label="Project Role (Optional)"
                value={formProjectRole}
                onChange={(e) => setFormProjectRole(e.target.value)}
                options={[
                  { value: '', label: 'Select Role...' },
                  { value: 'Frontend Developer', label: 'Frontend Developer' },
                  { value: 'Backend Developer', label: 'Backend Developer' },
                  { value: 'Database Engineer', label: 'Database Engineer' },
                  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
                  { value: 'QA / Software Testing', label: 'QA / Software Testing' },
                  { value: 'DevOps Engineer', label: 'DevOps Engineer' },
                  { value: 'Full Stack Developer', label: 'Full Stack Developer' },
                  { value: 'Project Lead', label: 'Project Lead' },
                  { value: 'Team Contributor', label: 'Team Contributor' },
                ]}
              />
            </div>

            {!editingUserId ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Initial Temporary Password (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Shuffle size={13} /> Generate Random
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="Leave blank to auto-generate password..."
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  helperText="Optional: Leave blank to auto-generate a secure random temporary password."
                />
              </div>
            ) : (
              <Input
                label="Update User Password (Optional)"
                type="password"
                placeholder="Enter new password to update..."
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                helperText="Leave blank if you do not wish to change the password."
              />
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button variant="gradient" type="submit" style={{ flex: 1 }}>
                {editingUserId ? 'Save Changes' : 'Create & Register Account'}
              </Button>
              <Button variant="secondary" type="button" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const avatarStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
    color: '#fff',
    fontWeight: 800,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            User & Student <span className="text-gradient">Directory</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage team members, roles, project assignments, skills, and account security.
          </p>
        </div>

        <Button variant="gradient" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} /> Register Student / Team Member
        </Button>
      </div>

      {/* Role Filter Bar */}
      <div className="glass-card" style={{ display: 'flex', gap: '10px', padding: '10px 14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['ALL', 'ADMIN', 'TEAM_MEMBER'].map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: filterRole === role ? 'var(--primary-light)' : 'transparent',
              color: filterRole === role ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: filterRole === role ? 700 : 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {role === 'ALL' ? 'All Roles' : role === 'ADMIN' ? 'Administrators' : 'Team Members'}
          </button>
        ))}
      </div>

      {/* Main Directory Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UsersIcon size={20} color="var(--primary)" /> Registered Members ({filteredUsers.length})
        </h3>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <Sparkles className="animate-pulse-glow" size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: 600 }}>Loading user directory...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px' }}>Student / Member and Skills</th>
                  <th style={{ padding: '14px 16px' }}>Project Roles and Assigned Projects</th>
                  <th style={{ padding: '14px 16px' }}>System Role</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const initial = u.firstName ? u.firstName.charAt(0).toUpperCase() : 'U';
                  const lastInitial = u.lastName ? u.lastName.charAt(0).toUpperCase() : '';
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div
                            style={avatarStyle}
                            onClick={() => handleUserClick(u.id)}
                            title="Click to view Student Dashboard and Skills"
                          >
                            {initial + lastInitial}
                          </div>
                          <div>
                            <div
                              style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => handleUserClick(u.id)}
                              title="Click to view Student Performance Dashboard"
                            >
                              {u.firstName} {u.lastName}
                              <span style={{ fontSize: '0.72rem', opacity: 0.8, color: 'var(--accent-purple)', fontWeight: 800 }}>View Dashboard</span>
                            </div>
                            <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>{u.email}</div>

                            {/* Skills pill badges directly below name */}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {u.skills && u.skills.length > 0 ? (
                                u.skills.map((sk: any) => (
                                  <span
                                    key={sk.id}
                                    style={{
                                      fontSize: '0.70rem',
                                      fontWeight: 700,
                                      padding: '2px 7px',
                                      borderRadius: 'var(--radius-full)',
                                      backgroundColor: 'var(--primary-light)',
                                      color: 'var(--primary)',
                                      border: '1px solid var(--border-color)',
                                    }}
                                  >
                                    {sk.skillName}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Skills: React | Node.js | Database | UI/UX
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Projects and Project Role Column */}
                      <td style={{ padding: '14px 16px' }}>
                        {u.projectMemberships && u.projectMemberships.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {u.projectMemberships.map((pm: any) => (
                              <span
                                key={pm.project.id}
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  backgroundColor: 'var(--bg-main)',
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border-color)',
                                  display: 'inline-block',
                                }}
                              >
                                {pm.project.name} <span style={{ fontSize: '0.70rem', color: 'var(--primary)', marginLeft: '4px' }}>({pm.project.projectType ? pm.project.projectType.replace(/_/g, ' ') : 'Member'})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>No Active Projects</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <Badge variant={u.role === 'ADMIN' ? 'gradient' : 'info'}>
                          {u.role === 'ADMIN' ? 'Admin' : 'Team Member'}
                        </Badge>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <Badge variant={u.isActive ? 'success' : 'danger'} pulse={u.isActive}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUserClick(u.id)}
                            title="View Student Dashboard"
                          >
                            <LayoutDashboard size={14} />
                          </Button>

                          <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(u)} title="Edit Details">
                            <Edit2 size={14} />
                          </Button>

                          {/* Combined View & Change Password Action Button */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setResetUserId(u.id);
                              setNewResetPassword('');
                              setIsResetPassVisible(false);
                            }}
                            title="Password Management (View & Change Password)"
                          >
                            <KeyRound size={14} />
                          </Button>

                          <Button
                            size="sm"
                            variant={u.isActive ? 'secondary' : 'gradient'}
                            onClick={() => toggleUserActive(u)}
                            title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </Button>

                          {u.role !== 'ADMIN' && (
                            <Button size="sm" variant="danger" onClick={() => setDeletingUserId(u.id)} title="Delete Account">
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal Backup */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUserId ? 'Edit Account' : 'Register Student / Team Member Account'} maxWidth="680px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="e.g. John" />
            <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="e.g. Doe" />
          </div>

          <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="student@organization.com" />

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="gradient" type="submit" style={{ flex: 1 }}>
              Submit
            </Button>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Account Created Credentials Summary Modal */}
      <Modal isOpen={Boolean(createdAccountDetails)} onClose={() => setCreatedAccountDetails(null)} title="Account Created - Dispatch Credentials">
        {createdAccountDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Account created successfully. An email has been sent to the member:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                <div><strong>Email:</strong> {createdAccountDetails.email}</div>
                <div><strong>Temporary Password:</strong> <code style={{ backgroundColor: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--primary)', fontWeight: 700 }}>{createdAccountDetails.tempPassword}</code></div>
                <div><strong>Role:</strong> {createdAccountDetails.role} ({createdAccountDetails.memberType})</div>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              ✦ Share these initial credentials with the user. They will be prompted to create their own private password upon logging in.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="gradient"
                style={{ flex: 1 }}
                onClick={() => {
                  const text = `Account Credentials for ${createdAccountDetails.firstName}:\nEmail: ${createdAccountDetails.email}\nTemporary Password: ${createdAccountDetails.tempPassword}`;
                  navigator.clipboard.writeText(text);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                {isCopied ? 'Credentials Copied!' : 'Copy Credentials'}
              </Button>
              <Button variant="secondary" onClick={() => setCreatedAccountDetails(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Activate Student and Assign Project Modal */}
      <Modal isOpen={Boolean(activateUserId)} onClose={() => setActivateUserId(null)} title="Activate Student and Assign Project">
        <form onSubmit={handleConfirmActivation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Activating this student account. You can optionally assign them to an active project immediately:
          </p>

          <Select
            label="Assign Project (Optional)"
            value={assignProjectId}
            onChange={(e) => setAssignProjectId(e.target.value)}
            options={[
              { value: '', label: 'None (Activate Only)' },
              ...projects.filter((p) => p.status !== 'CANCELLED').map((p) => ({
                value: p.id,
                label: `${p.name} (${p.status})`,
              })),
            ]}
          />

          <Button variant="gradient" type="submit" style={{ marginTop: '8px' }}>
            Activate and Notify Student
          </Button>
        </form>
      </Modal>

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingUserId)}
        onClose={() => setDeletingUserId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Student Account"
        message="Are you sure you want to delete this student account? All linked project memberships will be safely unassigned."
        confirmText="Delete Account"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Password Management Modal (View Original Password & Change Password Together) */}
      <Modal
        isOpen={Boolean(resetUserId)}
        onClose={() => {
          setResetUserId(null);
          setIsResetPassVisible(false);
        }}
        title={`Password Management - ${targetResetUser ? `${targetResetUser.firstName} ${targetResetUser.lastName}` : 'User'}`}
      >
        {targetResetUser && (
          <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* View Original Password Section */}
            <div
              style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Current / Original Registered Password:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <code
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--bg-card)',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    color: isResetPassVisible ? 'var(--primary)' : 'var(--text-muted)',
                    letterSpacing: isResetPassVisible ? 'normal' : '0.15em',
                    flex: 1,
                  }}
                >
                  {isResetPassVisible ? (targetResetUser.rawPassword || '••••••••') : '••••••••'}
                </code>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsResetPassVisible(!isResetPassVisible)}
                  title={isResetPassVisible ? 'Hide Password' : 'Show Original Password'}
                >
                  {isResetPassVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  {isResetPassVisible ? 'Hide' : 'Show'}
                </Button>

                {targetResetUser.rawPassword && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(targetResetUser.rawPassword || '');
                      alert('Password copied to clipboard!');
                    }}
                    title="Copy Password"
                  >
                    <Copy size={15} />
                  </Button>
                )}
              </div>
            </div>

            {/* Change Password Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Set New Password
                </label>
                <button
                  type="button"
                  onClick={() => setNewResetPassword(`Temp#${Math.floor(1000 + Math.random() * 9000)}!`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Shuffle size={13} /> Generate Random
                </button>
              </div>
              <Input
                type="password"
                placeholder="Enter new password to update..."
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                required
              />
            </div>

            <Button variant="gradient" type="submit">
              Update Password & Save
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
};
