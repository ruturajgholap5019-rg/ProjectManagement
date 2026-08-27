import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useDateFilterStore } from './store/dateFilterStore';
import { useCategoryFilterStore } from './store/categoryFilterStore';
import { apiFetch, prefetchEndpoint } from './services/api';
import { ToastProvider } from './context/ToastContext';
import { LogOut, Users, FolderKanban, LayoutDashboard, CheckSquare, Layers, Sun, Moon, FileText, Search, Bell, X, User as UserIcon, Menu } from 'lucide-react';

import { Login } from './pages/Login';
import { ChangePasswordModal } from './pages/ChangePasswordModal';
import { UsersPage } from './pages/Users';
import { ProjectsPage } from './pages/Projects';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { MyTasksPage } from './pages/MyTasks';
import { DashboardPage } from './pages/Dashboard';
import { WorkActivitiesPage } from './pages/WorkActivities';
import { GlobalSearchPage } from './pages/GlobalSearch';
import { StudentProfilePage } from './pages/StudentProfile';
import { MyAccountPage } from './pages/MyAccount';
import { CategoryManagerModal } from './components/UI/CategoryManagerModal';

type TabType = 'dashboard' | 'projects' | 'activities' | 'search' | 'tasks' | 'users' | 'students' | 'account';

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading, refreshSession, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { rangeType, startDate, endDate, setDateRange } = useDateFilterStore();
  const { selectedCategory, setSelectedCategory, categories, fetchCategories } = useCategoryFilterStore();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Password Change Modal State
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);

  // Global Search State & Input Ref
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Full-Screen Creation Form View State
  const [isFullScreenFormActive, setIsFullScreenFormActive] = useState(false);

  // Sync state from clean URL path on page load / popstate
  const parseCurrentPath = () => {
    let path = window.location.pathname;

    // Fallback migration for hash URLs (e.g. /#projects -> /projects)
    if (window.location.hash) {
      const hashPath = window.location.hash.replace(/^#\/?/, '');
      if (hashPath) {
        path = '/' + hashPath;
        window.history.replaceState({}, '', path);
      }
    }

    path = path.replace(/\/$/, ''); // strip trailing slash

    if (!path || path === '' || path === '/dashboard' || path === '/') {
      setActiveTab('dashboard');
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    } else if (path.startsWith('/projects')) {
      setActiveTab('projects');
      setSelectedStudentId(null);
      const parts = path.split('/');
      if (parts.length > 2 && parts[2]) {
        setSelectedProjectId(parts[2]);
      } else {
        setSelectedProjectId(null);
      }
    } else if (path.startsWith('/students')) {
      setActiveTab('students');
      setSelectedProjectId(null);
      const parts = path.split('/');
      if (parts.length > 2 && parts[2]) {
        setSelectedStudentId(parts[2]);
      } else {
        setSelectedStudentId(null);
      }
    } else if (path.startsWith('/activities')) {
      setActiveTab('activities');
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    } else if (path.startsWith('/tasks') || path.startsWith('/deliverables')) {
      setActiveTab('tasks');
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    } else if (path.startsWith('/users')) {
      // Secure Route Check: Only ADMIN can access User Management
      if (user && user.role !== 'ADMIN') {
        setActiveTab('dashboard');
        window.history.replaceState({}, '', '/dashboard');
      } else {
        setActiveTab('users');
      }
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    } else if (path.startsWith('/account')) {
      setActiveTab('account');
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    } else if (path.startsWith('/search')) {
      setActiveTab('search');
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    } else {
      setActiveTab('dashboard');
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    }
  };

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (isAuthenticated) {
      parseCurrentPath();
      const handleNavState = () => parseCurrentPath();
      window.addEventListener('popstate', handleNavState);
      window.addEventListener('hashchange', handleNavState);
      return () => {
        window.removeEventListener('popstate', handleNavState);
        window.removeEventListener('hashchange', handleNavState);
      };
    }
  }, [isAuthenticated, user?.role]);

  // Non-blocking Background Idle Prefetcher (Runs 1.5s after Dashboard renders)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const timer = setTimeout(() => {
      const runWhenIdle = (fn: () => void, delayMs: number) => {
        setTimeout(() => {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => fn());
          } else {
            fn();
          }
        }, delayMs);
      };

      // 1. Pre-warm categories
      runWhenIdle(() => prefetchEndpoint('/categories'), 0);

      // 2. Pre-warm projects list (staggered 500ms)
      runWhenIdle(() => prefetchEndpoint('/projects'), 500);

      // 3. Pre-warm users / tasks (staggered 1000ms)
      runWhenIdle(() => {
        if (user.role === 'ADMIN') {
          prefetchEndpoint('/users');
        } else {
          prefetchEndpoint('/tasks/my');
        }
      }, 1000);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const isHeaderVisibleRef = useRef(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          let nextVisible = isHeaderVisibleRef.current;

          if (currentScrollY <= 15) {
            nextVisible = true;
          } else if (currentScrollY > lastScrollY && currentScrollY > 70) {
            // Scrolling Down -> Disappear Navbar
            nextVisible = false;
          } else if (currentScrollY < lastScrollY) {
            // Scrolling Up -> Show Navbar
            nextVisible = true;
          }

          if (nextVisible !== isHeaderVisibleRef.current) {
            isHeaderVisibleRef.current = nextVisible;
            setIsHeaderVisible(nextVisible);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        if (activeTab !== 'search') {
          navigateTo('search');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const navigateTo = (tab: TabType, id: string | null = null) => {
    setIsMobileMenuOpen(false);
    // Secure Route Guard
    if (tab === 'users' && user?.role !== 'ADMIN') {
      tab = 'dashboard';
      id = null;
    }

    setActiveTab(tab);
    let targetPath = `/${tab}`;

    if (tab === 'projects') {
      setSelectedProjectId(id);
      setSelectedStudentId(null);
      targetPath = id ? `/projects/${id}` : '/projects';
    } else if (tab === 'students') {
      setSelectedStudentId(id);
      setSelectedProjectId(null);
      targetPath = id ? `/students/${id}` : '/users';
    } else {
      setSelectedProjectId(null);
      setSelectedStudentId(null);
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch<any[]>('/notifications');
      setNotifications(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchCategories();
    }
  }, [isAuthenticated]);

  const handleNavSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!navSearchQuery.trim()) return;
    navigateTo('search');
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          backgroundColor: 'var(--bg-main)',
          color: 'var(--text-secondary)',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Layers className="animate-spin" size={24} color="var(--primary)" />
          Initializing Project Tracker Platform...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  const roleColor = user.role === 'ADMIN' ? 'var(--primary)' : 'var(--success)';
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
        <ChangePasswordModal isOpen={isChangePassOpen} onClose={() => setIsChangePassOpen(false)} />

        {/* Mobile Sidebar Backdrop Overlay */}
        {!isFullScreenFormActive && isMobileMenuOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* Fixed Sticky Left Sidebar Navigation */}
        {!isFullScreenFormActive && (
          <aside
            className={`app-sidebar ${isMobileMenuOpen ? 'open' : ''}`}
            style={{
              width: '260px',
              height: '100vh',
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              zIndex: 100,
              overflowY: 'auto',
            }}
          >
          {/* Sidebar Header */}
          <div style={{ padding: '24px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                boxShadow: 'var(--shadow-glow)',
                cursor: 'pointer',
              }}
              onClick={() => navigateTo('dashboard')}
            >
              PT
            </div>
            <div>
              <h2
                style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)', cursor: 'pointer' }}
                onClick={() => navigateTo('dashboard')}
              >
                Project <span className="text-gradient">Tracker</span>
              </h2>
              <span style={{ fontSize: '0.68rem', color: roleColor, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ flex: 1, padding: '22px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => navigateTo('dashboard')}
              onMouseEnter={() => prefetchEndpoint('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'dashboard' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'dashboard' ? 700 : 600,
                fontSize: '0.92rem',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                borderLeft: activeTab === 'dashboard' ? '3.5px solid var(--primary)' : '3.5px solid transparent',
                boxShadow: activeTab === 'dashboard' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <LayoutDashboard size={18} color={activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-secondary)'} />
              Dashboard
            </button>

            <button
              onClick={() => navigateTo('projects')}
              onMouseEnter={() => prefetchEndpoint('/projects')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'projects' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'projects' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'projects' ? 700 : 600,
                fontSize: '0.92rem',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                borderLeft: activeTab === 'projects' ? '3.5px solid var(--primary)' : '3.5px solid transparent',
                boxShadow: activeTab === 'projects' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <FolderKanban size={18} color={activeTab === 'projects' ? 'var(--primary)' : 'var(--text-secondary)'} />
              Projects
            </button>

            <button
              onClick={() => navigateTo('activities')}
              onMouseEnter={() => prefetchEndpoint('/activities')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'activities' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'activities' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'activities' ? 700 : 600,
                fontSize: '0.92rem',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                borderLeft: activeTab === 'activities' ? '3.5px solid var(--primary)' : '3.5px solid transparent',
                boxShadow: activeTab === 'activities' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <FileText size={18} color={activeTab === 'activities' ? 'var(--primary)' : 'var(--text-secondary)'} />
              Work Activities Log
            </button>

            <button
              onClick={() => navigateTo('tasks')}
              onMouseEnter={() => prefetchEndpoint('/tasks/my')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'tasks' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'tasks' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'tasks' ? 700 : 600,
                fontSize: '0.92rem',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                borderLeft: activeTab === 'tasks' ? '3.5px solid var(--primary)' : '3.5px solid transparent',
                boxShadow: activeTab === 'tasks' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <CheckSquare size={18} color={activeTab === 'tasks' ? 'var(--primary)' : 'var(--text-secondary)'} />
              My Deliverables
            </button>

            {user.role === 'ADMIN' && (
              <button
                onClick={() => navigateTo('users')}
                onMouseEnter={() => prefetchEndpoint('/users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: activeTab === 'users' || activeTab === 'students' ? 'var(--primary-light)' : 'transparent',
                  color: activeTab === 'users' || activeTab === 'students' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'users' || activeTab === 'students' ? 700 : 600,
                  fontSize: '0.92rem',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  borderLeft: activeTab === 'users' || activeTab === 'students' ? '3.5px solid var(--primary)' : '3.5px solid transparent',
                  boxShadow: activeTab === 'users' || activeTab === 'students' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Users size={18} color={activeTab === 'users' || activeTab === 'students' ? 'var(--primary)' : 'var(--text-secondary)'} />
                User Management
              </button>
            )}

            <button
              onClick={() => navigateTo('account')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'account' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'account' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'account' ? 700 : 600,
                fontSize: '0.92rem',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                borderLeft: activeTab === 'account' ? '3.5px solid var(--primary)' : '3.5px solid transparent',
                boxShadow: activeTab === 'account' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <UserIcon size={18} color={activeTab === 'account' ? 'var(--primary)' : 'var(--text-secondary)'} />
              My Account
            </button>
          </nav>

          {/* Mobile Only Filter Controls Drawer Section */}
          <div className="mobile-only" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Global Filters</div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 700, outline: 'none' }}
            >
              <option value="">📂 All Project Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.icon || '📁'} {c.name}
                </option>
              ))}
            </select>

            <select
              value={rangeType}
              onChange={(e) => setDateRange(e.target.value as any, startDate, endDate)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 700, outline: 'none' }}
            >
              <option value="all">📅 All Time</option>
              <option value="today">📌 Today</option>
              <option value="yesterday">⏪ Yesterday</option>
              <option value="week">🗓️ This Week</option>
              <option value="month">📆 This Month</option>
              <option value="year">📊 This Year</option>
            </select>
          </div>

          {/* User Profile & Sign Out Footer */}
          <div style={{ padding: '18px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-card)' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => navigateTo('account')}
              title="Click to view My Account"
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {user.firstName ? user.firstName[0] : 'U'}{user.lastName ? user.lastName[0] : ''}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.firstName} {user.lastName}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>
        )}

        {/* Main Workspace Area with Header Navigation */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Top Glassmorphic Navigation Header Bar */}
          {!isFullScreenFormActive && (
            <header
              className="glass-panel"
              style={{
                height: '68px',
                position: 'sticky',
                top: 0,
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                flexShrink: 0,
                zIndex: 50,
                transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
            {/* Mobile Header Left Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                title="Toggle Mobile Menu"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="mobile-only" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Project<span className="text-gradient">Tracker</span>
              </div>
            </div>

            {/* Desktop Filters Wrapper - Automatically Hidden on Mobile Viewports */}
            <div className="header-desktop-filters" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
              {/* Integrated Header Search Bar */}
              <form onSubmit={handleNavSearchSubmit} style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
                <div
                  className="navbar-search-wrapper"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0 16px',
                    height: '40px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <Search size={17} color="var(--primary)" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.85 }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search Student name or Project name..."
                    value={navSearchQuery}
                    onChange={(e) => setNavSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (activeTab !== 'search') navigateTo('search');
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                  {navSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNavSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px',
                        marginLeft: '8px',
                      }}
                      title="Clear search"
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.04em',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      Ctrl K
                    </div>
                  )}
                </div>
              </form>

              {/* Global Navbar Project Category Dropdown Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    backgroundColor: selectedCategory ? 'var(--primary-light)' : 'var(--bg-card)',
                    border: selectedCategory ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    color: selectedCategory ? 'var(--primary)' : 'var(--text-primary)',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: selectedCategory ? '0 0 10px rgba(99, 102, 241, 0.25)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                  title="Filter entire application by Project Category"
                >
                  <option value="">📂 All Project Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.icon || '📁'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Global Navbar Date Range Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={rangeType}
                  onChange={(e) => setDateRange(e.target.value as any, startDate, endDate)}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '7px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">📅 All Time</option>
                  <option value="today">📌 Today</option>
                  <option value="yesterday">⏪ Yesterday</option>
                  <option value="week">🗓️ This Week</option>
                  <option value="month">📆 This Month</option>
                  <option value="year">📊 This Year</option>
                  <option value="custom">🛠️ Custom Range</option>
                </select>

                {rangeType === 'custom' && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setDateRange('custom', e.target.value, endDate)}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setDateRange('custom', startDate, e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Header Actions (Bell & Theme Switcher) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        backgroundColor: 'var(--danger)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Overlay Menu */}
                {isNotifOpen && (
                  <div
                    className="animate-fade-in"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '48px',
                      width: '320px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100,
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</h4>
                      <button onClick={() => setIsNotifOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={16} />
                      </button>
                    </div>

                    {notifications.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>No notifications.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                        {notifications.map((n) => (
                          <div key={n.id} style={{ fontSize: '0.82rem', padding: '8px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{n.message}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {theme === 'light' ? <Moon size={18} color="var(--primary)" /> : <Sun size={18} color="#f59e0b" />}
              </button>
            </div>
          </header>
          )}

          {/* Page Content Workspace */}
          <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-main)' }}>
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'projects' && !selectedProjectId && (
              <ProjectsPage
                onSelectProject={(id) => navigateTo('projects', id)}
                onToggleFullScreenForm={setIsFullScreenFormActive}
                onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
              />
            )}
            {activeTab === 'projects' && selectedProjectId && (
              <ProjectDetailPage
                projectId={selectedProjectId}
                onBack={() => navigateTo('projects', null)}
                onToggleFullScreenForm={setIsFullScreenFormActive}
              />
            )}
            {activeTab === 'students' && selectedStudentId && (
              <StudentProfilePage userId={selectedStudentId} onBack={() => navigateTo('users')} onSelectProject={(id) => navigateTo('projects', id)} />
            )}
            {activeTab === 'activities' && <WorkActivitiesPage />}
            {activeTab === 'search' && <GlobalSearchPage initialQuery={navSearchQuery} />}
            {activeTab === 'users' && user.role === 'ADMIN' && (
              <UsersPage
                onSelectStudent={(id) => navigateTo('students', id)}
                onToggleFullScreenForm={setIsFullScreenFormActive}
              />
            )}
            {activeTab === 'tasks' && (
              <MyTasksPage onSelectProject={(id) => navigateTo('projects', id)} />
            )}
            {activeTab === 'account' && (
              <MyAccountPage onOpenChangePassword={() => setIsChangePassOpen(true)} />
            )}
          </main>
        </div>
      </div>

      {isCategoryModalOpen && (
        <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
      )}
    </ToastProvider>
  );
};
export default App;
