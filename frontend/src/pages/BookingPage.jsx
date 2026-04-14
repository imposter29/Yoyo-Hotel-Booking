import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingsAPI, roomTypesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Mini Calendar (same as HomePage) ────────────────────────────────────────
const MONTHS_B = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LBL  = ['Su','Mo','Tu','We','Th','Fr','Sa'];
function fmtB(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function BookingMiniCal({ value, minISO, onChange, onClose }) {
  const init = value ? new Date(value + 'T00:00:00') : new Date();
  const [yr, setYr] = useState(init.getFullYear());
  const [mo, setMo] = useState(init.getMonth());
  const pMo = () => { if (mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1); };
  const nMo = () => { if (mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1); };
  const first = new Date(yr, mo, 1).getDay();
  const dim   = new Date(yr, mo+1, 0).getDate();
  const cells = Array(first).fill(null).concat(Array.from({length:dim},(_,i)=>i+1));
  const isoOf = d => `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return (
    <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, background:'white', borderRadius:14,
      boxShadow:'0 12px 40px rgba(0,0,0,0.18)', padding:16, zIndex:2000, width:280, animation:'fadeDown 0.15s ease' }}
      onClick={e=>e.stopPropagation()}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <button type="button" onClick={pMo} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', padding:'2px 8px', borderRadius:6 }}>‹</button>
        <span style={{ fontWeight:700, fontSize:14 }}>{MONTHS_B[mo]} {yr}</span>
        <button type="button" onClick={nMo} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', padding:'2px 8px', borderRadius:6 }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {DAY_LBL.map(d=><span key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'#a3a3a3', padding:'4px 0' }}>{d}</span>)}
        {cells.map((d,i)=>{
          if(!d) return <span key={`e${i}`}/>;
          const iso=isoOf(d), disabled=minISO&&iso<minISO, selected=iso===value;
          return <button key={iso} type="button" disabled={disabled}
            onClick={()=>{onChange(iso);onClose();}}
            style={{ background:selected?'#ef4444':'none', color:disabled?'#d4d4d4':selected?'white':'#0f0f0f',
              border:'none', borderRadius:6, fontSize:13, fontWeight:selected?700:500,
              padding:'6px 4px', cursor:disabled?'not-allowed':'pointer', textAlign:'center', fontFamily:'inherit' }}>{d}</button>;
        })}
      </div>
    </div>
  );
}
function BookingDateField({ id, label, value, minISO, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[]);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#737373', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }} htmlFor={id}>{label}</label>
      <button type="button" id={id}
        onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', textAlign:'left', background:'white', border:'1.5px solid #e5e5e5',
          borderRadius:8, padding:'10px 14px', fontSize:14, fontWeight:600, color:'#0f0f0f',
          cursor:'pointer', fontFamily:'inherit', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        {fmtB(value)}
        <span style={{ fontSize:16, color:'#a3a3a3' }}>📅</span>
      </button>
      {open && <BookingMiniCal value={value} minISO={minISO} onChange={onChange} onClose={()=>setOpen(false)} />}
    </div>
  );
}

export default function BookingPage() {
  const { roomTypeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const fmt = (d) => d.toISOString().split('T')[0];

  const [form, setForm] = useState({
    checkIn: fmt(today),
    checkOut: fmt(tomorrow),
    guestCount: 1,
    guestRequests: '',
  });

  const [roomType, setRoomType] = useState(null);
  const [priceQuote, setPriceQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load room type info
  useEffect(() => {
    roomTypesAPI.getById(roomTypeId)
      .then((d) => setRoomType(d.data?.roomType || null))
      .catch(() => setError('Could not load room information.'));
  }, [roomTypeId]);

  // Re-check price when dates change
  useEffect(() => {
    if (!form.checkIn || !form.checkOut || form.checkIn >= form.checkOut) return;
    setQuoteLoading(true);
    setPriceQuote(null);
    bookingsAPI.checkAvailability({
      roomTypeId,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guestCount: Number(form.guestCount),
    })
      .then((d) => setPriceQuote(d.available ? d.data?.pricing : null))
      .catch(() => setPriceQuote(null))
      .finally(() => setQuoteLoading(false));
  }, [roomTypeId, form.checkIn, form.checkOut, form.guestCount]);

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const nights = Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000));
  const displayPrice = priceQuote?.totalPrice || (roomType?.baseRatePerNight || 999) * nights;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await bookingsAPI.create({
        roomTypeId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guestCount: Number(form.guestCount),
        guestRequests: form.guestRequests,
      });
      const bookingId = data.data?.booking?._id;
      navigate(`/payment/${bookingId}`);
    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', background: '#f8f9fa' }} id="booking-page">
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 520, boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to={-1} style={{ color: '#737373', fontSize: 20 }} aria-label="Go back">←</Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f0f0f' }}>Complete Your Booking</h1>
            {roomType && <p style={{ fontSize: 13, color: '#737373', marginTop: 2 }}>{roomType.name} — {roomType.hotel?.name}</p>}
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 20 }} role="alert">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-label="Booking form">
          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <BookingDateField
              id="book-checkin"
              label="Check-in"
              value={form.checkIn}
              minISO={fmt(today)}
              onChange={val => {
                setForm(f => ({
                  ...f,
                  checkIn: val,
                  checkOut: f.checkOut <= val
                    ? (() => { const d = new Date(val+'T00:00:00'); d.setDate(d.getDate()+1); return fmt(d); })()
                    : f.checkOut
                }));
              }}
            />
            <BookingDateField
              id="book-checkout"
              label="Check-out"
              value={form.checkOut}
              minISO={form.checkIn}
              onChange={val => setForm(f => ({ ...f, checkOut: val }))}
            />
          </div>

          {/* Guests */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }} htmlFor="book-guests">Guests</label>
            <input id="book-guests" type="number" className="form-input" min={1} max={roomType?.maxOccupancy || 10} value={form.guestCount} onChange={handleChange('guestCount')} required />
            {roomType?.maxOccupancy && <p style={{ fontSize: 12, color: '#a3a3a3', marginTop: 4 }}>Max {roomType.maxOccupancy} guests for this room type</p>}
          </div>

          {/* Special Requests */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }} htmlFor="book-requests">Special Requests (optional)</label>
            <textarea
              id="book-requests"
              className="form-input"
              placeholder="Late check-in, extra pillows, dietary requirements..."
              value={form.guestRequests}
              onChange={handleChange('guestRequests')}
              rows={3}
              maxLength={500}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Price Summary */}
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#404040', marginBottom: 12 }}>Price Summary</div>
            {quoteLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#737373', fontSize: 13 }}>
                <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#737373', marginBottom: 8 }}>
                  <span>
                    ₹{(priceQuote?.pricePerNight || roomType?.baseRatePerNight || 999).toLocaleString('en-IN')}
                    {priceQuote && priceQuote.pricePerNight !== roomType?.baseRatePerNight && (
                      <span style={{ marginLeft: 6, textDecoration: 'line-through', color: '#a3a3a3' }}>₹{roomType?.baseRatePerNight?.toLocaleString('en-IN')}</span>
                    )}
                    {' '}× {nights} night{nights > 1 ? 's' : ''}
                  </span>
                  <span>₹{displayPrice.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#737373', marginBottom: 8 }}>
                  <span>Taxes & fees</span>
                  <span>Included</span>
                </div>
                {priceQuote?.breakdown && (
                  <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 8 }}>
                    {priceQuote.breakdown.seasonMultiplier > 1 && <span>Seasonal rate applied • </span>}
                    {priceQuote.breakdown.demandMultiplier > 1 && <span>High demand pricing • </span>}
                    {priceQuote.breakdown.lengthOfStayDiscount < 1 && <span>Long-stay discount applied</span>}
                  </div>
                )}
                <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#0f0f0f' }}>
                  <span>Total</span>
                  <span>₹{displayPrice.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}
          </div>

          <button type="submit" className="btn btn-red btn-xl" id="booking-submit-btn" disabled={loading || quoteLoading} style={{ width: '100%', borderRadius: 10 }}>
            {loading ? 'Creating booking...' : `Continue to Payment — ₹${displayPrice.toLocaleString('en-IN')}`}
          </button>
        </form>
        <p style={{ fontSize: 12, color: '#a3a3a3', textAlign: 'center', marginTop: 12 }}>
          Free cancellation available • No hidden fees
        </p>
      </div>
    </div>
  );
}
