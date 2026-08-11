import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--success)" />;
      case 'error':
        return <XCircle size={18} color="var(--danger)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--warning)" />;
      case 'info':
      default:
        return <Info size={18} color="var(--primary)" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'var(--success)';
      case 'error':
        return 'var(--danger)';
      case 'warning':
        return 'var(--warning)';
      case 'info':
      default:
        return 'var(--primary)';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
          maxWidth: '380px',
          width: '100%',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slide-up"
            style={{
              pointerEvents: 'auto',
              backgroundColor: 'var(--bg-card)',
              borderLeft: `4px solid ${getBorderColor(toast.type)}`,
              borderTop: '1px solid var(--border-color)',
              borderRight: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getIcon(toast.type)}
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
              }}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
