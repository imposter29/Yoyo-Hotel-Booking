import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 20px',
    }} id="not-found-page" role="main" aria-label="Page not found">
      <div style={{ fontSize: 80, marginBottom: 16 }}></div>
      <h1 style={{ fontSize: 48, fontWeight: 900, color: '#0f0f0f', marginBottom: 8 }}>404</h1>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#0f0f0f', marginBottom: 8 }}>Page not found</p>
      <p style={{ fontSize: 14, color: '#737373', marginBottom: 32, maxWidth: 340 }}>
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary btn-lg" id="btn-go-home">Go Home</Link>
        <Link to="/hotels" className="btn btn-outline btn-lg" id="btn-browse-hotels">Browse Hotels</Link>
      </div>
    </div>
  );
}
