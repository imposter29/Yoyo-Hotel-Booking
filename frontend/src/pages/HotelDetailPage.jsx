import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { hotelsAPI, roomTypesAPI, reviewsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Footer from '../components/common/Footer';
import './HotelDetailPage.css';

function StarRating({ count, interactive = false, value = 0, onChange }) {
  return (
    <div className="stars detail-stars" aria-label={`${count} star hotel`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`star${i < (interactive ? value : count) ? '' : ' empty'}`}
          onClick={() => interactive && onChange && onChange(i + 1)}
          style={interactive ? { cursor: 'pointer', fontSize: 20 } : {}}
        ></span>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const date = new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div style={{ background: 'white', border: '1.5px solid #e5e5e5', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{review.guest?.firstName} {review.guest?.lastName?.[0]}.</span>
          {review.isVerifiedStay && <span style={{ marginLeft: 8, fontSize: 11, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Verified Stay</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="stars" style={{ gap: 2 }}>
            {Array.from({ length: 5 }, (_, i) => <span key={i} className={`star${i < review.rating ? '' : ' empty'}`} style={{ fontSize: 12 }}></span>)}
          </div>
          <span style={{ fontSize: 12, color: '#a3a3a3' }}>{date}</span>
        </div>
      </div>
      {review.title && <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{review.title}</p>}
      <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.6 }}>{review.comment}</p>
    </div>
  );
}

function RoomTypeCard({ rt, onBook }) {
  const primaryImg = rt.images?.[0]?.url;
  return (
    <div style={{ border: '1.5px solid #e5e5e5', borderRadius: 14, overflow: 'hidden', display: 'flex', gap: 0, background: 'white', marginBottom: 16, transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ width: 160, flexShrink: 0, background: '#f5f5f5', position: 'relative' }}>
        {primaryImg
          ? <img src={primaryImg} alt={rt.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}></div>
        }
      </div>
      <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f0f0f' }}>{rt.name}</h3>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>₹{rt.baseRatePerNight?.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 12, color: '#a3a3a3' }}>per night</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#737373', marginBottom: 8 }}>
            <span> Max {rt.maxOccupancy} guests</span>
            {rt.bedConfiguration?.[0] && <span> {rt.bedConfiguration[0].count} {rt.bedConfiguration[0].bedType} bed</span>}
          </div>
          {rt.amenities?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {rt.amenities.slice(0, 4).map(a => (
                <span key={a} style={{ fontSize: 11, background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, color: '#525252' }}>{a}</span>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn btn-red btn-sm"
          style={{ marginTop: 12, alignSelf: 'flex-end' }}
          onClick={() => onBook(rt._id)}
          id={`btn-book-rt-${rt._id}`}
        >
          Book this room →
        </button>
      </div>
    </div>
  );
}

export default function HotelDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', comment: '', bookingId: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    Promise.all([
      hotelsAPI.getById(id),
      roomTypesAPI.getAll(id),
      reviewsAPI.getAll(id, { limit: 10 }),
    ])
      .then(([hotelData, rtData, rvData]) => {
        setHotel(hotelData.data?.hotel);
        setRoomTypes(rtData.data?.roomTypes || []);
        setReviews(rvData.data?.reviews || []);
      })
      .catch((err) => setError(err.message || 'Hotel not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = (roomTypeId) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/hotels/${id}` } } });
    } else {
      navigate(`/book/${roomTypeId}`);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating) { addToast('Please select a rating', 'error'); return; }
    setSubmittingReview(true);
    try {
      const data = await reviewsAPI.create(id, { ...reviewForm });
      setReviews((prev) => [data.data.review, ...prev]);
      setShowReviewForm(false);
      setReviewForm({ rating: 0, title: '', comment: '', bookingId: '' });
      addToast('Review submitted successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="detail-page">
      <div className="container" style={{ paddingTop: 32 }}>
        <div className="skeleton skeleton-img" style={{ height: 400, borderRadius: 16, marginBottom: 24 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton skeleton-text xl" style={{ width: '60%' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        </div>
      </div>
      <Footer />
    </div>
  );

  if (error || !hotel) return (
    <div className="detail-page">
      <div className="container detail-error" role="alert">
        <div style={{ fontSize: 64 }}></div>
        <h2>Hotel Not Found</h2>
        <p>{error}</p>
        <Link to="/hotels" className="btn btn-primary">Browse Hotels</Link>
      </div>
      <Footer />
    </div>
  );

  const images = hotel.images || [];
  const lowestPrice = roomTypes.length > 0
    ? Math.min(...roomTypes.map(rt => rt.baseRatePerNight))
    : null;

  return (
    <div className="detail-page" id={`hotel-detail-${hotel._id}`}>
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/" className="bc-link">Home</Link>
          <span className="bc-sep">›</span>
          <Link to="/hotels" className="bc-link">Hotels</Link>
          <span className="bc-sep">›</span>
          <span className="bc-current">{hotel.name}</span>
        </nav>

        {/* Image Gallery */}
        <div className="detail-gallery">
          <div className="gallery-main">
            {images.length > 0
              ? <img src={images[activeImg]?.url} alt={`${hotel.name} - photo ${activeImg + 1}`} className="gallery-main-img" />
              : <div className="gallery-placeholder" aria-label="No image"></div>
            }
          </div>
          {images.length > 1 && (
            <div className="gallery-thumbs" role="list">
              {images.map((img, i) => (
                <button key={i} className={`thumb${i === activeImg ? ' thumb--active' : ''}`} onClick={() => setActiveImg(i)} id={`gallery-thumb-${i}`} aria-label={`View photo ${i + 1}`}>
                  <img src={img.url} alt={img.caption || `Photo ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="detail-layout">
          {/* Left: Info */}
          <div className="detail-info">
            <div className="detail-header">
              <div>
                <h1 className="detail-name">{hotel.name}</h1>
                <div className="detail-location"> {hotel.address?.street}, {hotel.address?.city}, {hotel.address?.country}</div>
                <div className="detail-stars-row">
                  <StarRating count={hotel.starRating} />
                  {hotel.averageRating > 0 && <span className="badge badge-green">{hotel.averageRating.toFixed(1)} / 5</span>}
                  {hotel.reviewCount > 0 && <span className="detail-reviews">{hotel.reviewCount} reviews</span>}
                </div>
              </div>
            </div>

            {hotel.description && (
              <div className="detail-section">
                <h2 className="detail-section-title">About this hotel</h2>
                <p className="detail-description">{hotel.description}</p>
              </div>
            )}

            {/* Room Types */}
            {roomTypes.length > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">Available Rooms</h2>
                {roomTypes.map((rt) => <RoomTypeCard key={rt._id} rt={rt} onBook={handleBook} />)}
              </div>
            )}

            {hotel.amenities?.length > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">Amenities</h2>
                <div className="amenities-grid">
                  {hotel.amenities.map((a) => (
                    <div key={a} className="amenity-item">
                      <span className="amenity-icon">{getAmenityIcon(a)}</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <h2 className="detail-section-title">Policies</h2>
              <div className="policies-grid">
                {[
                  ['Check-in', hotel.policies?.checkInTime || '14:00'],
                  ['Check-out', hotel.policies?.checkOutTime || '11:00'],
                  ['Pets', hotel.policies?.petFriendly ? ' Allowed' : ' Not allowed'],
                  ['Smoking', hotel.policies?.smokingAllowed ? ' Allowed' : ' Not allowed'],
                ].map(([k, v]) => (
                  <div key={k} className="policy-item">
                    <span className="policy-label">{k}</span>
                    <span className="policy-value">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 className="detail-section-title" style={{ marginBottom: 0 }}>
                  Guest Reviews {hotel.reviewCount > 0 && <span style={{ fontSize: 14, color: '#737373', fontWeight: 400 }}>({hotel.reviewCount})</span>}
                </h2>
                {user && (
                  <button className="btn btn-outline btn-sm" onClick={() => setShowReviewForm(!showReviewForm)} id="btn-write-review">
                    {showReviewForm ? ' Cancel' : ' Write a Review'}
                  </button>
                )}
              </div>

              {showReviewForm && (
                <form onSubmit={handleReviewSubmit} style={{ background: '#f8f9fa', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Rating *</label>
                    <StarRating count={5} interactive value={reviewForm.rating} onChange={(r) => setReviewForm((f) => ({ ...f, rating: r }))} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6 }}>Booking ID (for verified stay)</label>
                    <input className="form-input" placeholder="Your booking ID (optional)" value={reviewForm.bookingId} onChange={(e) => setReviewForm((f) => ({ ...f, bookingId: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <input className="form-input" placeholder="Title (optional)" value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} maxLength={100} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <textarea className="form-input" placeholder="Share your experience..." value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} rows={4} required minLength={10} maxLength={2000} style={{ resize: 'vertical' }} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={submittingReview} id="btn-submit-review">
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              )}

              {reviews.length > 0
                ? reviews.map((r) => <ReviewCard key={r._id} review={r} />)
                : <p style={{ color: '#a3a3a3', fontSize: 14 }}>No reviews yet. Be the first to review this hotel!</p>
              }
            </div>
          </div>

          {/* Right: Booking Panel */}
          <aside className="booking-panel" aria-label="Booking panel">
            <div className="booking-panel-inner">
              <div className="booking-price">
                <span className="booking-price-from">Rooms from</span>
                <div className="booking-price-amount">
                  {lowestPrice ? `₹${lowestPrice.toLocaleString('en-IN')}` : '—'}
                  <span className="booking-price-night">/night</span>
                </div>
              </div>
              <div className="booking-features">
                <div className="bfeat"> Free cancellation</div>
                <div className="bfeat"> No booking fees</div>
                <div className="bfeat"> Verified rooms</div>
              </div>
              {roomTypes.length > 0 ? (
                <a href="#available-rooms" className="btn btn-red btn-xl booking-btn" id="btn-see-rooms" onClick={(e) => { e.preventDefault(); document.querySelector('.detail-section')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  See Available Rooms
                </a>
              ) : (
                <button className="btn btn-red btn-xl booking-btn" onClick={() => handleBook(id)} id="btn-book-hotel">
                  Book Now
                </button>
              )}
              <p className="booking-note">You won't be charged yet</p>
              <div className="booking-contact">
                <p className="booking-contact-title">Need help?</p>
                <a href="tel:01246201611" className="booking-phone"> 0124-6201611</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function getAmenityIcon(amenity) {
  const map = { wifi: '', pool: '', gym: '', parking: '', spa: '', restaurant: '', bar: '', ac: '', tv: '', laundry: '', breakfast: '', elevator: '', concierge: '', safe: '' };
  return map[amenity?.toLowerCase()] || '';
}
