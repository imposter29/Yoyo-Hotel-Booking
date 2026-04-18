import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { citiesAPI } from '../services/api';
import Footer from '../components/common/Footer';
import './HomePage.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function toISO(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}
function fmtDisplay(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function MiniCalendar({ value, minISO, onChange, onClose }) {
  const init = value ? new Date(value + 'T00:00:00') : new Date();
  const [yr, setYr] = useState(init.getFullYear());
  const [mo, setMo] = useState(init.getMonth());

  const prevMo = () => { if (mo === 0) { setYr(y => y-1); setMo(11); } else setMo(m => m-1); };
  const nextMo = () => { if (mo === 11) { setYr(y => y+1); setMo(0); } else setMo(m => m+1); };

  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMo = new Date(yr, mo + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMo }, (_, i) => i + 1)
  );

  const isoOf = (d) => `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  return (
    <div className="mini-cal" onClick={e => e.stopPropagation()}>
      <div className="mini-cal-header">
        <button type="button" className="mini-cal-nav" onClick={prevMo}>‹</button>
        <span className="mini-cal-title">{MONTHS[mo]} {yr}</span>
        <button type="button" className="mini-cal-nav" onClick={nextMo}>›</button>
      </div>
      <div className="mini-cal-grid">
        {DAY_LABELS.map(d => <span key={d} className="mini-cal-day-label">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const iso = isoOf(d);
          const disabled = minISO && iso < minISO;
          const selected = iso === value;
          return (
            <button key={iso} type="button"
              className={`mini-cal-day${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
              disabled={disabled}
              onClick={() => { onChange(iso); onClose(); }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateField({ id, label, value, minISO, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="search-date-btn" id={id} onClick={() => setOpen(o => !o)}>
        <span className="date-label">{label}</span>
        <span className="date-value">{fmtDisplay(value)}</span>
      </button>
      {open && <MiniCalendar value={value} minISO={minISO} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

//  Search Bar 
function SearchBar() {
  const navigate = useNavigate();
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const [query,           setQuery]           = useState('');
  const [checkin,         setCheckin]         = useState(toISO(today));
  const [checkout,        setCheckout]        = useState(toISO(tomorrow));
  const [rooms,           setRooms]           = useState(1);
  const [guests,          setGuests]          = useState(1);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowGuestPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleCheckinChange = (val) => {
    setCheckin(val);
    if (checkout <= val) {
      const next = new Date(val + 'T00:00:00'); next.setDate(next.getDate() + 1);
      setCheckout(toISO(next));
    }
  };

  const [searchError, setSearchError] = useState('');

  const handleSearch = () => {
    if (!query.trim()) {
      setSearchError('Please enter a city, hotel, or neighborhood');
      document.getElementById('search-location-input')?.focus();
      return;
    }
    setSearchError('');
    const params = new URLSearchParams({ search: query.trim(), checkin, checkout, rooms, guests });
    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <div className="search-bar" role="search" id="main-search-bar">
      <div className="search-field search-field--location">
        <input
          type="text"
          placeholder="Search by city, hotel, or neighborhood"
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value.trim()) setSearchError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className={`search-input${searchError ? ' search-input--error' : ''}`}
          id="search-location-input"
          aria-label="Search location"
          aria-invalid={!!searchError}
        />
        {searchError && (
          <span style={{ position:'absolute', bottom:-22, left:0, fontSize:12, color:'#ef4444', fontWeight:600, whiteSpace:'nowrap' }}>
             {searchError}
          </span>
        )}
      </div>

      <div className="search-divider" />

      <div className="search-field search-field--dates">
        <DateField
          id="search-checkin"
          label="Check in"
          value={checkin}
          minISO={toISO(today)}
          onChange={handleCheckinChange}
        />
        <span className="date-arrow">→</span>
        <DateField
          id="search-checkout"
          label="Check out"
          value={checkout}
          minISO={checkin}
          onChange={setCheckout}
        />
      </div>

      <div className="search-divider" />

      <div className="search-field search-field--guests" ref={pickerRef}>
        <button
          className="search-guest-btn"
          onClick={() => setShowGuestPicker(o => !o)}
          id="search-guests-btn"
          aria-expanded={showGuestPicker}
          aria-haspopup="true"
        >
          {rooms} Room, {guests} Guest{guests > 1 ? 's' : ''}
        </button>
        {showGuestPicker && (
          <div className="guest-picker" role="dialog" aria-label="Room and guest selection">
            {[['Rooms', rooms, setRooms], ['Guests', guests, setGuests]].map(([label, val, setter]) => (
              <div key={label} className="guest-row">
                <span>{label}</span>
                <div className="counter-ctrl">
                  <button onClick={() => setter(v => Math.max(1, v - 1))} aria-label={`Decrease ${label}`}>−</button>
                  <span>{val}</span>
                  <button onClick={() => setter(v => Math.min(label === 'Rooms' ? 10 : 20, v + 1))} aria-label={`Increase ${label}`}>+</button>
                </div>
              </div>
            ))}
            <button className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>Done</button>
          </div>
        )}
      </div>

      <button
        className="search-submit-btn"
        onClick={handleSearch}
        id="search-submit-btn"
        aria-label="Search hotels"
        style={{ opacity: query.trim() ? 1 : 0.65 }}
      >
        Search
      </button>
    </div>
  );
}

//  City Pills 
function PopularCities() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);

  useEffect(() => {
    citiesAPI.getAll({ limit: 12 })
      .then(d => setCities(d.data?.cities || []))
      .catch(() => {});
  }, []);

  if (cities.length === 0) return null;

  const CITY_EMOJI = {
    Mumbai: '', Delhi: '', Bangalore: '', Goa: '', Jaipur: '',
    Chennai: '', Kolkata: '', Pune: '', Hyderabad: '', Kochi: '',
    Srinagar: '', Mysore: '', Dehradun: '', Pondicherry: '', Chandigarh: '',
  };

  return (
    <section className="popular-cities" id="popular-cities" aria-label="Popular destinations">
      <div className="container">
        <h2 className="section-title">Popular Destinations</h2>
        <div className="city-pills">
          {cities.map(({ city, hotelCount }) => (
            <button
              key={city}
              className="city-pill"
              onClick={() => navigate(`/hotels?city=${city}`)}
              id={`city-pill-${city.toLowerCase()}`}
            >
              <span className="city-pill-emoji">{CITY_EMOJI[city] || ''}</span>
              <span className="city-pill-name">{city}</span>
              <span className="city-pill-count">{hotelCount} hotels</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

//  HomePage 
export default function HomePage() {
  return (
    <main className="homepage" id="homepage">
      {/* Hero */}
      <section className="hero-section" id="hero-section" aria-label="Search hotels">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <h1 className="hero-title">
            Find your perfect stay
          </h1>
          <p className="hero-subtitle">Search hotels across India — real prices, instant booking.</p>
          <SearchBar />
        </div>
      </section>

      {/* Popular Cities */}
      <PopularCities />

      <Footer />
    </main>
  );
}
