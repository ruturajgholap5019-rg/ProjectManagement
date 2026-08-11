import React, { useState, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, style, type = 'text', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const effectiveType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type={effectiveType}
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            border: error ? '1px solid var(--danger)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            paddingTop: '11px',
            paddingBottom: '11px',
            paddingLeft: '16px',
            paddingRight: isPasswordType ? '44px' : '16px',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: '0.92rem',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            ...style,
          }}
          onFocus={(e) => {
            if (!error) e.target.style.borderColor = 'var(--border-focus)';
            e.target.style.boxShadow = 'var(--shadow-glow)';
          }}
          onBlur={(e) => {
            if (!error) e.target.style.borderColor = 'var(--border-color)';
            e.target.style.boxShadow = 'var(--shadow-sm)';
          }}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            title={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color 0.15s ease',
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>}
      {helperText && !error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{helperText}</span>
      )}
    </div>
  );
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({ label, error, options, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
          {label}
        </label>
      )}
      <select
        style={{
          backgroundColor: 'var(--bg-card)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '11px 16px',
          color: 'var(--text-primary)',
          outline: 'none',
          fontSize: '0.92rem',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          ...style,
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border-focus)';
          e.target.style.boxShadow = 'var(--shadow-glow)';
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border-color)';
          e.target.style.boxShadow = 'var(--shadow-sm)';
        }}
        {...props}
      >
        {options.map((opt, idx) => (
          <option key={`${opt.value}-${idx}`} value={opt.value} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>}
    </div>
  );
};

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
          {label}
        </label>
      )}
      <textarea
        style={{
          backgroundColor: 'var(--bg-card)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '11px 16px',
          color: 'var(--text-primary)',
          outline: 'none',
          fontSize: '0.92rem',
          minHeight: '90px',
          resize: 'vertical',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          ...style,
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border-focus)';
          e.target.style.boxShadow = 'var(--shadow-glow)';
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border-color)';
          e.target.style.boxShadow = 'var(--shadow-sm)';
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>}
    </div>
  );
};
