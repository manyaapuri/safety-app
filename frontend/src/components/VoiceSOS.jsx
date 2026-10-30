import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

const DANGER_KEYWORDS = [
  'help me', 'help', 'sos', 'emergency', 'save me',
  'leave me alone', 'stop it', 'let me go', 'call police',
  'someone help', 'i need help', 'please help', 'danger',
  'fire', 'attack',
];

export default function VoiceSOS({ onTrigger, disabled }) {
  const [listening, setListening]   = useState(false);
  const [lastHeard, setLastHeard]   = useState('');
  const [error, setError]           = useState('');
  const [triggered, setTriggered]   = useState(false);
  const recognitionRef              = useRef(null);

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
      setError('Voice recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = 'en-IN';
    recognition.maxAlternatives = 3;

    recognition.onstart  = () => setListening(true);

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        setLastHeard(transcript);
        const matched = DANGER_KEYWORDS.find((kw) => transcript.includes(kw));
        if (matched && !triggered) {
          setTriggered(true);
          setLastHeard(`Keyword detected: "${matched}"`);
          onTrigger(matched);
          setTimeout(() => setTriggered(false), 10000);
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Allow mic access in browser settings.');
        setListening(false);
      } else {
        console.warn('Speech error:', e.error);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        setTimeout(() => { try { recognitionRef.current?.start(); } catch (_) {} }, 500);
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setError('Could not start voice recognition.'); }
  }, [onTrigger, triggered]);

  const toggle = () => { listening ? stopListening() : startListening(); };

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      padding: 14,
      background: 'var(--neutral-50)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--r-lg)',
    }}>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mic size={15} strokeWidth={2} color="var(--text-muted)" />
            Live voice monitoring
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Monitors for keywords to trigger automated SOS
          </div>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${listening ? 'btn-danger' : 'btn-secondary'}`}
          onClick={toggle}
          disabled={disabled}
          aria-label={listening ? 'Stop voice monitoring' : 'Start voice monitoring'}
        >
          {listening
            ? <><MicOff size={13} strokeWidth={2} /> Stop</>
            : <><Mic size={13} strokeWidth={2} /> Start mic</>}
        </button>
      </div>

      {listening && (
        <div className="voice-indicator listening">
          <div className="voice-dot pulsing" aria-hidden="true" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-600)' }}>Listening…</div>
            {lastHeard && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                Heard: "{lastHeard}"
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="msg msg-error" style={{ marginTop: 8 }}>
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Keywords:</strong>{' '}
        {DANGER_KEYWORDS.slice(0, 8).join(', ')}…
      </div>
    </div>
  );
}
