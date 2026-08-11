import React, { useState } from 'react';
import { Modal } from '../components/UI/Modal';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      await fetchProfile();
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Account Password">
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            padding: '8px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--primary)',
            borderRadius: '8px',
          }}
        >
          <Lock size={20} />
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Create a new secure password for your Project Tracker account.
        </p>
      </div>

      {success && (
        <div
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: 'var(--success)',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          label="New Password"
          type="password"
          placeholder="Min 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <Button variant="gradient" type="submit" isLoading={isLoading} style={{ flex: 1 }}>
            Update Password
          </Button>
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
