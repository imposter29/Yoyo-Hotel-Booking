import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Footer from '../components/common/Footer';
import './MyBookingsPage.css';

const STATUS_CONFIG = {
  confirmed:   { label: 'Confirmed',   cls: 'badge-green' },
  checked_in:  { label: 'Checked In',  cls: 'badge-green' },
  checked_out: { label: 'Checked Out', cls: 'badge-gray'  },
  hold:        { label: 'On Hold',     cls: 'badge-gray'  },
  cancelled:   { label: 'Cancelled',   cls: 'badge-red'   },
  expired:     { label: 'Expired',     cls: 'badge-red'   },
};

function BookingCard({ booking, onCancel }) {
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.hold;
  const hotel = booking.hotel;
  const checkIn  = new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const checkOut = new Date(booking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const ref = `YY-${booking._id.toString().slice(-8).toUpperCase()}`;
  const canCancel = ['hold', 'confirmed'].includes(booking.status);
  const needsPayment = booking.status === 'hold' && !booking.payment;

  return (
    <div className="booking-card" id={`booking-card-${booking._id}`} role="article">
      <div className="booking-card-header">
        <div>
          <h3 className="booking-hotel-name">{hotel?.name || 'Hotel Name'}</h3>
          <div className="booking-location"> {hotel?.address?.city}, {hotel?.address?.country}</div>
          <div style={{ fontSize: 12, color: '#a3a3a3', marginTop: 4 }}>Ref: {ref}</div>
        </div>
        <span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span>
      </div>

      <div className="booking-card-body">
        <div className="booking-dates">
          <div className="booking-date-item">
            <span className="booking-date-label">Check-in</span>
            <span className="booking-date-value">{checkIn}</span>
          </div>
          <div className="booking-date-arrow">→</div>
          <div className="booking-date-item">
            <span className="booking-date-label">Check-out</span>
            <span className="booking-date-value">{checkOut}</span>
          </div>
        </div>
        <div className="booking-meta">
          <span> {booking.totalNights} Night{booking.totalNights > 1 ? 's' : ''}</span>
          <span> {booking.guestCount} Guest{booking.guestCount > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="booking-card-footer">
        <div className="booking-price-total">
          <span className="booking-price-label">Total</span>
          <span className="booking-price-amt">₹{booking.totalAmount?.toLocaleString('en-IN') || '—'}</span>
        </div>
        <div className="booking-actions">
          {needsPayment && (
            <Link to={`/payment/${booking._id}`} className="btn btn-red btn-sm" id={`btn-pay-${booking._id}`}>
              Complete Payment
            </Link>
          )}
          <Link to={`/hotels/${hotel?._id}`} className="btn btn-outline btn-sm" id={`btn-view-hotel-${booking._id}`}>
            View Hotel
          </Link>
          {canCancel && (
            <button
              className="btn btn-sm"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' }}
              onClick={() => onCancel(booking._id)}
              id={`btn-cancel-${booking._id}`}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const { addToast } = useToast();

  useEffect(() => {
    bookingsAPI.getMyBookings()
      .then((d) => setBookings(d.data?.bookings || []))
      .catch((err) => setError(err.message || 'Failed to load bookings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id, { reason: 'Guest requested cancellation' });
      setBookings((bs) => bs.map((b) => b._id === id ? { ...b, status: 'cancelled' } : b));
      addToast('Booking cancelled successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to cancel booking.', 'error');
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="my-bookings-page" id="my-bookings-page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48, flex: 1 }}>
        <h1 className="page-title">My Bookings</h1>
        <p className="page-subtitle">Manage your upcoming and past reservations</p>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[['all', 'All'], ['hold', 'On Hold'], ['confirmed', 'Confirmed'], ['checked_out', 'Past'], ['cancelled', 'Cancelled']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`btn btn-sm ${filter === v ? 'btn-red' : 'btn-outline'}`}
              id={`filter-tab-${v}`}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bookings-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="booking-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
                  <div className="skeleton skeleton-text xl" style={{ width: '50%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '35%' }} />
                  <div className="skeleton skeleton-text lg" style={{ width: '40%', marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bookings-error" role="alert">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="bookings-empty">
            <div className="empty-icon"></div>
            <h3>{filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}</h3>
            <p>Start exploring hotels and make your first booking!</p>
            <Link to="/hotels" className="btn btn-primary btn-lg">Browse Hotels</Link>
          </div>
        ) : (
          <div className="bookings-list">
            {filtered.map((b) => <BookingCard key={b._id} booking={b} onCancel={handleCancel} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
