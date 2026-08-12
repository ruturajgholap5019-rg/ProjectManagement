import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { generateUserPdfReport } from '../utils/pdfReportGenerator';
import { Badge } from '../components/UI/Badge';
import { Button } from '../components/UI/Button';
import {
  ArrowLeft,
  FolderKanban,
  Clock,
  Award,
  FileText,
  Sparkles,
  Instagram,
  Linkedin,
  Github,
  Youtube,
  Facebook,
  CheckSquare,
  ExternalLink,
  Mail,
  Phone,
} from 'lucide-react';

interface StudentProfileProps {
  userId: string;
  onBack: () => void;
  onSelectProject?: (projectId: string) => void;
}

export const StudentProfilePage: React.FC<StudentProfileProps> = ({ userId, onBack, onSelectProject }) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudentProfile = async () => {
    setIsLoading(true);
    try {
      // Fetch full telemetry for user from /users/:id
      const fullUser = await apiFetch<any>(`/users/${userId}`);
      if (fullUser) {
        setProfile({
          id: fullUser.id,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName,
          name: `${fullUser.firstName} ${fullUser.lastName}`,
          email: fullUser.email,
          phone: fullUser.phone,
          bio: fullUser.bio,
          role: fullUser.role,
          memberType: fullUser.memberType || 'STUDENT',
          instagramUrl: fullUser.instagramUrl,
          linkedinUrl: fullUser.linkedinUrl,
          githubUrl: fullUser.githubUrl,
          youtubeUrl: fullUser.youtubeUrl,
          facebookUrl: fullUser.facebookUrl,
          skills: fullUser.skills || [],
          projects: fullUser.projectMemberships || [],
          tasks: fullUser.assignedTasks || [],
          activities: fullUser.workActivities || [],
        });
      }
    } catch (err: any) {
      console.warn('Full user API fetch failed, falling back to search API:', err);
      try {
        const searchRes = await apiFetch<any>(`/search?q=`);
        const foundUser = searchRes.members?.find((m: any) => m.id === userId);
        if (foundUser) {
          setProfile({
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
            memberType: foundUser.memberType || 'STUDENT',
            skills: foundUser.skills || [],
            projects: foundUser.ongoingProjects || [],
            tasks: [],
            activities: foundUser.recentActivities || [],
            totalHoursSpent: foundUser.totalHoursSpent || 0,
          });
        }
      } catch (fallbackErr) {
        console.error('Failed to load profile:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentProfile();
  }, [userId]);

  const getCleanUrl = (val: string, platform: string) => {
    if (!val) return '';
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    if (platform === 'instagram' && !val.startsWith('@')) return `https://instagram.com/${val.replace('@', '')}`;
    if (platform === 'instagram' && val.startsWith('@')) return `https://instagram.com/${val.slice(1)}`;
    if (platform === 'github') return `https://github.com/${val.replace('@', '')}`;
    if (platform === 'linkedin') return `https://linkedin.com/in/${val.replace('@', '')}`;
    if (platform === 'youtube') return `https://youtube.com/@${val.replace('@', '')}`;
    if (platform === 'facebook') return `https://facebook.com/${val.replace('@', '')}`;
    return `https://${val}`;
  };

  const handleDownloadPdf = () => {
    if (!profile) return;
    generateUserPdfReport({
      user: profile,
      tasks: profile.tasks || [],
      projects: profile.projects || [],
      activities: profile.activities || [],
      skills: profile.skills || [],
    });
  };

  if (isLoading || !profile) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Sparkles className="animate-pulse-glow" size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
        <p style={{ fontWeight: 600 }}>Loading member profile & telemetry...</p>
      </div>
    );
  }

  const tasksList: any[] = profile.tasks || [];
  const projectsList: any[] = profile.projects || [];
  const activitiesList: any[] = profile.activities || [];
  const skillsList: any[] = profile.skills || [];

  const completedTasksCount = tasksList.filter((t) => t.status === 'COMPLETED').length;
  const totalTasksCount = tasksList.length;
  const completionRatePercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const totalHoursLogged = activitiesList.reduce((sum: number, a: any) => sum + (Number(a.hoursSpent) || 0), 0);

  const hasAnySocial = Boolean(profile.instagramUrl || profile.linkedinUrl || profile.githubUrl || profile.youtubeUrl || profile.facebookUrl);

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
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
          marginBottom: '22px',
          transition: 'color 0.15s ease',
        }}
      >
        <ArrowLeft size={18} />
        Back to Users Directory
      </button>

      {/* Main Student Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '32px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flex: 1, minWidth: '300px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              boxShadow: 'var(--shadow-glow)',
              flexShrink: 0,
            }}
          >
            {profile.firstName ? profile.firstName[0] : profile.name ? profile.name[0] : 'U'}
            {profile.lastName ? profile.lastName[0] : ''}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <Badge variant={profile.role === 'ADMIN' ? 'gradient' : 'info'}>
                {profile.role === 'ADMIN' ? 'Administrator' : 'Student Team Member'}
              </Badge>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <Mail size={13} color="var(--primary)" /> {profile.email}
              </span>
              {profile.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <Phone size={13} color="var(--success)" /> {profile.phone}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
              {profile.name}
            </h1>

            {profile.bio && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '640px' }}>
                {profile.bio}
              </p>
            )}

            {/* Social Media Icons Bar */}
            {hasAnySocial && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                {profile.instagramUrl && (
                  <a
                    href={getCleanUrl(profile.instagramUrl, 'instagram')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(225, 48, 108, 0.12)',
                      border: '1px solid rgba(225, 48, 108, 0.3)',
                    }}
                  >
                    <Instagram size={17} color="#e1306c" />
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={getCleanUrl(profile.linkedinUrl, 'linkedin')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="LinkedIn Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(10, 102, 194, 0.12)',
                      border: '1px solid rgba(10, 102, 194, 0.3)',
                    }}
                  >
                    <Linkedin size={17} color="#0a66c2" />
                  </a>
                )}
                {profile.githubUrl && (
                  <a
                    href={getCleanUrl(profile.githubUrl, 'github')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="GitHub Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--primary-light)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <Github size={17} color="var(--text-primary)" />
                  </a>
                )}
                {profile.youtubeUrl && (
                  <a
                    href={getCleanUrl(profile.youtubeUrl, 'youtube')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="YouTube Channel"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(255, 0, 0, 0.12)',
                      border: '1px solid rgba(255, 0, 0, 0.3)',
                    }}
                  >
                    <Youtube size={17} color="#ff0000" />
                  </a>
                )}
                {profile.facebookUrl && (
                  <a
                    href={getCleanUrl(profile.facebookUrl, 'facebook')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(24, 119, 242, 0.12)',
                      border: '1px solid rgba(24, 119, 242, 0.3)',
                    }}
                  >
                    <Facebook size={17} color="#1877f2" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PDF Export Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="gradient" onClick={handleDownloadPdf} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} /> Export Member Report (PDF)
          </Button>
        </div>
      </div>

      {/* 4 Performance Stat Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '18px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--primary)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
            {totalHoursLogged.toFixed(1)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em', marginTop: '2px' }}>
            Hours Logged
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--accent-purple)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <FolderKanban size={24} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-display)' }}>
            {projectsList.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em', marginTop: '2px' }}>
            Assigned Projects
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--success)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <CheckSquare size={24} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
            {completedTasksCount} / {totalTasksCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em', marginTop: '2px' }}>
            Tasks Completed
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--warning)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <Award size={24} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-display)' }}>
            {completionRatePercent}%
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em', marginTop: '2px' }}>
            Completion Rate
          </div>
        </div>
      </div>

      {/* Main Grid Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '32px' }}>
        {/* Assigned Deliverables / Tasks Section */}
        <div className="glass-card" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} color="var(--primary)" /> Assigned Deliverables & Tasks ({tasksList.length})
          </h3>

          {tasksList.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No deliverables or tasks currently assigned to this member.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {tasksList.map((t) => {
                const isCompleted = t.status === 'COMPLETED';
                const isUnderReview = t.status === 'REVIEW';

                return (
                  <div
                    key={t.id}
                    className="glass-card"
                    style={{
                      padding: '18px 22px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-main)',
                      borderLeft: isCompleted
                        ? '4px solid var(--success)'
                        : isUnderReview
                        ? '4px solid var(--accent-purple)'
                        : '4px solid var(--primary)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {t.project && <Badge variant="neutral">{t.project.name}</Badge>}
                        {t.milestone && <Badge variant="info">{t.milestone.name}</Badge>}
                        <Badge variant={t.priority === 'CRITICAL' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                          {t.priority}
                        </Badge>
                      </div>

                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {t.title}
                      </h4>

                      {t.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                          {t.description}
                        </p>
                      )}

                      {t.completionNotes && (
                        <div style={{ marginTop: '8px', fontSize: '0.80rem', color: 'var(--success)', fontWeight: 600 }}>
                          Note: {t.completionNotes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Badge variant={isCompleted ? 'success' : isUnderReview ? 'info' : 'neutral'}>
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assigned Projects Section */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban size={20} color="var(--accent-purple)" /> Assigned Projects ({projectsList.length})
          </h3>

          {projectsList.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>No active projects assigned.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projectsList.map((pm: any) => {
                const proj = pm.project || pm;
                return (
                  <div
                    key={proj.id}
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--bg-main)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {proj.name}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {proj.projectType ? proj.projectType.replace(/_/g, ' ') : 'Project Member'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectProject) {
                          onSelectProject(proj.id);
                        } else {
                          window.history.pushState({}, '', `/projects/${proj.id}`);
                          window.dispatchEvent(new Event('popstate'));
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      View Project <ExternalLink size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Skills & Capabilities Matrix */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="var(--warning)" /> Skills & Capabilities Matrix
          </h3>

          {skillsList.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>No skill tags recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {skillsList.map((sk: any) => (
                <span
                  key={sk.id || sk.skillName}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {sk.skillName} {sk.proficiency ? `(${sk.proficiency})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Work Activity History Log */}
        <div className="glass-card" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--success)" /> Work Activity Log History ({activitiesList.length})
          </h3>

          {activitiesList.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>No activity logs recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activitiesList.map((act: any) => (
                <div
                  key={act.id}
                  style={{
                    padding: '14px 18px',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
                      {act.project ? act.project.name : 'General Project Work'} • {new Date(act.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.90rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {act.workDescription}
                    </div>
                  </div>

                  <Badge variant="success">
                    {Number(act.hoursSpent).toFixed(1)} hrs
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
