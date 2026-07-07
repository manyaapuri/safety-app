import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * VoiceSOS — listens for dangerous keywords via Web Speech API.
 * Triggers the provided onTrigger callback with the detected phrase.
 */
const DANGER_KEYWORDS = [
  'help me', 'help', 'sos', 'emergency', 'save me',
  'leave me alone', 'stop it', 'let me go', 'call police',
  'someone help', 'i need help', 'please help', 'danger',
  'fire', 'attack'
];

export default function VoiceSOS({ onTrigger, disabled }) {
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [error, setError] = useState('');
  const [triggered, setTriggered] = useState(false);
  const recognitionRef = useRef(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError('');
    setTriggered(false);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Try Chrome/Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        setLastHeard(transcript);

        const matched = DANGER_KEYWORDS.find((kw) => transcript.includes(kw));
        if (matched && !triggered) {
          setTriggered(true);
          setLastHeard(`🚨 Keyword: "${matched}"`);
          onTrigger(matched);
          // Reset after 10s to allow re-trigger
          setTimeout(() => setTriggered(false), 10000);
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return; // Ignore no-speech silently
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic in browser settings.');
        setListening(false);
      } else {
        console.warn('Speech error:', e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart to keep it continuous
      if (recognitionRef.current) {
        setTimeout(() => {
          try { recognitionRef.current?.start(); } catch (_) {}
        }, 500);
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setError('Could not start voice recognition.');
    }
  }, [onTrigger, triggered]);

  const toggle = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    // Auto-start on mount
    startListening();
    return () => stopListening();
  }, [startListening, stopListening]);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>🎙️ Live Voice Monitoring</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Monitors for keywords to trigger automated SOS
          </div>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${listening ? 'btn-danger' : 'btn-success'}`}
          onClick={toggle}
          disabled={disabled}
          style={{ width: 'auto' }}
        >
          {listening ? '🔴 Listening' : '🎤 Start Mic'}
        </button>
      </div>

      {listening && (
        <div className={`voice-indicator ${listening ? 'listening' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 8 }}>
          <div className={`voice-dot ${listening ? 'pulsing' : ''}`} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)' }}>
              Active and Listening…
            </div>
            {lastHeard && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic' }}>
                Heard: "{lastHeard}"
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="msg msg-error" style={{ marginTop: 8 }}>⚠️ {error}</div>}

      <div style={{ marginTop: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Trigger Keywords:</strong>{' '}
          {DANGER_KEYWORDS.slice(0, 10).join(', ')}…
        </p>
      </div>
    </div>
  );
}
