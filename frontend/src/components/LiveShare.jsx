import { useState, useRef } from 'react';
import api from '../api';

export default function LiveShare({ getPosition }) {
  const [tracking, setTracking] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const startTracking = async () => {
    setError('');
    try {
      // Send an initial ping immediately
      await sendPing();
      intervalRef.current = setInterval(sendPing, 10000); // every 10 seconds
      setTracking(true);
    } catch (err) {
      setError('Could not access location. Please allow location permissions.');
    }
  };

  const stopTracking = () => {
    clearInterval(intervalRef.current);
    setTracking(false);
  };

  const sendPing = async () => {
    const pos = await getPosition();
    await api.post('/location', {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed
    });
  };

  const createShareLink = async () => {
    setError('');
    try {
      const { data } = await api.post('/location/share', { hours: 2 });
      setShareUrl(data.shareUrl);
    } catch (err) {
      setError('Failed to create share link');
    }
  };

  return (
    <div className="card">
      <h3>Live Location Sharing</h3>
      <p style={{ fontSize: 13, color: '#666' }}>
        Share your real-time location with trusted contacts for a limited time.
      </p>

      {!tracking ? (
        <button className="btn-primary" onClick={startTracking}>Start Live Tracking</button>
      ) : (
        <button onClick={stopTracking} style={{ background: '#eee' }}>Stop Tracking</button>
      )}

      {tracking && (
        <button className="btn-primary" onClick={createShareLink} style={{ marginTop: 8 }}>
          Generate Share Link (2 hrs)
        </button>
      )}

      {shareUrl && (
        <div style={{ marginTop: 8 }}>
          <p className="success">Share this link with a trusted contact:</p>
          <input readOnly value={shareUrl} onClick={(e) => e.target.select()} />
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
