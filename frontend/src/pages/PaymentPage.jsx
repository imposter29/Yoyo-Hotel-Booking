import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentsAPI, bookingsAPI, dealsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const METHODS = [
  { value: 'card',       label: ' Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
  { value: 'upi',        label: ' UPI',                 desc: 'GPay, PhonePe, Paytm' },
  { value: 'netbanking', label: ' Net Banking',         desc: 'All major banks' },
];

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank',
  'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
];

//  Formatters 
function fmtCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

//  Shared style helpers 
const inputStyle = (err) => ({
  width: '100%', padding: '11px 14px', fontSize: 14,
  border: `1.5px solid ${err ? '#ef4444' : '#e5e5e5'}`, borderRadius: 8,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
});
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5, display: 'block' };
const errStyle   = { fontSize: 11, color: '#ef4444', marginTop: 3 };

//  Card Form 
function CardForm({ onValid }) {
  const [f, setF] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [t, setT] = useState({});

  const validate = (data) => {
    const e = {};
    if (!data.name.trim()) e.name = 'Name is required';
    if (data.number.replace(/\s/g, '').length < 16) e.number = 'Enter a valid 16-digit card number';
    const [mm, yy] = data.expiry.split('/');
    if (!mm || !yy || +mm > 12 || +mm < 1) e.expiry = 'Invalid expiry (MM/YY)';
    if (data.cvv.length < 3) e.cvv = 'CVV must be 3–4 digits';
    return e;
  };

  const touch = (k) => setT(p => ({ ...p, [k]: true }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const all = { name: true, number: true, expiry: true, cvv: true };
    setT(all);
    const errs = validate(f);
    if (!Object.keys(errs).length) onValid();
  };

  const errs = validate(f);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Name on Card</label>
        <input style={inputStyle(t.name && errs.name)} placeholder="Rithwik Kumar"
          value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))}
          onBlur={() => touch('name')} />
        {t.name && errs.name && <div style={errStyle}>{errs.name}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Card Number</label>
        <input style={inputStyle(t.number && errs.number)} placeholder="1234 5678 9012 3456"
          value={f.number} maxLength={19}
          onChange={e => setF(p => ({ ...p, number: fmtCard(e.target.value) }))}
          onBlur={() => touch('number')} />
        {t.number && errs.number && <div style={errStyle}>{errs.number}</div>}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Expiry Date</label>
          <input style={inputStyle(t.expiry && errs.expiry)} placeholder="MM/YY"
            value={f.expiry} maxLength={5}
            onChange={e => setF(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
            onBlur={() => touch('expiry')} />
          {t.expiry && errs.expiry && <div style={errStyle}>{errs.expiry}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>CVV</label>
          <input style={inputStyle(t.cvv && errs.cvv)} placeholder="•••" type="password"
            value={f.cvv} maxLength={4}
            onChange={e => setF(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            onBlur={() => touch('cvv')} />
          {t.cvv && errs.cvv && <div style={errStyle}>{errs.cvv}</div>}
        </div>
      </div>
      <button type="submit" className="btn btn-red btn-xl" style={{ width: '100%', borderRadius: 10 }}
        id="btn-card-confirm">
        Confirm Payment 
      </button>
    </form>
  );
}

//  UPI Form 
function UpiForm({ onValid }) {
  const [upiId, setUpiId] = useState('');
  const [touched, setTouched] = useState(false);
  const isValid = /^[\w.\-]+@[\w]+$/.test(upiId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (isValid) onValid();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>UPI ID</label>
        <input style={inputStyle(touched && !isValid)} placeholder="yourname@upi"
          value={upiId} onChange={e => setUpiId(e.target.value)}
          onBlur={() => setTouched(true)} />
        {touched && !isValid && <div style={errStyle}>Enter a valid UPI ID (e.g. name@upi)</div>}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['gpay', 'phonepe', 'paytm', 'ybl', 'okhdfcbank'].map(s => (
            <span key={s}
              onClick={() => { setUpiId(`yourname@${s}`); setTouched(false); }}
              style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #e5e5e5',
                borderRadius: 20, cursor: 'pointer', background: '#f5f5f5',
                color: '#555', userSelect: 'none' }}>
              @{s}
            </span>
          ))}
        </div>
      </div>
      <button type="submit" className="btn btn-red btn-xl" style={{ width: '100%', borderRadius: 10 }}
        id="btn-upi-confirm">
        Confirm Payment 
      </button>
    </form>
  );
}

//  Net Banking Form 
function NetBankingForm({ onValid }) {
  const [bank, setBank] = useState('');
  const [touched, setTouched] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (bank) onValid();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Select Your Bank</label>
        <select style={{ ...inputStyle(touched && !bank), background: 'white' }}
          value={bank} onChange={e => setBank(e.target.value)}
          onBlur={() => setTouched(true)}>
          <option value="">-- Choose bank --</option>
          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {touched && !bank && <div style={errStyle}>Please select a bank</div>}
        {bank && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#737373', background: '#f0fdf4',
            border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px' }}>
             You will be securely redirected to <strong>{bank}</strong>'s portal.
          </div>
        )}
      </div>
      <button type="submit" className="btn btn-red btn-xl" style={{ width: '100%', borderRadius: 10 }}
        id="btn-netbanking-confirm">
        Proceed to Bank 
      </button>
    </form>
  );
}

