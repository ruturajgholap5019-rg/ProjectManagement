import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  color?: string;
  subtext?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  color = 'var(--primary)',
  subtext,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {value}
          </span>
          {trend && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)' }}>
              {trend}
            </span>
          )}
        </div>
        {subtext && (
          <span style={{ fontSize: '0.70rem', color: 'var(--text-secondary)' }}>
            {subtext}
          </span>
        )}
      </div>

      {icon && (
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
    </div>
  );
};
