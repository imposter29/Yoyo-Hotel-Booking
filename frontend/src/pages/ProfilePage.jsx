import { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Footer from '../components/common/Footer';

function Section({ title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f0f0f', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e5e5e5' }}>{title}</h2>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, login } = useAuth();
  const { addToast } = useToast();

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await authAPI.updateProfile(profileForm);
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 15);
    setProfileForm(f => ({ ...f, phone: val }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      addToast('New passwords do not match.', 'error'); return;
    }
    if (pwForm.newPassword.length < 8) {
      addToast('Password must be at least 8 characters.', 'error'); return;
    }
    setPwLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      addToast('Password changed successfully!', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  const roleLabel = { guest: 'Guest', hotel_admin: 'Hotel Admin', superadmin: 'Super Admin' }[user?.role] || user?.role;

  return (
    <div style={{ minHeight: '80vh', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }} id="profile-page">
      <div className="container" style={{ flex: 1, paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 26, fontWeight: 800, flexShrink: 0 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>{user?.firstName} {user?.lastName}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 12, background: '#e5e5e5', padding: '2px 8px', borderRadius: 4, color: '#525252', fontWeight: 600 }}>{roleLabel}</span>
                <span style={{ fontSize: 12, color: '#a3a3a3' }}>{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <Section title="Personal Information">
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>First Name</label>
                  <input className="form-input" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} id="profile-first-name" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Name</label>
                  <input className="form-input" value={profileForm.lastName} onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} id="profile-last-name" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                <input className="form-input" value={user?.email || ''} disabled style={{ background: '#f5f5f5', color: '#a3a3a3' }} />
                <p style={{ fontSize: 11, color: '#a3a3a3', marginTop: 4 }}>Email cannot be changed</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</label>
                <input className="form-input" type="tel" value={profileForm.phone} onChange={handlePhoneChange} id="profile-phone" placeholder="e.g. 9876543210" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={profileLoading} id="btn-save-profile" style={{ alignSelf: 'flex-start' }}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </Section>

          {/* Change Password */}
          <Section title="Change Password">
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['currentPassword', 'Current Password', 'profile-current-pw'],
                ['newPassword', 'New Password', 'profile-new-pw'],
                ['confirmPassword', 'Confirm New Password', 'profile-confirm-pw'],
              ].map(([key, label, id]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                  <input id={id} type="password" className="form-input" value={pwForm[key]} onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))} autoComplete="off" />
                </div>
              ))}
              <button type="submit" className="btn btn-outline" disabled={pwLoading} id="btn-change-password" style={{ alignSelf: 'flex-start' }}>
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </Section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