//  Main Page 
export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [booking, setBooking]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [method, setMethod]     = useState('card');
  const [busy, setBusy]         = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [step, setStep]         = useState('select'); // select | form | processing
  const [error, setError]       = useState('');

  // Coupon state
  const [coupon, setCoupon]       = useState('');
  const [appliedDeal, setAppliedDeal] = useState(null);
  const [applying, setApplying]   = useState(false);

  // Available deals list
  const [availableDeals, setAvailableDeals] = useState([]);
  const [loadingDeals, setLoadingDeals]   = useState(true);

  useEffect(() => {
    bookingsAPI.getById(bookingId)
      .then(d => {
        const b = d.data?.booking;
        setBooking(b);
        // If booking already has a discount applied (e.g. from a previous attempt)
        if (b?.discountAmount) {
          setAppliedDeal({ code: 'APPLIED', discount: 0, discountAmount: b.discountAmount });
        }
      })
      .catch(() => setError('Could not load booking.'))
      .finally(() => setLoading(false));

    // Fetch available deals
    dealsAPI.getAll()
      .then(d => setAvailableDeals(d.data?.deals || []))
      .catch(() => {})
      .finally(() => setLoadingDeals(false));
  }, [bookingId]);

  const handleApplyCoupon = async () => {
    if (!coupon) return;
    setApplying(true);
    try {
      const res = await bookingsAPI.applyCoupon(bookingId, coupon);
      setAppliedDeal({
        code: res.data.couponCode,
        discountAmount: res.data.discountAmount
      });
      // Update local booking state to reflect the new totalAmount
      setBooking(prev => ({ ...prev, totalAmount: res.data.totalAmount, discountAmount: res.data.discountAmount, couponCode: res.data.couponCode }));
      addToast(`Coupon "${res.data.couponCode}" applied!`, 'success');
    } catch (err) {
      addToast(err.message || 'Invalid coupon', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setApplying(true);
    try {
      const res = await bookingsAPI.applyCoupon(bookingId, '');
      setAppliedDeal(null);
      setCoupon('');
      setBooking(prev => ({ ...prev, totalAmount: res.data.totalAmount, discountAmount: 0, couponCode: null }));
      addToast('Coupon removed.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to remove coupon', 'error');
    } finally {
      setApplying(false);
    }
  };

  // Step 1: initiate payment (creates payment record)
  const handleInitiate = async () => {
    setBusy(true); setError('');
    try {
      const d = await paymentsAPI.initiate({ 
        bookingId, 
        paymentMethod: method,
        dealCode: appliedDeal?.code 
      });
      setPaymentId(d.data.paymentId);
      setStep('form');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally { setBusy(false); }
  };

  // Step 2: called by each form when fields are valid
  const handleFormValid = async () => {
    setBusy(true); setStep('processing');
    try {
      await paymentsAPI.confirm(paymentId);
      addToast('Payment successful! Booking confirmed. ', 'success');
      navigate(`/booking/confirmation/${bookingId}`);
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
      setStep('form');
    } finally { setBusy(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  const checkIn  = booking ? new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const checkOut = booking ? new Date(booking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const originalTotal = booking?.items?.reduce((acc, item) => acc + item.totalPrice, 0) || booking?.totalAmount || 0;
  const discountVal  = appliedDeal ? (appliedDeal.discountAmount || (originalTotal * appliedDeal.discount / 100)) : 0;
  const finalTotal    = originalTotal - discountVal;

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px', background: '#f8f9fa' }} id="payment-page">
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 540,
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a1a,#2d2d2d)', padding: '28px 32px', color: 'white' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}> Secure Payment</h1>
          <p style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>Encrypted &amp; secured by SSL</p>
        </div>

        <div style={{ padding: 32 }}>
          {/* Booking summary (always shown) */}
          {booking && (
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 12,
                textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booking Summary</div>
              {[
                ['Hotel',   booking.hotel?.name],
                ['Dates',   `${checkIn} → ${checkOut}`],
                ['Nights',  booking.totalNights],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#737373' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}

              {appliedDeal && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#16a34a', fontWeight: 600 }}>
                  <span>Discount ({appliedDeal.code})</span>
                  <span>-₹{discountVal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: '#ef4444' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Coupon Section */}
          {step === 'select' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ ...labelStyle, color: '#737373' }}>Have a Promo Code?</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input 
                  style={{ ...inputStyle(), flex: 1, textTransform: 'uppercase' }} 
                  placeholder="ENTER CODE"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  disabled={appliedDeal}
                />
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0 20px', borderRadius: 8, fontSize: 13, height: 42 }}
                  onClick={appliedDeal ? handleRemoveCoupon : handleApplyCoupon}
                  disabled={applying || (!coupon && !appliedDeal)}
                >
                  {applying ? '...' : appliedDeal ? 'Remove' : 'Apply'}
                </button>
              </div>

              {/* Available Deals List */}
              {!appliedDeal && availableDeals.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#a3a3a3', marginBottom: 10, textTransform: 'uppercase' }}>Available Offers</div>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                    {availableDeals.map(d => (
                      <div 
                        key={d._id}
                        onClick={() => { setCoupon(d.code); }}
                        style={{ 
                          flexShrink: 0, width: 200, padding: 12, borderRadius: 10, 
                          background: d.bgColor || '#f8f9fa', border: '1.5px dashed #e5e5e5',
                          cursor: 'pointer', transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{d.title}</div>
                        <div style={{ fontSize: 11, color: '#737373', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.subtitle}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>{d.code}</span>
                          <span style={{ fontSize: 10, background: 'white', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{d.discount}% OFF</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8,
              padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 20 }} role="alert">
               {error}
            </div>
          )}

          {/*  Step 1: Choose method  */}
          {step === 'select' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Choose Payment Method</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {METHODS.map(m => (
                  <label key={m.value} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    border: `2px solid ${method === m.value ? '#ef4444' : '#e5e5e5'}`,
                    borderRadius: 10, cursor: 'pointer',
                    background: method === m.value ? '#fef2f2' : 'white',
                    transition: 'all 0.2s',
                  }}>
                    <input type="radio" name="pm" value={m.value}
                      checked={method === m.value}
                      onChange={() => setMethod(m.value)}
                      style={{ accentColor: '#ef4444' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: '#737373' }}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <button className="btn btn-red btn-xl" style={{ width: '100%', borderRadius: 10 }}
                onClick={handleInitiate} disabled={busy} id="btn-initiate-payment">
                {busy ? 'Initiating...' : `Pay ₹${finalTotal.toLocaleString('en-IN')}`}
              </button>
            </>
          )}

          {/*  Step 2: Payment form  */}
          {step === 'form' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button onClick={() => { setStep('select'); setPaymentId(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 0 }}>
                  ←
                </button>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {METHODS.find(m => m.value === method)?.label}
                </div>
              </div>

              {method === 'card'       && <CardForm       onValid={handleFormValid} />}
              {method === 'upi'        && <UpiForm        onValid={handleFormValid} />}
              {method === 'netbanking' && <NetBankingForm onValid={handleFormValid} />}
            </>
          )}

          {/*  Step 3: Processing  */}
          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <p style={{ color: '#737373' }}>Verifying payment, please wait…</p>
            </div>
          )}

          <p style={{ fontSize: 11, color: '#a3a3a3', textAlign: 'center', marginTop: 20 }}>
             256-bit SSL • PCI DSS Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
