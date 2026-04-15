import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';

export default function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId || bookingId === 'new') { setLoading(false); return; }
    bookingsAPI.getById(bookingId)
      .then((d) => setBooking(d.data?.booking))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  const checkIn = booking ? new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const checkOut = booking ? new Date(booking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const ref = booking ? `YY-${booking._id?.toString().slice(-8).toUpperCase()}` : '';

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }} id="booking-confirmation-page" role="main">
      <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>Booking Confirmed!</h1>
      <p style={{ fontSize: 16, color: '#525252', marginBottom: 4 }}>Your reservation has been successfully placed.</p>
      <p style={{ fontSize: 14, color: '#a3a3a3', marginBottom: 28 }}>A confirmation email has been sent to your inbox.</p>

      {loading ? (
        <div style={{ width: 360, background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 28 }}>
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%`, marginBottom: 12, marginLeft: 'auto', marginRight: 'auto' }} />
          ))}
        </div>
      ) : booking ? (
        <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 28, textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booking Details</div>
          {[
            ['Reference', ref],
            ['Hotel', booking.hotel?.name],
            ['Location', booking.hotel?.address?.city ? `${booking.hotel.address.city}, ${booking.hotel.address.country}` : null],
            ['Check-in', checkIn],
            ['Check-out', checkOut],
            ['Nights', booking.totalNights],
            ['Guests', booking.guestCount],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: '#737373' }}>{k}</span>
              <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
            <span>Total Paid</span>
            <span style={{ color: '#16a34a' }}>₹{booking.totalAmount?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/my-bookings" className="btn btn-primary btn-lg" id="btn-view-bookings">View My Bookings</Link>
        <Link to="/" className="btn btn-outline btn-lg" id="btn-go-home-conf">Back to Home</Link>
      </div>
    </div>
  );
}
