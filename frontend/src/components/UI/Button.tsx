import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--danger)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: 'none',
        };
      case 'gradient':
        return {
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: 'var(--shadow-glow)',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 14px var(--primary-glow)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '7px 14px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' };
      case 'lg':
        return { padding: '13px 28px', fontSize: '1.02rem', borderRadius: 'var(--radius-md)' };
      case 'md':
      default:
        return { padding: '10px 20px', fontSize: '0.9rem', borderRadius: 'var(--radius-md)' };
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 600,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    outline: 'none',
    userSelect: 'none',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`btn-primary-shimmer ${className}`}
      style={baseStyle}
      {...props}
    >
      {isLoading && (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid transparent',
            borderTopColor: 'currentColor',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </button>
  );
};
