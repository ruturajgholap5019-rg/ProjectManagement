import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiFetch } from '../services/api';
import { isValidPhone } from '../utils/validation';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { User, Mail, Lock, Instagram, Linkedin, Github, Youtube, Facebook, CheckCircle2, Shield, Sparkles, KeyRound, AlertCircle } from 'lucide-react';

interface MyAccountPageProps {
  onOpenChangePassword?: () => void;
}

export const MyAccountPage: React.FC<MyAccountPageProps> = ({ onOpenChangePassword }) => {
  const { user, fetchProfile } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneError, setPhoneError] = useState('');
  const [bio, setBio] = useState(user?.bio || '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(user?.youtubeUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(user?.facebookUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setInstagramUrl(user.instagramUrl || '');
      setLinkedinUrl(user.linkedinUrl || '');
      setGithubUrl(user.githubUrl || '');
      setYoutubeUrl(user.youtubeUrl || '');
      setFacebookUrl(user.facebookUrl || '');
    }
  }, [user]);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (val.trim() && !isValidPhone(val)) {
      setPhoneError('Please enter a valid 10-digit Indian phone number (e.g. 9876543210)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim() && !isValidPhone(phone)) {
      setPhoneError('Please enter a valid 10-digit Indian phone number (e.g. 9876543210)');
      return;
    }

    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone.trim() || undefined,
          bio: bio.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          githubUrl: githubUrl.trim() || undefined,
          youtubeUrl: youtubeUrl.trim() || undefined,
          facebookUrl: facebookUrl.trim() || undefined,
        }),
      });

      await fetchProfile();
      setSuccessMsg('Account profile and social details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const hasAnySocial = Boolean(instagramUrl || linkedinUrl || githubUrl || youtubeUrl || facebookUrl);

  const getCleanUrl = (val: string, platform: string) => {
    if (!val) return '';
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    if (platform === 'instagram' && !val.startsWith('@')) return `https://instagram.com/${val.replace('@', '')}`;
    if (platform === 'instagram' && val.startsWith('@')) return `https://instagram.com/${val.slice(1)}`;
    if (platform === 'github') return `https://github.com/${val.replace('@', '')}`;
    if (platform === 'linkedin') return `https://linkedin.com/in/${val.replace('@', '')}`;
    if (platform === 'youtube') return `https://youtube.com/@${val.replace('@', '')}`;
    if (platform === 'facebook') return `https://facebook.com/${val.replace('@', '')}`;
    return `https://${val}`;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '36px', maxWidth: '1080px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            My <span className="text-gradient">Account & Profile</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage your personal profile, optional social media handles, and account security settings.
          </p>
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: 'var(--success)',
            border: '1px solid var(--success)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Account Info Summary / Name Bar with Integrated Social Icons */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.6rem',
            boxShadow: 'var(--shadow-glow)',
            flexShrink: 0,
          }}
        >
          {user.firstName ? user.firstName[0] : 'U'}{user.lastName ? user.lastName[0] : ''}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {user.firstName} {user.lastName}
            </h2>

            {/* Social Media Icons Bar Directly in Name Header */}
            {hasAnySocial && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {instagramUrl && (
                  <a
                    href={getCleanUrl(instagramUrl, 'instagram')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(225, 48, 108, 0.12)',
                      border: '1px solid rgba(225, 48, 108, 0.3)',
                      transition: 'transform 0.2s ease, backgroundColor 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Instagram size={18} color="#e1306c" />
                  </a>
                )}

                {linkedinUrl && (
                  <a
                    href={getCleanUrl(linkedinUrl, 'linkedin')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="LinkedIn Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(10, 102, 194, 0.12)',
                      border: '1px solid rgba(10, 102, 194, 0.3)',
                      transition: 'transform 0.2s ease, backgroundColor 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Linkedin size={18} color="#0a66c2" />
                  </a>
                )}

                {githubUrl && (
                  <a
                    href={getCleanUrl(githubUrl, 'github')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="GitHub Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--primary-light)',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.2s ease, backgroundColor 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Github size={18} color="var(--text-primary)" />
                  </a>
                )}

                {youtubeUrl && (
                  <a
                    href={getCleanUrl(youtubeUrl, 'youtube')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="YouTube Channel"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(255, 0, 0, 0.12)',
                      border: '1px solid rgba(255, 0, 0, 0.3)',
                      transition: 'transform 0.2s ease, backgroundColor 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Youtube size={18} color="#ff0000" />
                  </a>
                )}

                {facebookUrl && (
                  <a
                    href={getCleanUrl(facebookUrl, 'facebook')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook Profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(24, 119, 242, 0.12)',
                      border: '1px solid rgba(24, 119, 242, 0.3)',
                      transition: 'transform 0.2s ease, backgroundColor 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Facebook size={18} color="#1877f2" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="var(--primary)" /> {user.email}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="var(--accent-purple)" /> Role: <strong>{user.role}</strong>
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Personal Details Section */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} color="var(--primary)" /> Personal Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="First Name" />
            <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Last Name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            <Input label="Email Address (Registered)" value={user.email} disabled helperText="Contact Administrator to update email address" />
            <Input
              label="Phone Number (10-Digit Indian No, Optional)"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="e.g. 9876543210"
              helperText={phoneError || 'Optional: 10-digit Indian mobile number (e.g. 9876543210)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Bio / About Me (Optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your team members about yourself, your background, or core interests..."
              rows={3}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                padding: '12px',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Security Section (Change Password) */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={20} color="var(--primary)" /> Account Security
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Update your account password to maintain maximum security.
              </p>
            </div>

            {onOpenChangePassword && (
              <Button type="button" variant="secondary" onClick={onOpenChangePassword} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} /> Change Password
              </Button>
            )}
          </div>
        </div>

        {/* Optional Social Media Links Section */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={20} color="var(--primary)" /> Social Media & Online Profiles (All Optional)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Add your optional social media handles. Clicking the icons in your top profile name bar will navigate directly to your profiles.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Instagram size={16} color="#e1306c" /> Instagram ID / Profile URL
              </label>
              <Input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="e.g. @yourhandle or https://instagram.com/yourhandle"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Linkedin size={16} color="#0a66c2" /> LinkedIn Profile URL
              </label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="e.g. https://linkedin.com/in/yourprofile"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Github size={16} color="var(--text-primary)" /> GitHub Username / URL
              </label>
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="e.g. https://github.com/yourusername"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Youtube size={16} color="#ff0000" /> YouTube Channel URL
              </label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="e.g. https://youtube.com/@yourchannel"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Facebook size={16} color="#1877f2" /> Facebook Profile / Page URL
              </label>
              <Input
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="e.g. https://facebook.com/yourprofile"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
          <Button variant="gradient" type="submit" isLoading={isSaving} style={{ padding: '12px 32px' }}>
            Save Account Details
          </Button>
        </div>
      </form>
    </div>
  );
};
