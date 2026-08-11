import React from 'react';

export interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'gradient';
  children: React.ReactNode;
  pulse?: boolean;
  style?: React.CSSProperties;
  title?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, pulse = false, style, title, onClick }) => {
  const getStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'success':
        return { backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'warning':
        return { backgroundColor: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'danger':
        return { backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'info':
        return { backgroundColor: 'var(--info-light)', color: 'var(--info)', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'gradient':
        return {
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
          color: 'var(--primary)',
          border: '1px solid var(--border-glow)',
        };
      case 'neutral':
      default:
        return { backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
    }
  };

  return (
    <span
      className={pulse ? 'animate-pulse-glow' : ''}
      title={title}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        transition: 'all 0.2s ease',
        ...getStyles(),
        ...style,
      }}
    >
      {pulse && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  );
};
