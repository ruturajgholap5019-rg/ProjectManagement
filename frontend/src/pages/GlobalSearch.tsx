import React, { useState } from 'react';
import { apiFetch } from '../services/api';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { Search, User, FolderKanban } from 'lucide-react';

interface GlobalSearchPageProps {
  initialQuery?: string;
}

export const GlobalSearchPage: React.FC<GlobalSearchPageProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{ members: any[]; projects: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = React.useCallback(async (searchStr?: string) => {
    const q = (searchStr !== undefined ? searchStr : query).trim();
    if (!q) {
      setResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const data = await apiFetch<any>(`/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch (err: any) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // Real-time debounced search when typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query);
      } else if (!query.trim()) {
        setResults(null);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Global Search & <span className="text-gradient">Intelligence</span>
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Search by Team Member Name or Project Name to track scope, handovers, timelines, skills, and work activity history.
        </p>
      </div>

      {/* Glass Search Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="glass-card" style={{ display: 'flex', gap: '12px', padding: '16px', marginBottom: '36px', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}>
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Type a Team Member name (e.g. Alex, Sarah) or Project name (e.g. Portal, Mobile)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.02rem',
              outline: 'none',
            }}
          />
        </div>
        <Button variant="gradient" type="submit" isLoading={isSearching} style={{ height: '46px', padding: '0 28px' }}>
          Search Platform
        </Button>
      </form>

      {/* Results View */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {/* MEMBERS RESULTS */}
          {results.members.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User color="var(--primary)" size={24} />
                Matching Team Members ({results.members.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {results.members.map((m) => (
                  <div key={m.id} className="glass-card hover-lift" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)', color: '#fff', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
                          {m.name[0]}
                        </div>
                        <div>
                          <h3
                            style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                              window.history.pushState({}, '', `/students/${m.id}`);
                              window.dispatchEvent(new Event('popstate'));
                            }}
                            title="Click to view Student Performance Dashboard"
                          >
                            {m.name} <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>↗</span>
                          </h3>
                          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.email} • Role: {m.role.replace('_', ' ')} {m.memberType && `(${m.memberType})`}</p>
                        </div>
                      </div>
                      <Badge variant="gradient">{m.totalHoursSpent.toFixed(1)} Total Hours Recorded</Badge>
                    </div>

                    {/* Member Skills Matrix */}
                    {m.skills?.length > 0 && (
                      <div style={{ marginBottom: '18px', padding: '14px 18px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                          Skills & Capabilities Matrix
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {m.skills.map((s: any) => (
                            <Badge key={s.id} variant="gradient">
                              {s.skillName} ({s.proficiency})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ongoing & Completed Projects */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                          Ongoing Projects ({m.ongoingProjects.length})
                        </div>
                        {m.ongoingProjects.length === 0 ? (
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>None currently assigned.</div>
                        ) : (
                          m.ongoingProjects.map((p: any) => (
                            <div key={p.id} style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', padding: '4px 0' }}>
                              • <strong>{p.name}</strong> ({p.status})
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                          Completed / Past Projects ({m.completedProjects.length})
                        </div>
                        {m.completedProjects.length === 0 ? (
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>None past.</div>
                        ) : (
                          m.completedProjects.map((p: any) => (
                            <div key={p.id} style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', padding: '4px 0' }}>
                              • <strong>{p.name}</strong> ({p.status})
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Work Activity Timeline */}
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                        Recent Work Activity History
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {m.recentActivities.map((a: any) => (
                          <div key={a.id} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            <span><strong>{a.project.name}:</strong> {a.workDescription}</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{a.hoursSpent} hrs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS RESULTS */}
          {results.projects.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FolderKanban color="var(--primary)" size={24} />
                Matching Projects ({results.projects.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {results.projects.map((p) => (
                  <div key={p.id} className="glass-card hover-lift" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <Badge variant="neutral">{p.projectType.replace(/_/g, ' ')}</Badge>
                          <Badge variant={p.status === 'COMPLETED' ? 'info' : 'success'}>{p.status}</Badge>
                        </div>
                        <h3
                          style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => {
                            window.history.pushState({}, '', `/projects/${p.id}`);
                            window.dispatchEvent(new Event('popstate'));
                          }}
                          title="Click to view Project Workbench"
                        >
                          {p.name} <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>↗</span>
                        </h3>
                      </div>
                    </div>

                    {/* Scope & Dates */}
                    <div style={{ marginBottom: '18px', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Project Scope:</div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{p.scope || 'No scope details specified.'}</p>

                      <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>Start Date: <strong style={{ color: 'var(--text-primary)' }}>{p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A'}</strong></span>
                        <span>Expected End: <strong style={{ color: 'var(--text-primary)' }}>{p.targetEndDate ? new Date(p.targetEndDate).toLocaleDateString() : 'N/A'}</strong></span>
                      </div>
                    </div>

                    {/* Handover & Maintenance Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Handover Information</div>
                        <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          • Currently Responsible: <strong>{p.currentLead}</strong><br />
                          • Previously Handled By: <strong>{p.previousLead || 'N/A'}</strong><br />
                          {p.handedOverAt && <span>• Handed Over On: {new Date(p.handedOverAt).toLocaleDateString()}</span>}
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Maintenance Status</div>
                        <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          • Maintenance Required: <strong>{p.maintenanceRequired ? 'Yes' : 'No'}</strong><br />
                          • Notes: {p.maintenanceNotes || 'None'}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Members */}
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <strong>Assigned Members:</strong> {p.assignedMembers.join(', ') || 'None'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.members.length === 0 && results.projects.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
              No Team Members or Projects matched your query "{query}".
            </div>
          )}
        </div>
      )}
    </div>
  );
};
