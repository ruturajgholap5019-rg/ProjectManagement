import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
}) => {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--border-color)',
        opacity: 0.6,
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              height="28px"
              style={{ flex: c === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
