import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = '640px' }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(6, 9, 18, 0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 9999999,
    padding: '60px 24px 24px',
    overflowY: 'auto',
  };

  const dialogStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: maxWidth,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.5), 0 0 45px rgba(99, 102, 241, 0.25)',
    overflow: 'hidden',
    marginBottom: '24px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 26px',
    borderBottom: '1px solid var(--border-color)',
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%)',
    flexShrink: 0,
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'var(--bg-main)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s ease',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '26px 30px',
    flex: 1,
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div className="animate-fade-in" style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {/* Sleek Header Banner with Close Icon */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '18px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(180deg, var(--primary), var(--accent-purple))' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {title}
            </h3>
          </div>

          <button type="button" onClick={onClose} style={closeBtnStyle} title="Close Form" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  );
};
