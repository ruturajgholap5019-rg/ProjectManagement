import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { apiFetch } from '../services/api';
import { isValidEmail } from '../utils/validation';
import { Sparkles, AlertCircle, Sun, Moon, ShieldCheck, UserCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const { theme, toggleTheme } = useThemeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiFetch<{ user: any; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      });

      setAuth(data.user, data.accessToken);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const autofillAdmin = () => {
    setEmail('admin@organization.com');
    setPassword('Password123!');
    setError('');
  };

  const autofillStudent = () => {
    setEmail('student@organization.com');
    setPassword('Password123!');
    setError('');
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Glowing Ambient Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          left: '-120px',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          right: '-120px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Right Theme Switcher */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '9px 16px',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {theme === 'light' ? <Moon size={16} color="var(--primary)" /> : <Sun size={16} color="#f59e0b" />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>

      {/* Glassmorphic Login Card */}
      <div
        className="animate-fade-in glass-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px 36px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            className="animate-float"
            style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 20px var(--primary-glow)',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Project <span className="text-gradient">Tracker</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
            Centralized digital workspace for project tracking, deliverables, and student activity analytics
          </p>
        </div>

        {/* Demo Fast Login Pills */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', textAlign: 'center' }}>
            ⚡ Quick Demo Accounts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={autofillAdmin}
              style={{
                backgroundColor: 'var(--bg-card-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheck size={14} color="var(--primary)" /> Admin Account
            </button>
            <button
              type="button"
              onClick={autofillStudent}
              style={{
                backgroundColor: 'var(--bg-card-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <UserCheck size={14} color="var(--success)" /> Student Account
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-light)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              lineHeight: '1.4',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@organization.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button variant="gradient" type="submit" isLoading={isLoading} style={{ marginTop: '8px', width: '100%', height: '46px', fontSize: '0.98rem' }}>
            Sign In to Platform
          </Button>
        </form>
      </div>
    </div>
  );
};
