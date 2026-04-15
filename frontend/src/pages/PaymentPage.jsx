import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { paymentsAPI, bookingsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const METHODS = [
  { value: 'test', label: '🧪 Test Payment', desc: 'Simulated (dev mode)' },
  { value: 'card', label: '💳 Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
  { value: 'upi', label: '📱 UPI', desc: 'GPay, PhonePe, Paytm' },
  { value: 'netbanking', label: '🏦 Net Banking', desc: 'All major banks' },
];

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('test');
  const [busy, setBusy] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [step, setStep] = useState('select');
  const [error, setError] = useState('');

  useEffect(() => {
    bookingsAPI.getById(bookingId)
      .then((d) => setBooking(d.data?.booking))
      .catch(() => setError('Could not load booking.'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handleInitiate = async () => {
    setBusy(true); setError('');
    try {
      const d = await paymentsAPI.initiate({ bookingId, paymentMethod: method });
      setPaymentId(d.data.paymentId);
      setStep('confirm');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally { setBusy(false); }
  };

  const handleConfirm = async () => {
    setBusy(true); setStep('processing');
    try {
      await paymentsAPI.confirm(paymentId);
      addToast('Payment successful! Booking confirmed.', 'success');
      navigate(`/booking/confirmation/${bookingId}`);
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
      setStep('confirm');
    } finally { setBusy(false); }
  };

  if (loading) return <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  const checkIn = booking ? new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const checkOut = booking ? new Date(booking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', background: '#f8f9fa' }} id="payment-page">
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#1a1a1a,#2d2d2d)', padding: '28px 32px', color: 'white' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>🔒 Secure Payment</h1>
          <p style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>Encrypted & secured by SSL</p>
        </div>

        <div style={{ padding: 32 }}>
          {/* Booking summary */}
          {booking && (
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booking Summary</div>
              {[
                ['Hotel', booking.hotel?.name],
                ['Dates', `${checkIn} → ${checkOut}`],
                ['Nights', booking.totalNights],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#737373' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: '#ef4444' }}>₹{booking.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {error && <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 20 }} role="alert">⚠️ {error}</div>}

          {step === 'select' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Choose Payment Method</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {METHODS.map((m) => (
                  <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: `2px solid ${method === m.value ? '#ef4444' : '#e5e5e5'}`, borderRadius: 10, cursor: 'pointer', background: method === m.value ? '#fef2f2' : 'white', transition: 'all 0.2s' }}>
                    <input type="radio" name="pm" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} style={{ accentColor: '#ef4444' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: '#737373' }}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <button className="btn btn-red btn-xl" style={{ width: '100%', borderRadius: 10 }} onClick={handleInitiate} disabled={busy} id="btn-initiate-payment">
                {busy ? 'Initiating...' : `Pay ₹${booking?.totalAmount?.toLocaleString('en-IN')}`}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{method === 'upi' ? '📱' : method === 'netbanking' ? '🏦' : '💳'}</div>
                <p style={{ fontSize: 14, color: '#737373' }}>{method === 'test' ? 'Click Confirm to complete test payment.' : `Your ${method} page would open in production.`}</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" style={{ flex: 1, borderRadius: 10 }} onClick={() => { setStep('select'); setPaymentId(null); }} id="btn-payment-back">← Back</button>
                <button className="btn btn-red btn-xl" style={{ flex: 2, borderRadius: 10 }} onClick={handleConfirm} disabled={busy} id="btn-confirm-payment">{busy ? 'Processing...' : 'Confirm Payment ✓'}</button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <p style={{ color: '#737373' }}>Verifying payment, please wait…</p>
            </div>
          )}

          <p style={{ fontSize: 11, color: '#a3a3a3', textAlign: 'center', marginTop: 16 }}>🔒 256-bit SSL • PCI DSS Compliant</p>
        </div>
      </div>
    </div>
  );
}
