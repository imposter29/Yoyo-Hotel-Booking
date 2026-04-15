import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', role: 'guest',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email,
        phone:     form.phone,
        password:  form.password,
        role:      form.role,
      });
      // Redirect hotel_admin to listing page, guests to home
      navigate(form.role === 'hotel_admin' ? '/list-hotel' : '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo" aria-label="YOYO Home">
            <span className="auth-logo-text">YOYO</span>
          </Link>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join millions of travellers getting the best deals</p>
        </div>

        {error && (
          <div className="auth-error" role="alert" aria-live="polite">⚠️ {error}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" aria-label="Registration form">

          {/* ── Role Selector ── */}
          <div className="form-group">
            <label className="form-label">I am a…</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
              {[
                { value: 'guest',       icon: '🧳', title: 'Guest',       desc: 'I want to book hotels' },
                { value: 'hotel_admin', icon: '🏨', title: 'Hotel Owner',  desc: 'I want to list my property' },
              ].map(opt => (
                <label key={opt.value}
                  htmlFor={`role-${opt.value}`}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 2,
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${form.role === opt.value ? '#ef4444' : '#e5e5e5'}`,
                    background: form.role === opt.value ? '#fff5f5' : 'white',
                    transition: 'all 0.15s',
                  }}>
                  <input type="radio" id={`role-${opt.value}`} name="role" value={opt.value}
                    checked={form.role === opt.value} onChange={handleChange('role')}
                    style={{ display: 'none' }} />
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: form.role === opt.value ? '#ef4444' : '#0f0f0f' }}>{opt.title}</span>
                  <span style={{ fontSize: 11, color: '#737373' }}>{opt.desc}</span>
                </label>
              ))}
            </div>
            {form.role === 'hotel_admin' && (
              <p style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
                🏨 After signing up, you'll be directed to list your property. A Yoyo admin will review and approve it.
              </p>
            )}
          </div>

          {/* ── Name row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label htmlFor="reg-first-name" className="form-label">First Name *</label>
              <input id="reg-first-name" type="text" className="form-input" placeholder="John"
                value={form.firstName} onChange={handleChange('firstName')} required autoComplete="given-name" />
            </div>
            <div className="form-group">
              <label htmlFor="reg-last-name" className="form-label">Last Name</label>
              <input id="reg-last-name" type="text" className="form-input" placeholder="Doe"
                value={form.lastName} onChange={handleChange('lastName')} autoComplete="family-name" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email address *</label>
            <input id="reg-email" type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={handleChange('email')} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="reg-phone" className="form-label">Phone Number</label>
            <input id="reg-phone" type="tel" className="form-input" placeholder="+91 98765 43210"
              value={form.phone} onChange={handleChange('phone')} autoComplete="tel" />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <input id="reg-password" type="password" className="form-input" placeholder="Min. 8 characters"
              value={form.password} onChange={handleChange('password')} required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">Confirm Password</label>
            <input id="reg-confirm" type="password" className="form-input" placeholder="Repeat password"
              value={form.confirmPassword} onChange={handleChange('confirmPassword')} required />
          </div>

          <button type="submit" className="btn btn-primary btn-xl auth-submit"
            id="register-submit-btn" disabled={loading} aria-busy={loading}>
            {loading ? 'Creating account…' : form.role === 'hotel_admin' ? 'Create Account & List Hotel →' : 'Create Account'}
          </button>
        </form>

        <p className="auth-terms">
          By signing up, you agree to YOYO's{' '}
          <a href="#" className="auth-link">Terms of Service</a>{' '}and{' '}
          <a href="#" className="auth-link">Privacy Policy</a>.
        </p>
        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link" id="link-to-login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
