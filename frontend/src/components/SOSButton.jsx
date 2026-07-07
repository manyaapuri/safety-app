import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import VoiceSOS from './VoiceSOS';
import CameraCapture from './CameraCapture';

const COUNTDOWN_SECONDS = 5;

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    });
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function SOSButton() {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [triggerType, setTriggerType] = useState('manual');
  const [voicePhrase, setVoicePhrase] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [simulatedSms, setSimulatedSms] = useState('');
  const countdownRef = useRef(null);
  const pendingTriggerRef = useRef(null);
  const cameraRef = useRef(null);

  // Clear countdown
  const cancelCountdown = useCallback(() => {
    clearInterval(countdownRef.current);
    setCountdown(null);
    pendingTriggerRef.current = null;
    setStatus('✅ SOS cancelled');
    setStatusType('info');
    setTimeout(() => setStatus(''), 3000);
  }, []);

  // Record 5 seconds of emergency audio
  const recordFiveSecondsOfAudio = useCallback((alertId) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("MediaDevices not supported, skipping audio recording.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          // Stop stream tracks to release the microphone
          stream.getTracks().forEach((track) => track.stop());

          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result;
            try {
              await api.put(`/sos/${alertId}/audio`, { audio_base64: base64Audio });
              console.log("✅ Successfully saved emergency audio recording!");
            } catch (err) {
              console.error("Failed to save audio recording:", err);
            }
          };
        };

        // Start recording
        mediaRecorder.start();
        console.log("🎤 Recording 5 seconds of emergency audio evidence...");

        // Stop recording after 5 seconds
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 5000);
      })
      .catch((err) => {
        console.error("Microphone access failed for recording:", err);
      });
  }, []);

  // Actual SOS dispatch
  const dispatchSOS = useCallback(async (opts = {}) => {
    setLoading(true);
    setStatus('📍 Getting your location…');
    setStatusType('info');
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;
      const address = await reverseGeocode(latitude, longitude);

      // Auto-capture photo if camera is available
      let photo = opts.photo || photoBase64;
      if (!photo && cameraRef.current) {
        try {
          photo = await cameraRef.current.capture();
        } catch (camErr) {
          console.error("Auto-capture failed:", camErr);
        }
      }

      setStatus('📡 Sending alert…');
      const { data } = await api.post('/sos', {
        latitude,
        longitude,
        address,
        type: opts.triggerType || 'manual',
        trigger_type: opts.triggerType || 'manual',
        voice_phrase: opts.voicePhrase || null,
        photo_base64: photo || null
      });

      setStatus(`🆘 Alert sent! ${data.contactsNotified} contact(s) + police notified.`);
      setStatusType('success');
      if (data.smsMessage) {
        setSimulatedSms(data.smsMessage);
      }

      // Start recording 5 seconds of audio and upload it when done
      if (data.alert && data.alert.id) {
        recordFiveSecondsOfAudio(data.alert.id);
      }
    } catch (err) {
      setStatus(err.response?.data?.error || 'Failed to send SOS. Check connection.');
      setStatusType('error');
    } finally {
      setLoading(false);
      setTimeout(() => { setStatus(''); setStatusType(''); }, 8000);
    }
  }, [photoBase64, recordFiveSecondsOfAudio]);

  // Start countdown before sending (allows cancellation)
  const startCountdown = useCallback((opts = {}) => {
    if (loading || countdown !== null) return;
    setSimulatedSms('');
    pendingTriggerRef.current = opts;
    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        dispatchSOS(pendingTriggerRef.current || {});
        pendingTriggerRef.current = null;
      }
    }, 1000);
  }, [loading, countdown, dispatchSOS]);

  // Voice trigger handler
  const handleVoiceTrigger = useCallback((phrase) => {
    setVoicePhrase(phrase);
    setTriggerType('voice');
    setSimulatedSms('');
    // Voice triggers dispatch immediately (no countdown) for urgency
    dispatchSOS({ triggerType: 'voice', voicePhrase: phrase, photo: photoBase64 });
  }, [dispatchSOS, photoBase64]);

  // Manual SOS button press
  const handleManualPress = () => {
    setTriggerType('manual');
    startCountdown({ triggerType: 'manual', photo: photoBase64 });
  };

  // Cleanup on unmount
  useEffect(() => () => clearInterval(countdownRef.current), []);

  return (
    <div className="glass-card glow">
      <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        Emergency SOS
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
        Press the button to alert your emergency contacts, share your location, and notify police.
      </p>

      <div className="sos-wrapper">
        <div className="sos-ring-outer">
          {!loading && (
            <>
              <div className="sos-pulse-ring" />
              <div className="sos-pulse-ring" />
              <div className="sos-pulse-ring" />
            </>
          )}
          <button
            className={`sos-btn ${loading ? 'loading' : ''}`}
            onClick={handleManualPress}
            disabled={loading || countdown !== null}
            id="sos-main-button"
          >
            {loading ? <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              : countdown !== null ? <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{countdown}</span>
              : <>SOS<br /><span className="sos-btn-label">PRESS</span></>
            }
          </button>
        </div>

        {countdown !== null && (
          <div className="sos-countdown">
            <div className="countdown-number">{countdown}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Sending SOS in {countdown} second{countdown !== 1 ? 's' : ''}…
            </div>
            <button className="btn btn-secondary btn-sm" onClick={cancelCountdown} style={{ marginTop: 4 }}>
              ✕ Cancel
            </button>
          </div>
        )}
      </div>

      {status && (
        <div className={`msg ${statusType === 'success' ? 'msg-success' : statusType === 'error' ? 'msg-error' : statusType === 'info'}`}>
          {status}
        </div>
      )}

      {simulatedSms && (
        <div className="msg msg-info" style={{ marginTop: 12, border: '1px dashed var(--accent-cyan)' }}>
          <div style={{ fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span>📱 [SIMULATED SMS SENT TO CONTACTS]</span>
          </div>
          <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{simulatedSms}"</div>
        </div>
      )}

      <div className="divider" />

      {/* Voice SOS */}
      <VoiceSOS onTrigger={handleVoiceTrigger} disabled={loading} />

      {/* Camera */}
      <CameraCapture ref={cameraRef} onCapture={(b64) => setPhotoBase64(b64)} />
    </div>
  );
}
