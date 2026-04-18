import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citiesAPI } from '../../services/api';
import './Footer.css';

const FOOTER_LINKS = {
  'About Us': ['Teams / Careers', 'Blog / News', 'Investor Relations', 'Partner with Us', 'Media / Press Kit'],
  'Yoyo Blog': ['Travel Tips', 'Budget Travel', 'Hotel Reviews', 'City Guides', 'Food & Culture'],
  'Policies': ['Terms and Conditions', 'Guest Policies', 'Cookie Policy', 'Refund Policy', 'Cancellation Policy'],
  'Security': ['Cyber Security', 'Privacy Policy', 'Data Protection', 'Fraud Awareness', 'Report a Concern'],
};

const COUNTRY_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Footer() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subMsg, setSubMsg] = useState('');

  useEffect(() => {
    citiesAPI.getAll({ limit: 200 })
      .then(data => setCities(data.data?.cities || []))
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      const { newsletterAPI } = await import('../../services/api');
      await newsletterAPI.subscribe(email);
      setSubMsg(' Subscribed successfully!');
      setEmail('');
    } catch {
      setSubMsg(' Already subscribed or error occurred.');
    }
    setTimeout(() => setSubMsg(''), 4000);
  };

  // Group cities into columns of ~10 items
  const CHUNK = 10;
  const cityChunks = [];
  for (let i = 0; i < cities.length; i += CHUNK) {
    cityChunks.push(cities.slice(i, i + CHUNK));
  }

  return (
    <footer className="footer" id="main-footer" role="contentinfo">
      {/* Main Footer Section */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-top-row">
            {/* Brand */}
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="footer-logo-text">YOYO</span>
              </div>
              <p className="footer-tagline">Find your perfect stay across India.</p>
            </div>
          </div>



          {/* City Grid (Dynamic) */}
          <div className="footer-cities-section">
            <h4 className="footer-cities-heading">Hotels by City</h4>
            {loading ? (
              <div className="footer-cities-skeleton">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="cities-column-skeleton">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="skeleton skeleton-text" style={{ marginBottom: 8 }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="footer-cities-grid">
                <div className="footer-city-item">
                  <a href="#" className="footer-city-link footer-city-link--special">
                     Hotels near me
                  </a>
                </div>
                {cities.map((city) => (
                  <div key={`${city.city}-${city.country}`} className="footer-city-item">
                    <Link
                      to={`/hotels?city=${encodeURIComponent(city.city)}`}
                      className="footer-city-link"
                      id={`footer-city-${city.city.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      Hotels in {city.city}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="container">
          <p className="footer-copyright" style={{ textAlign: 'center', width: '100%' }}>
            © {new Date().getFullYear()} Yoyo Stays Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
