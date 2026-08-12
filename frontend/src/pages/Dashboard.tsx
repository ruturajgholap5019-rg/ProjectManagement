import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCategoryFilterStore } from '../store/categoryFilterStore';
import { Badge } from '../components/UI/Badge';
import { Button } from '../components/UI/Button';
import {
  FolderKanban,
  AlertTriangle,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Sparkles,
  FolderPlus,
  UserPlus,
  Activity,
  Layers,
  CheckSquare,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { selectedCategory } = useCategoryFilterStore();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch<any>('/dashboard');
        setDashboardData(data);
      } catch (err: any) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (isLoading || !dashboardData) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', fontSize: '1rem', fontWeight: 600 }}>
          <Sparkles className="animate-pulse-glow" size={24} color="var(--primary)" />
          Synthesizing real-time telemetry & project statistics...
        </div>
      </div>
    );
  }

  const { type, stats } = dashboardData;

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', '/' + path);
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Premium Hero Welcome Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%)',
          padding: '32px 36px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-60px',
            top: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ✦ Live Overview
            </span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Welcome back, <span className="text-gradient">{user?.firstName}</span>! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', marginTop: '6px', maxWidth: '600px' }}>
            {type === 'ADMIN' && 'Executive command center • Monitor organization health, track project progress, and manage team members.'}
            {type === 'LEAD' && 'Team velocity, pending review submissions, and blocked task bottlenecks.'}
            {type === 'MEMBER' && 'Your AI-prioritized "Work Next" queue and direct deliverable statistics.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          <Badge variant={type === 'ADMIN' ? 'gradient' : type === 'LEAD' ? 'warning' : 'success'} pulse>
            {type} WORKSPACE
          </Badge>
          {type === 'ADMIN' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <Button size="sm" variant="gradient" onClick={() => navigateTo('projects')}>
                <FolderPlus size={14} /> Projects
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigateTo('users')}>
                <UserPlus size={14} /> Team
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN DASHBOARD */}
      {type === 'ADMIN' && (
        <>
          {/* Executive Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* Total Projects Card */}
            <div className="glass-card hover-lift" onClick={() => navigateTo('projects')} style={{ padding: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--accent-purple))' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Projects</span>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderKanban size={22} />
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '12px', fontFamily: 'var(--font-display)' }}>
                {stats.totalProjects}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} color="var(--primary)" /> Portfolio wide projects
              </div>
            </div>

            {/* Active Projects Card */}
            <div className="glass-card hover-lift" onClick={() => navigateTo('projects')} style={{ padding: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--success)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Active Projects</span>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={22} />
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '12px', fontFamily: 'var(--font-display)' }}>
                {stats.activeProjects}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                In active development cycle
              </div>
            </div>

            {/* At Risk Projects Card */}
            <div className="glass-card hover-lift" onClick={() => navigateTo('projects')} style={{ padding: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--danger)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>At Risk Projects</span>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={22} />
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '12px', fontFamily: 'var(--font-display)' }}>
                {stats.atRiskProjects}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Requires immediate lead review
              </div>
            </div>

            {/* Active Team Members Card */}
            <div className="glass-card hover-lift" onClick={() => navigateTo('users')} style={{ padding: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--info)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Active Team Members</span>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--info-light)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} />
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '12px', fontFamily: 'var(--font-display)' }}>
                {stats.totalUsers}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Students & staff active in system
              </div>
            </div>

            {/* Active Tasks Card */}
            <div className="glass-card hover-lift" onClick={() => navigateTo('deliverables')} style={{ padding: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-purple)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Active Deliverables</span>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckSquare size={22} />
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '12px', fontFamily: 'var(--font-display)' }}>
                {stats.activeTasks || 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Tasks in progress or review
              </div>
            </div>
          </div>

          {/* Attention Required Banner (if any) */}
          {dashboardData.attentionRequired?.length > 0 && (
            <div className="glass-card" style={{ padding: '24px 28px', marginBottom: '32px', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} />
                Executive Attention Required ({dashboardData.attentionRequired.length} Projects Flagged)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                {dashboardData.attentionRequired.map((proj: any) => (
                  <div key={proj.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{proj.name}</div>
                      <Badge variant="danger" pulse>{proj.status}</Badge>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--danger)', marginTop: '6px', lineHeight: '1.4' }}>
                      <strong>Status Reason:</strong> {proj.statusReason || 'No detail specified.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main 2-Column Dashboard Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Left Column: Active Projects Portfolio Snapshot */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
                  <Layers size={20} color="var(--primary)" />
                  Projects Portfolio Snapshot
                </h3>
                <button
                  onClick={() => navigateTo('projects')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>

              {(() => {
                const filteredRecentProjects = (dashboardData.recentProjects || []).filter((p: any) => {
                  if (selectedCategory && p.projectType !== selectedCategory) return false;
                  return true;
                });

                if (filteredRecentProjects.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      <FolderKanban size={40} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
                      <p style={{ fontWeight: 600 }}>No projects found under this category.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {filteredRecentProjects.map((p: any) => {
                      const progressPercent = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => navigateTo(`projects/${p.id}`)}
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        className="hover-lift"
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Badge variant="neutral">{p.projectType.replace(/_/g, ' ')}</Badge>
                            <Badge variant={p.status === 'AT_RISK' ? 'danger' : p.status === 'ONGOING' ? 'success' : 'neutral'}>
                              {p.status}
                            </Badge>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Assigned Lead: <strong>{p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : 'Unassigned'}</strong>
                          </div>
                        </div>

                        {/* Progress Bar Column */}
                        <div style={{ width: '160px', textAlign: 'right' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {p.completedTasks}/{p.totalTasks} Tasks ({progressPercent}%)
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                background: 'linear-gradient(90deg, var(--primary), var(--accent-purple))',
                                borderRadius: 'var(--radius-full)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>

            {/* Right Column: Quick Controls & Live System Activity Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Quick Admin Actions Widget */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Controls
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => navigateTo('projects')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    className="hover-lift"
                  >
                    <FolderPlus size={18} color="var(--primary)" />
                    <span>Create & Assign New Project</span>
                  </button>

                  <button
                    onClick={() => navigateTo('users')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    className="hover-lift"
                  >
                    <UserPlus size={18} color="var(--accent-purple)" />
                    <span>Manage Team Members & Accounts</span>
                  </button>

                  <button
                    onClick={() => navigateTo('activities')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    className="hover-lift"
                  >
                    <Activity size={18} color="var(--success)" />
                    <span>Review Work Activity Logs</span>
                  </button>
                </div>
              </div>

              {/* Live System Activity Stream */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="var(--primary)" />
                  Live Activity Audit Feed
                </h4>

                {!dashboardData.recentActivities || dashboardData.recentActivities.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No recent audit activity logged.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dashboardData.recentActivities.map((act: any) => (
                      <div key={act.id} style={{ fontSize: '0.82rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                          {act.user ? `${act.user.firstName} ${act.user.lastName}` : 'System User'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{act.action}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(act.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* PROJECT LEAD DASHBOARD */}
      {type === 'LEAD' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '36px' }}>
            <div className="glass-card hover-lift" style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>My Led Projects</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px', fontFamily: 'var(--font-display)' }}>{stats.myProjectsCount}</div>
            </div>
            <div className="glass-card hover-lift" style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pending Task Reviews</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '10px', fontFamily: 'var(--font-display)' }}>{stats.pendingReviews}</div>
            </div>
            <div className="glass-card hover-lift" style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Blocked Tasks</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '10px', fontFamily: 'var(--font-display)' }}>{stats.blockedTasks}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Flame size={22} color="var(--warning)" />
              Submitted Deliverables Awaiting Approval
            </h3>
            {dashboardData.pendingReviews?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>No pending task reviews at this time.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardData.pendingReviews.map((rev: any) => (
                  <div key={rev.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '18px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem' }}>{rev.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Project: <strong>{rev.project?.name}</strong> • Submitted by: <strong>{rev.assignee?.firstName} {rev.assignee?.lastName}</strong>
                      </div>
                    </div>
                    <Badge variant="warning" pulse>Awaiting Approval</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TEAM MEMBER DASHBOARD */}
      {type === 'MEMBER' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>
            <div className="glass-card hover-lift" style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Tasks</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px', fontFamily: 'var(--font-display)' }}>{stats.totalAssigned}</div>
            </div>
            <div className="glass-card hover-lift" style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>In Progress</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--info)', marginTop: '10px', fontFamily: 'var(--font-display)' }}>{stats.inProgress}</div>
            </div>
            <div className="glass-card hover-lift" style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Revisions Requested</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '10px', fontFamily: 'var(--font-display)' }}>{stats.revision}</div>
            </div>
            <div className="glass-card hover-lift" style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Completed</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '10px', fontFamily: 'var(--font-display)' }}>{stats.completed}</div>
            </div>
          </div>

          {/* Work Next Prioritized Queue */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArrowRight size={22} color="var(--primary)" />
              Prioritized "Work Next" Queue
            </h3>

            {dashboardData.workNext?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={40} color="var(--success)" style={{ marginBottom: '10px' }} />
                <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Welcome to Project Tracker!</p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '500px', margin: '4px auto 16px auto' }}>
                  {stats.totalAssigned === 0
                    ? 'You currently have no project or task assignments. You can log your work activities or explore digital project portfolios anytime.'
                    : 'All caught up! No pending work items in queue.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardData.workNext.map((item: any) => (
                  <div key={item.task.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '18px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem' }}>{item.task.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Project: <strong>{item.task.project?.name}</strong>
                      </div>
                    </div>
                    <Badge variant={item.reason === 'revision_requested' ? 'danger' : item.reason === 'overdue' ? 'danger' : 'info'}>
                      {item.reason.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
