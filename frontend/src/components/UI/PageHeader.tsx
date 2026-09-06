import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {b.onClick ? (
                <button
                  type="button"
                  onClick={b.onClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {b.label}
                </button>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            {title}
          </h1>
          {badge}
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>

      {subtitle && (
        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
