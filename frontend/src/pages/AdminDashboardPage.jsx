import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { adminAPI, hotelsAPI, dealsAPI, listingAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

//  Shared helpers 
const STATUS_CONFIG = {
  confirmed: 'badge-green', hold: 'badge-gray', cancelled: 'badge-red',
  checked_in: 'badge-green', checked_out: 'badge-gray', expired: 'badge-red',
};

function StatCard({ icon, label, value, sub, color = '#ef4444' }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 14, color: '#737373', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#a3a3a3', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function AdminTable({ headers, rows, emptyMsg = 'No data' }) {
  if (!rows?.length) return <p style={{ color: '#a3a3a3', padding: '20px 0' }}>{emptyMsg}</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
            {headers.map((h) => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#737373', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '12px', verticalAlign: 'middle' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminCard({ children }) {
  return <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>{children}</div>;
}

//  Analytics 
function AnalyticsView() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnalytics().then((d) => setData(d.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#737373' }}>Loading analytics…</div>;

  const ov = data?.overview || {};
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Analytics Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {user?.role === 'superadmin' && (
          <StatCard icon="" label="Total Users" value={ov.totalUsers} color="#3b82f6" />
        )}
        <StatCard icon="" label="Active Hotels" value={ov.totalHotels} color="#8b5cf6" />
        <StatCard icon="" label="Total Bookings" value={ov.totalBookings} color="#ef4444" />
        <StatCard icon="" label="Total Revenue" value={`₹${(ov.totalRevenue || 0).toLocaleString('en-IN')}`} color="#16a34a" />
        <StatCard icon="" label="Confirmed" value={ov.confirmedBookings} color="#16a34a" />
        <StatCard icon="" label="Conversion Rate" value={ov.conversionRate} color="#f59e0b" />
      </div>

      {data?.topHotels?.length > 0 && (
        <AdminCard>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}> Top Hotels by Revenue</h3>
          <AdminTable
            headers={['Hotel', 'Bookings', 'Revenue']}
            rows={data.topHotels.map((h) => [
              h.hotelName,
              h.bookingCount,
              `₹${h.revenue?.toLocaleString('en-IN')}`,
            ])}
          />
        </AdminCard>
      )}

      {data?.recentBookings?.length > 0 && (
        <AdminCard>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}> Recent Bookings</h3>
          <AdminTable
            headers={['Guest', 'Hotel', 'Status', 'Amount', 'Date']}
            rows={data.recentBookings.map((b) => [
              `${b.guest?.firstName} ${b.guest?.lastName}`,
              b.hotel?.name,
              <span className={`badge ${STATUS_CONFIG[b.status] || 'badge-gray'}`}>{b.status}</span>,
              `₹${b.totalAmount?.toLocaleString('en-IN')}`,
              new Date(b.createdAt).toLocaleDateString('en-IN'),
            ])}
          />
        </AdminCard>
      )}
    </div>
  );
}

//  Bookings 
function BookingsView() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    setLoading(true);
    const p = { page, limit: 15 };
    if (statusFilter) p.status = statusFilter;
    adminAPI.getAllBookings(p)
      .then((d) => { setBookings(d.data?.bookings || []); setTotal(d.total || 0); setPages(d.pages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminAPI.updateBookingStatus(id, newStatus);
      setBookings((bs) => bs.map((b) => b._id === id ? { ...b, status: newStatus } : b));
      addToast('Booking status updated.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>All Bookings <span style={{ fontSize: 14, color: '#737373', fontWeight: 400 }}>({total})</span></h2>
        <select className="form-input" style={{ width: 160 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {['hold', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <AdminCard>
        {loading ? <p style={{ color: '#a3a3a3' }}>Loading…</p> : (
          <AdminTable
            headers={['Ref', 'Guest', 'Hotel', 'Dates', 'Amount', 'Status', 'Action']}
            emptyMsg="No bookings found."
            rows={bookings.map((b) => [
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>YY-{b._id?.slice(-8).toUpperCase()}</span>,
              `${b.guest?.firstName} ${b.guest?.lastName}`,
              b.hotel?.name,
              `${new Date(b.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(b.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
              `₹${b.totalAmount?.toLocaleString('en-IN')}`,
              <span className={`badge ${STATUS_CONFIG[b.status] || 'badge-gray'}`}>{b.status}</span>,
              <select style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e5e5e5', borderRadius: 6 }}
                value={b.status}
                onChange={(e) => handleStatusChange(b._id, e.target.value)}
              >
                {['hold', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>,
            ])}
          />
        )}
        {pages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page} / {pages}</span>
            <button className="btn btn-outline btn-sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

//  Hotels 
const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];
const AMENITY_OPTIONS = ['wifi','ac','parking','pool','gym','spa','restaurant','bar','elevator','laundry','roomService','conferenceRoom'];
const EMPTY_HOTEL_FORM = {
  name:'', city:'', state:'', street:'', country:'India', postalCode:'',
  contactEmail:'', contactPhone:'',
  starRating:3, description:'', pricePerNight:'',
  maxOccupancy:2, totalRooms:5, inventoryDays:90,
  checkInTime:'14:00', checkOutTime:'11:00',
  petFriendly:false, smokingAllowed:false, amenities:[],
};

function HotelsView() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomEdits, setRoomEdits] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_HOTEL_FORM);
  const [creating, setCreating] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState(null);
  const [cityFilter, setCityFilter] = useState('');
  const { addToast } = useToast();

  const [pending, setPending] = useState([]);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadHotels = () => {
    setLoading(true);
    const requests = [adminAPI.getHotels({ limit: 10000 })];
    if (isSuperAdmin) {
      requests.push(adminAPI.getPendingHotels());
    } else {
      requests.push(Promise.resolve({ data: { hotels: [] } }));
    }

    Promise.all(requests).then(([d, pd]) => {
      const list = d.data?.hotels || [];
      setHotels(list);
      setPending(pd.data?.hotels || []);
      const init = {};
      list.forEach(h => { init[h._id] = { value: 5, saving: false }; });
      setRoomEdits(init);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadHotels(); }, []);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleAmenity = (a) => setForm(f => ({
    ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
  }));

  const handlePostalCodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setF('postalCode', val);
    if (val.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success') {
          const po = data[0].PostOffice[0];
          setForm(f => ({ ...f, postalCode: val, city: po.District, state: po.State }));
          addToast('City and state autofilled based on postal code.', 'success');
        }
      } catch (err) { /* ignore */ }
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 15);
    setF('contactPhone', val);
  };

  const toggleActive = async (hotel) => {
    try {
      await hotelsAPI.update(hotel._id, { isActive: !hotel.isActive });
      setHotels(hs => hs.map(h => h._id === hotel._id ? { ...h, isActive: !h.isActive } : h));
      addToast(`Hotel ${hotel.isActive ? 'deactivated' : 'activated'}.`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleRoomSave = async (hotel) => {
    const edit = roomEdits[hotel._id];
    const newTotal = parseInt(edit?.value, 10);
    if (isNaN(newTotal) || newTotal < 1 || newTotal > 500) { addToast('Enter 1-500.', 'error'); return; }
    setRoomEdits(prev => ({ ...prev, [hotel._id]: { ...prev[hotel._id], saving: true } }));
    try {
      const res = await adminAPI.updateHotelRooms(hotel._id, newTotal);
      addToast(`Rooms updated to ${newTotal}. (${res.data.inventoryEntriesUpdated} entries)`, 'success');
    } catch (err) { addToast(err.message || 'Failed.', 'error'); }
    finally { setRoomEdits(prev => ({ ...prev, [hotel._id]: { ...prev[hotel._id], saving: false } })); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.city) { addToast('Name and city are required.', 'error'); return; }
    if (!editingHotelId && !form.pricePerNight) { addToast('Price per night is required for new hotels.', 'error'); return; }
    setCreating(true);
    try {
      if (editingHotelId) {
        await hotelsAPI.update(editingHotelId, {
          name: form.name,
          description: form.description,
          address: { street: form.street, city: form.city, state: form.state, country: form.country, postalCode: form.postalCode },
          starRating: form.starRating,
          amenities: form.amenities,
          policies: { checkInTime: form.checkInTime, checkOutTime: form.checkOutTime, petFriendly: form.petFriendly, smokingAllowed: form.smokingAllowed }
        });
        addToast('Hotel updated successfully.', 'success');
      } else {
        if (isSuperAdmin) {
          const res = await adminAPI.createHotel({ ...form, pricePerNight: Number(form.pricePerNight) });
          addToast(`Hotel ${res.data.hotel.name} created!`, 'success');
        } else {
          const res = await listingAPI.submit({ ...form, pricePerNight: Number(form.pricePerNight) });
          addToast(res.message || 'Hotel submitted for approval!', 'success');
        }
      }
      setShowCreate(false); setEditingHotelId(null); setForm(EMPTY_HOTEL_FORM); loadHotels();
    } catch (err) { addToast(err.message || 'Failed.', 'error'); }
    finally { setCreating(false); }
  };

  const handleEditClick = (h) => {
    setEditingHotelId(h._id);
    setForm({
      name: h.name, city: h.address?.city || '', state: h.address?.state || '',
      street: h.address?.street || '', country: h.address?.country || 'India',
      postalCode: h.address?.postalCode || '', starRating: h.starRating || 3,
      description: h.description || '', pricePerNight: '', maxOccupancy: 2,
      totalRooms: 5, inventoryDays: 90, checkInTime: h.policies?.checkInTime || '14:00',
      checkOutTime: h.policies?.checkOutTime || '11:00', petFriendly: h.policies?.petFriendly || false,
      smokingAllowed: h.policies?.smokingAllowed || false, amenities: h.amenities || [],
    });
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fLabel = { fontSize:12, fontWeight:600, color:'#737373', display:'block', marginBottom:4 };
  const cities = [...new Set(hotels.map(h => h.address?.city).filter(Boolean))].sort();
  const filteredHotels = hotels.filter(h => !cityFilter || h.address?.city === cityFilter);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:800 }}>
          Manage Hotels <span style={{ fontSize:14, color:'#737373', fontWeight:400 }}>({filteredHotels.length})</span>
        </h2>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <select className="form-input" style={{ width: 160, padding: '6px 12px', minHeight: '36px' }} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-red btn-sm" id="btn-create-hotel"
            onClick={() => { setShowCreate(v => !v); setEditingHotelId(null); setForm(EMPTY_HOTEL_FORM); }}
            style={{ display:'flex', alignItems:'center', gap:6 }}>
            {showCreate ? 'x Cancel' : '+ Add Hotel'}
          </button>
        </div>
      </div>

      {/*  Pending Approvals  */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:'#b45309', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'#fef3c7', color:'#b45309', borderRadius:20, padding:'2px 10px', fontSize:12 }}>{pending.length}</span>
            Pending Approval
          </h3>
          <AdminCard>
            <AdminTable
              headers={['Hotel', 'City', 'Stars', 'Submitted By', 'Submitted', 'Actions']}
              emptyMsg=""
              rows={pending.map(h => [
                <span style={{ fontWeight:600, fontSize:13 }}>{h.name}</span>,
                h.address?.city,
                '★'.repeat(h.starRating || 3),
                h.managedBy ? h.managedBy.firstName + ' ' + h.managedBy.lastName + ' (' + h.managedBy.email + ')' : '-',
                new Date(h.createdAt).toLocaleDateString(),
                <div style={{ display:'flex', gap:8 }}>
                  <button style={{ padding:'4px 12px', fontSize:12, fontWeight:700, background:'#16a34a', color:'white', border:'none', borderRadius:6, cursor:'pointer' }}
                    onClick={async () => {
                      try {
                        await adminAPI.approveHotel(h._id);
                        addToast('Hotel approved and now live!', 'success');
                        loadHotels();
                      } catch(err) { addToast(err.message, 'error'); }
                    }}>
                    Approve
                  </button>
                  <button style={{ padding:'4px 12px', fontSize:12, fontWeight:700, background:'#ef4444', color:'white', border:'none', borderRadius:6, cursor:'pointer' }}
                    onClick={() => { setRejectTarget(h._id); setRejectReason(''); }}>
                    Reject
                  </button>
                </div>,
              ])}
            />
          </AdminCard>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:16, padding:32, width:480, maxWidth:'90vw' }}>
            <h3 style={{ margin:'0 0 12px', fontSize:18, fontWeight:800 }}>Reject Listing</h3>
            <p style={{ fontSize:13, color:'#737373', margin:'0 0 16px' }}>Provide a reason so the hotel owner can improve their submission.</p>
            <textarea className="form-input" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete address, missing contact info…"
              style={{ resize:'vertical', marginBottom:16 }} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background:'#ef4444' }}
                onClick={async () => {
                  try {
                    await adminAPI.rejectHotel(rejectTarget, rejectReason || 'Does not meet requirements.');
                    addToast('Hotel listing rejected.', 'success');
                    setRejectTarget(null);
                    loadHotels();
                  } catch(err) { addToast(err.message, 'error'); }
                }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <AdminCard>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>{editingHotelId ? 'Edit Hotel Details' : 'Create New Hotel'}</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={fLabel}>Hotel Name *</label>
                <input className="form-input" placeholder="e.g. The Grand Mumbai" value={form.name}
                  onChange={e => setF('name', e.target.value)} required />
              </div>
              <div><label style={fLabel}>City *</label>
                <input className="form-input" value={form.city} onChange={e => setF('city', e.target.value)} required />
              </div>
              <div><label style={fLabel}>State *</label>
                <select className="form-input" value={form.state} onChange={e => setF('state', e.target.value)} required>
                  <option value="" disabled>Select State</option>
                  {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1 / -1' }}><label style={fLabel}>Street Address</label>
                <input className="form-input" value={form.street} onChange={e => setF('street', e.target.value)} />
              </div>
              <div><label style={fLabel}>Country</label>
                <input className="form-input" value={form.country} onChange={e => setF('country', e.target.value)} />
              </div>
              <div><label style={fLabel}>Postal Code</label>
                <input className="form-input" type="text" pattern="[0-9]{6}" value={form.postalCode} onChange={handlePostalCodeChange} />
              </div>
              <div><label style={fLabel}>Contact Email</label>
                <input className="form-input" type="email" value={form.contactEmail || ''} onChange={e => setF('contactEmail', e.target.value)} />
              </div>
              <div><label style={fLabel}>Contact Phone</label>
                <input className="form-input" type="tel" value={form.contactPhone || ''} onChange={handlePhoneChange} placeholder="e.g. 9876543210" />
              </div>
              <div style={{ gridColumn:'1 / -1' }}><label style={fLabel}>Description</label>
                <textarea className="form-input" rows={2} value={form.description}
                  onChange={e => setF('description', e.target.value)}
                  placeholder="Brief description..." style={{ resize:'vertical', minHeight:60 }} />
              </div>
              <div>
                <label style={fLabel}>Star Rating</label>
                <select className="form-input" value={form.starRating} onChange={e => setF('starRating', Number(e.target.value))}>
                  {[1,2,3,4,5].map(s => <option key={s} value={s}>{'★'.repeat(s)} {s} Star{s>1?'s':''}</option>)}
                </select>
              </div>
              {!editingHotelId && (
                <>
                  <div>
                    <label style={fLabel}>Price / Night (Rs.) *</label>
                    <input type="number" min={1} className="form-input" placeholder="e.g. 2500"
                      value={form.pricePerNight} onChange={e => setF('pricePerNight', e.target.value)} required />
                  </div>
                  <div>
                    <label style={fLabel}>Max Occupancy</label>
                    <input type="number" min={1} max={10} className="form-input" value={form.maxOccupancy}
                      onChange={e => setF('maxOccupancy', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={fLabel}>Total Rooms</label>
                    <input type="number" min={1} max={100} className="form-input" value={form.totalRooms}
                      onChange={e => setF('totalRooms', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={fLabel}>Inventory Days</label>
                    <input type="number" min={30} max={365} className="form-input" value={form.inventoryDays}
                      onChange={e => setF('inventoryDays', Number(e.target.value))} />
                  </div>
                </>
              )}
              <div><label style={fLabel}>Check-in Time</label>
                <input className="form-input" value={form.checkInTime} onChange={e => setF('checkInTime', e.target.value)} />
              </div>
              <div><label style={fLabel}>Check-out Time</label>
                <input className="form-input" value={form.checkOutTime} onChange={e => setF('checkOutTime', e.target.value)} />
              </div>
              <div>
                <label style={fLabel}>Policies</label>
                <div style={{ display:'flex', gap:16, paddingTop:10 }}>
                  {[['petFriendly','Pet Friendly'],['smokingAllowed','Smoking']].map(([k,l]) => (
                    <label key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
                      <input type="checkbox" checked={form[k]} onChange={e => setF(k, e.target.checked)} /> {l}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={fLabel}>Amenities</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingTop:4 }}>
                  {AMENITY_OPTIONS.map(a => {
                    const on = form.amenities.includes(a);
                    return (
                      <label key={a} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer',
                        padding:'4px 12px', borderRadius:20, userSelect:'none',
                        background: on ? '#fee2e2' : '#f5f5f5',
                        border: `1.5px solid ${on ? '#ef4444' : '#e5e5e5'}`,
                        color: on ? '#ef4444' : '#525252', fontWeight:500, transition:'all 0.15s' }}>
                        <input type="checkbox" style={{ display:'none' }} checked={on} onChange={() => toggleAmenity(a)} />
                        {a}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ gridColumn:'1 / -1', display:'flex', gap:10, justifyContent:'flex-end', paddingTop:12, borderTop:'1px solid #f0f0f0' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowCreate(false); setEditingHotelId(null); setForm(EMPTY_HOTEL_FORM); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="btn-submit-hotel" disabled={creating}>
                  {creating ? 'Saving...' : editingHotelId ? 'Update Hotel' : 'Create Hotel'}
                </button>
              </div>
            </div>
          </form>
        </AdminCard>
      )}

      <AdminCard>
        {loading ? <p style={{ color:'#a3a3a3' }}>Loading...</p> : (
          <AdminTable
            headers={['Hotel', 'City', 'Stars', 'Rating', 'Rooms', 'Status', 'Actions']}
            emptyMsg="No hotels yet. Click Add Hotel above!"
            rows={filteredHotels.map((h) => {
              const edit = roomEdits[h._id] || { value: 5, saving: false };
              return [
                <Link to={`/hotels/${h._id}`} style={{ fontWeight:600, color:'#0f0f0f', fontSize:13 }}>{h.name}</Link>,
                h.address?.city,
                '★'.repeat(h.starRating || 3),
                h.averageRating > 0 ? h.averageRating.toFixed(1) : '-',
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <input type="number" min={1} max={500} value={edit.value}
                    onChange={e => setRoomEdits(prev => ({ ...prev, [h._id]: { ...prev[h._id], value: e.target.value } }))}
                    style={{ width:60, padding:'4px 8px', border:'1.5px solid #e5e5e5', borderRadius:6, fontSize:13, fontWeight:600, textAlign:'center' }} />
                  <button onClick={() => handleRoomSave(h)} disabled={edit.saving}
                    style={{ padding:'4px 10px', fontSize:12, fontWeight:600, background:edit.saving?'#e5e5e5':'#16a34a', color:edit.saving?'#737373':'white', border:'none', borderRadius:6, cursor:edit.saving?'default':'pointer' }}>
                    {edit.saving ? '...' : 'Save'}
                  </button>
                </div>,
                <span className={`badge ${h.approvalStatus === 'pending' ? 'badge-gray' : h.isActive ? 'badge-green' : 'badge-red'}`}>
                  {h.approvalStatus === 'pending' ? 'Pending Approval' : h.isActive ? 'Active' : 'Inactive'}
                </span>,
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => handleEditClick(h)} style={{ fontSize:12 }}>Edit</button>
                  {h.approvalStatus !== 'pending' && (
                    <button className={`btn btn-sm ${h.isActive ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleActive(h)} style={{ fontSize:12 }}>
                      {h.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>,
              ];
            })}
          />
        )}
      </AdminCard>
    </div>
  );
}

//  Users 
function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    adminAPI.getUsers({ limit: 50 }).then((d) => setUsers(d.data?.users || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleActive = async (user) => {
    try {
      const data = await adminAPI.updateUser(user._id, { isActive: !user.isActive });
      setUsers((us) => us.map((u) => u._id === user._id ? data.data.user : u));
      addToast(`User ${user.isActive ? 'deactivated' : 'activated'}.`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const changeRole = async (user, role) => {
    try {
      const data = await adminAPI.updateUser(user._id, { role });
      setUsers((us) => us.map((u) => u._id === user._id ? data.data.user : u));
      addToast('Role updated.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Users</h2>
      <AdminCard>
        {loading ? <p style={{ color: '#a3a3a3' }}>Loading…</p> : (
          <AdminTable
            headers={['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions']}
            emptyMsg="No users found."
            rows={users.map((u) => [
              `${u.firstName} ${u.lastName}`,
              u.email,
              <select style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e5e5e5', borderRadius: 6 }}
                value={u.role}
                onChange={(e) => changeRole(u, e.target.value)}
              >
                {['guest', 'hotel_admin', 'superadmin'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>,
              <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>,
              new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              <button className={`btn btn-sm ${u.isActive ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleActive(u)} style={{ fontSize: 12 }}>
                {u.isActive ? 'Deactivate' : 'Activate'}
              </button>,
            ])}
          />
        )}
      </AdminCard>
    </div>
  );
}

//  Deals 
function DealsView() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', tag: '', discount: 0, type: 'custom', ctaUrl: '/hotels', expiresAt: '', bgColor: '#f8f9fa' });
  const { addToast } = useToast();

  useEffect(() => {
    dealsAPI.getAll().then((d) => setDeals(d.data?.deals || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await dealsAPI.create(form);
      setDeals((ds) => [data.data.deal, ...ds]);
      setShowForm(false);
      setForm({ title: '', subtitle: '', tag: '', discount: 0, type: 'custom', ctaUrl: '/hotels', expiresAt: '', bgColor: '#f8f9fa' });
      addToast('Deal created!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this deal?')) return;
    try {
      await dealsAPI.delete(id);
      setDeals((ds) => ds.filter((d) => d._id !== id));
      addToast('Deal deleted.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Deals & Offers</h2>
        <button className="btn btn-red btn-sm" onClick={() => setShowForm(!showForm)} id="btn-new-deal">
          {showForm ? ' Cancel' : '＋ New Deal'}
        </button>
      </div>

      {showForm && (
        <AdminCard>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Create New Deal</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[['title', 'Title *'], ['subtitle', 'Subtitle'], ['tag', 'Tag (e.g. WEEKEND DEAL)']].map(([k, l]) => (
              <div key={k} style={k === 'subtitle' ? { gridColumn: '1 / -1' } : {}}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', display: 'block', marginBottom: 4 }}>{l}</label>
                <input className="form-input" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} required={k === 'title'} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', display: 'block', marginBottom: 4 }}>Discount %</label>
              <input type="number" min={0} max={100} className="form-input" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', display: 'block', marginBottom: 4 }}>Expires At *</label>
              <input type="datetime-local" className="form-input" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', display: 'block', marginBottom: 4 }}>CTA URL</label>
              <input className="form-input" value={form.ctaUrl} onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', display: 'block', marginBottom: 4 }}>Background Color</label>
              <input type="color" className="form-input" style={{ height: 42, padding: 4 }} value={form.bgColor} onChange={(e) => setForm((f) => ({ ...f, bgColor: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary" id="btn-create-deal">Create Deal</button>
            </div>
          </form>
        </AdminCard>
      )}

      <AdminCard>
        {loading ? <p style={{ color: '#a3a3a3' }}>Loading…</p> : (
          <AdminTable
            headers={['Title', 'Tag', 'Discount', 'Expires', 'Action']}
            emptyMsg="No deals found. Create one above."
            rows={deals.map((d) => [
              <div><div style={{ fontWeight: 600 }}>{d.title}</div><div style={{ fontSize: 12, color: '#737373' }}>{d.subtitle}</div></div>,
              d.tag ? <span style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{d.tag}</span> : '—',
              d.discount > 0 ? <span className="badge badge-green">{d.discount}% off</span> : '—',
              new Date(d.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' }} onClick={() => handleDelete(d._id)}>Delete</button>,
            ])}
          />
        )}
      </AdminCard>
    </div>
  );
}

//  Nav 
const NAV_ITEMS = [
  { path: '/admin',           label: 'Analytics', icon: '' },
  { path: '/admin/bookings',  label: 'Bookings',  icon: '' },
  { path: '/admin/hotels',    label: 'Hotels',    icon: '' },
  { path: '/admin/users',     label: 'Users',     icon: '' },
  { path: '/admin/deals',     label: 'Deals',     icon: '' },
];

//  Main Dashboard shell 
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === 'superadmin';

  // Redirect /admin to /admin/analytics
  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/analytics', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }} id="admin-dashboard">
      {/* Admin Tab Bar */}
      <div style={{ borderBottom: '1px solid #e5e5e5', background: 'white', position: 'sticky', top: 60, zIndex: 10 }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {NAV_ITEMS.filter(item => isSuperAdmin || !['Users', 'Deals'].includes(item.label)).map((item) => {
              const active = item.path === '/admin'
                ? location.pathname === '/admin' || location.pathname === '/admin/analytics'
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  id={`admin-nav-${item.label.toLowerCase()}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '14px 20px', fontSize: 14, fontWeight: 600,
                    color: active ? '#ef4444' : '#737373',
                    borderBottom: `2px solid ${active ? '#ef4444' : 'transparent'}`,
                    whiteSpace: 'nowrap', transition: 'color 0.15s',
                    textDecoration: 'none',
                  }}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ flex: 1, paddingTop: 32, paddingBottom: 64 }}>
        <Routes>
          <Route index element={<AnalyticsView />} />
          <Route path="analytics" element={<AnalyticsView />} />
          <Route path="bookings"  element={<BookingsView />} />
          <Route path="hotels"    element={<HotelsView />} />
          <Route path="users"     element={isSuperAdmin ? <UsersView /> : <Navigate to="/admin" />} />
          <Route path="deals"     element={isSuperAdmin ? <DealsView /> : <Navigate to="/admin" />} />
        </Routes>
      </div>
    </div>
  );
}
