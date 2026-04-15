import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './ListHotelPage.css';

const AMENITIES = [
  'wifi', 'ac', 'parking', 'pool', 'gym', 'spa',
  'restaurant', 'bar', 'elevator', 'laundry', 'roomService', 'conferenceRoom',
];

const EMPTY = {
  name: '', city: '', state: '', street: '', country: 'India', postalCode: '',
  contactEmail: '', contactPhone: '',
  starRating: 3, description: '',
  pricePerNight: '', maxOccupancy: 2, totalRooms: 5,
  checkInTime: '14:00', checkOutTime: '11:00',
  petFriendly: false, smokingAllowed: false,
  amenities: [],
};

export default function ListHotelPage() {
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(1); // 1 = details, 2 = rooms, 3 = policies
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleAmenity = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a)
      ? f.amenities.filter(x => x !== a)
      : [...f.amenities, a],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.pricePerNight) {
      addToast('Hotel name, city, and price per night are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await listingAPI.submit({ ...form, pricePerNight: Number(form.pricePerNight) });
      setSubmitted(true);
    } catch (err) {
      addToast(err.message || 'Failed to submit listing.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="list-hotel-page">
        <div className="list-success-card">
          <div className="list-success-icon">🎉</div>
          <h2>Listing Submitted!</h2>
          <p>Your hotel has been submitted for review. Our team will verify the details and approve it within 1–2 business days.</p>
          <p className="list-success-note">You'll be able to manage your listing once approved.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  const stepLabel = { fontSize: 11, fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 };
  const inp = (key, type = 'text', extra = {}) => (
    <input
      type={type}
      className="form-input"
      value={form[key]}
      onChange={e => set(key, type === 'checkbox' ? e.target.checked : e.target.value)}
      {...extra}
    />
  );

  return (
    <div className="list-hotel-page">
      {/* Hero Banner */}
      <div className="list-hero">
        <div className="container">
          <div className="list-hero-content">
            <span className="list-hero-badge">🏨 Partner Program</span>
            <h1>List Your Hotel on Yoyo</h1>
            <p>Reach millions of travelers. Submit your property details and our team will review it within 48 hours.</p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="list-form-wrapper">
          {/* Step Indicator */}
          <div className="list-steps">
            {[
              { n: 1, label: 'Property Details' },
              { n: 2, label: 'Rooms & Pricing' },
              { n: 3, label: 'Policies & Submit' },
            ].map(s => (
              <div key={s.n} className={`list-step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}
                onClick={() => setStep(s.n)} style={{ cursor: 'pointer' }}>
                <div className="list-step-num">{step > s.n ? '✓' : s.n}</div>
                <span className="list-step-label">{s.label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="list-form">

            {/* ── Step 1: Property Details ── */}
            {step === 1 && (
              <div className="list-section">
                <h3 className="list-section-title">Property Details</h3>
                <div className="list-grid">
                  <div className="list-field full">
                    <label style={stepLabel}>Hotel Name *</label>
                    <input className="form-input" placeholder="e.g. The Grand Bangalore" value={form.name}
                      onChange={e => set('name', e.target.value)} required />
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>City *</label>
                    {inp('city')}
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>State</label>
                    {inp('state')}
                  </div>
                  <div className="list-field full">
                    <label style={stepLabel}>Street Address</label>
                    {inp('street')}
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>Country</label>
                    {inp('country')}
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>Postal Code</label>
                    {inp('postalCode')}
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>Contact Email</label>
                    {inp('contactEmail', 'email')}
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>Contact Phone</label>
                    {inp('contactPhone', 'tel')}
                  </div>
                  <div className="list-field full">
                    <label style={stepLabel}>Description</label>
                    <textarea className="form-input" rows={3} value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Describe your property — location, ambiance, nearby attractions…"
                      style={{ resize: 'vertical', minHeight: 80 }} />
                  </div>
                  <div className="list-field full">
                    <label style={stepLabel}>Star Rating</label>
                    <div className="star-selector">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} type="button"
                          className={`star-btn ${form.starRating >= s ? 'active' : ''}`}
                          onClick={() => set('starRating', s)}>★</button>
                      ))}
                      <span className="star-label">{form.starRating} Star{form.starRating > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="list-nav">
                  <span />
                  <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                    Next: Rooms & Pricing →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Rooms & Pricing ── */}
            {step === 2 && (
              <div className="list-section">
                <h3 className="list-section-title">Rooms & Pricing</h3>
                <div className="list-grid">
                  <div className="list-field">
                    <label style={stepLabel}>Price per Night (₹) *</label>
                    <input type="number" min={1} className="form-input" placeholder="e.g. 2500"
                      value={form.pricePerNight} onChange={e => set('pricePerNight', e.target.value)} required />
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>Max Occupancy (per room)</label>
                    <input type="number" min={1} max={10} className="form-input" value={form.maxOccupancy}
                      onChange={e => set('maxOccupancy', Number(e.target.value))} />
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>Total Rooms</label>
                    <input type="number" min={1} max={100} className="form-input" value={form.totalRooms}
                      onChange={e => set('totalRooms', Number(e.target.value))} />
                  </div>

                  <div className="list-field full">
                    <label style={stepLabel}>Amenities</label>
                    <div className="amenity-grid">
                      {AMENITIES.map(a => {
                        const on = form.amenities.includes(a);
                        return (
                          <label key={a} className={`amenity-pill ${on ? 'on' : ''}`}>
                            <input type="checkbox" style={{ display: 'none' }} checked={on} onChange={() => toggleAmenity(a)} />
                            {a}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="list-nav">
                  <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                  <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                    Next: Policies →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Policies & Submit ── */}
            {step === 3 && (
              <div className="list-section">
                <h3 className="list-section-title">Policies</h3>
                <div className="list-grid">
                  <div className="list-field">
                    <label style={stepLabel}>Check-in Time</label>
                    {inp('checkInTime')}
                  </div>
                  <div className="list-field">
                    <label style={stepLabel}>Check-out Time</label>
                    {inp('checkOutTime')}
                  </div>
                  <div className="list-field full">
                    <label style={stepLabel}>Property Policies</label>
                    <div className="policy-checks">
                      {[['petFriendly', '🐾 Pet Friendly'], ['smokingAllowed', '🚬 Smoking Allowed']].map(([k, l]) => (
                        <label key={k} className={`policy-pill ${form[k] ? 'on' : ''}`}>
                          <input type="checkbox" style={{ display: 'none' }} checked={form[k]}
                            onChange={e => set(k, e.target.checked)} />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Summary */}
                <div className="list-review-box">
                  <h4>Review Your Submission</h4>
                  <div className="list-review-grid">
                    <span>Hotel</span><strong>{form.name || '—'}</strong>
                    <span>City</span><strong>{form.city || '—'}</strong>
                    <span>Stars</span><strong>{'★'.repeat(form.starRating)}</strong>
                    <span>Price/Night</span><strong>{form.pricePerNight ? `₹${form.pricePerNight}` : '—'}</strong>
                    <span>Rooms</span><strong>{form.totalRooms}</strong>
                    <span>Amenities</span><strong>{form.amenities.join(', ') || 'None'}</strong>
                  </div>
                  <p className="list-review-note">
                    ⚠️ Your listing will be <strong>inactive</strong> until a Yoyo superadmin reviews and approves it.
                  </p>
                </div>

                <div className="list-nav">
                  <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
                  <button type="submit" className="btn btn-primary btn-lg" id="btn-list-submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : '🏨 Submit for Review'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
