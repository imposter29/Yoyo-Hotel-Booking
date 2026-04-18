import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { hotelsAPI } from '../services/api';
import Footer from '../components/common/Footer';
import './HotelsPage.css';

function SkeletonCard() {
  return (
    <div className="hotel-card hotel-card--skeleton">
      <div className="skeleton skeleton-img hotel-card-img-skeleton" />
      <div className="hotel-card-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton skeleton-text xl" style={{ width: '70%' }} />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        <div className="skeleton skeleton-text lg" style={{ width: '30%', marginTop: 8 }} />
      </div>
    </div>
  );
}

function HotelCard({ hotel }) {
  const navigate = useNavigate();
  const primaryImg = hotel.images?.find(i => i.isPrimary)?.url || hotel.images?.[0]?.url;
  const ratingStars = Math.round(hotel.averageRating || 0);
  const stars = Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={`star${i < ratingStars ? '' : ' empty'}`}></span>
  ));

  return (
    <Link to={`/hotels/${hotel._id}`} className="hotel-card" id={`hotel-card-${hotel._id}`} aria-label={`View ${hotel.name}`}>
      <div className="hotel-card-img-wrapper">
        {primaryImg ? (
          <img src={primaryImg} alt={hotel.name} className="hotel-card-img" loading="lazy" />
        ) : (
          <div className="hotel-card-img-placeholder" aria-label="No image available"></div>
        )}
        {hotel.averageRating >= 4.2 && (
          <span className="hotel-card-badge">Top Rated</span>
        )}
      </div>
      <div className="hotel-card-body">
        <h3 className="hotel-card-name">{hotel.name}</h3>
        <div className="hotel-card-location">
           {hotel.address?.city}, {hotel.address?.country}
        </div>
        <div className="hotel-card-stars" aria-label={`${hotel.starRating} star hotel`}>
          <div className="stars">{stars}</div>
          {hotel.averageRating > 0 && (
            <span className="hotel-card-rating">{hotel.averageRating.toFixed(1)}</span>
          )}
          {hotel.reviewCount > 0 && (
            <span className="hotel-card-reviews">({hotel.reviewCount} reviews)</span>
          )}
        </div>
        {hotel.amenities?.length > 0 && (
          <div className="hotel-card-amenities">
            {hotel.amenities.slice(0, 3).map(a => (
              <span key={a} className="amenity-chip">{a}</span>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="amenity-chip amenity-chip--more">+{hotel.amenities.length - 3}</span>
            )}
          </div>
        )}
        <div className="hotel-card-footer">
          <div className="hotel-card-price">
            <span className="price-from">From</span>
            {hotel.startingFrom != null ? (
              <>
                <span className="price-value">₹{hotel.startingFrom.toLocaleString('en-IN')}</span>
                <span className="price-night">/night</span>
              </>
            ) : (
              <span className="price-value" style={{ fontSize: 13, color: '#a3a3a3' }}>Price on request</span>
            )}
          </div>
          <button
            className="btn btn-red btn-sm hotel-book-btn"
            id={`btn-book-${hotel._id}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/hotels/${hotel._id}`);
            }}
          >
            Book Now
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function HotelsPage() {
  const [searchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    city:   searchParams.get('city') || '',
    stars:  searchParams.get('stars') || '',
    sortBy: 'rating',
  });

  // Re-sync filters whenever the URL query string changes (e.g. Navbar city click)
  useEffect(() => {
    const urlCity   = searchParams.get('city')   || '';
    const urlSearch = searchParams.get('search') || '';
    setFilters(f => ({ ...f, city: urlCity, search: urlSearch }));
    setPage(1);
  }, [searchParams]);

  // Fetch hotels whenever filters or page change
  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (filters.search) params.search = filters.search;
    if (filters.city)   params.city   = filters.city;
    if (filters.stars)  params.stars  = filters.stars;
    if (filters.sortBy) params.sortBy = filters.sortBy;

    hotelsAPI.getAll(params)
      .then(data => {
        setHotels(data.data?.hotels || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 1);
      })
      .catch(() => setHotels([]))
      .finally(() => setLoading(false));
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <div className="hotels-page" id="hotels-page">
      <div className="hotels-layout container">
        {/* Sidebar Filters */}
        <aside className="hotels-sidebar" aria-label="Filter hotels">
          <h2 className="sidebar-title">Filters</h2>

          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="City, hotel name..."
              value={filters.search || filters.city}
              onChange={e => {
                handleFilterChange('search', e.target.value);
                handleFilterChange('city', '');
              }}
              id="filter-search"
              aria-label="Search hotels by name or city"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Star Rating</label>
            <div className="star-filter-options">
              {['', '1', '2', '3', '4', '5'].map(s => (
                <button
                  key={s}
                  className={`star-filter-btn${filters.stars === s ? ' active' : ''}`}
                  onClick={() => handleFilterChange('stars', s)}
                  id={`filter-star-${s || 'all'}`}
                  aria-pressed={filters.stars === s}
                  aria-label={s ? `${s} star hotels` : 'All ratings'}
                >
                  {s ? `${s}` : 'All'}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <select
              className="form-input"
              value={filters.sortBy}
              onChange={e => handleFilterChange('sortBy', e.target.value)}
              id="filter-sort"
              aria-label="Sort hotels"
            >
              <option value="rating">Top Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stars">Stars</option>
            </select>
          </div>
        </aside>

        {/* Main Content */}
        <main className="hotels-main" role="main">
          <div className="hotels-header">
            <h1 className="hotels-count">
              {loading ? 'Searching...' : `${total} ${total === 1 ? 'Property' : 'Properties'} Found`}
              {(filters.city || filters.search) && (
                <span className="hotels-location"> in "{filters.city || filters.search}"</span>
              )}
            </h1>
          </div>

          {loading ? (
            <div className="hotels-grid">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : hotels.length === 0 ? (
            <div className="hotels-empty" role="status">
              <div className="empty-icon"></div>
              <h3>No hotels found</h3>
              <p>Try adjusting your search or filter criteria.</p>
              <button className="btn btn-primary" onClick={() => setFilters({ search: '', stars: '', sortBy: 'rating' })}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="hotels-grid">
                {hotels.map(hotel => <HotelCard key={hotel._id} hotel={hotel} />)}
              </div>
              {totalPages > 1 && (
                <div className="pagination" role="navigation" aria-label="Page navigation">
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    id="pagination-prev"
                    aria-label="Previous page"
                  >
                    ← Prev
                  </button>
                  <span className="page-info" role="status" aria-live="polite">Page {page} of {totalPages}</span>
                  <button
                    className="page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    id="pagination-next"
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
