'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const pathname = usePathname();

  const handleSubmit = async () => {
    if (!message.trim()) {
      alert('Voer een bericht in');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          rating,
          page: pathname
        })
      });

      if (!res.ok) throw new Error('Feedback verzenden mislukt');

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setMessage('');
        setRating(null);
        setSubmitted(false);
      }, 2000);
    } catch (e: any) {
      alert(e?.message || 'Feedback verzenden mislukt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            backgroundColor: '#8b1c6d',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 56,
            height: 56,
            fontSize: '1.5em',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          title="Feedback geven"
        >
          💬
        </button>
      )}

      {/* Feedback panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            width: 340,
            maxHeight: '80vh',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#8b1c6d',
              color: 'white',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: 600 }}>Feedback</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.5em',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3em', marginBottom: '0.5rem' }}>✓</div>
                <p style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>Bedankt voor je feedback!</p>
              </div>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#6b7280' }}>
                  Help ons het platform te verbeteren. Jouw feedback is waardevol!
                </p>

                {/* Rating */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9em', fontWeight: 500 }}>
                    Hoe tevreden ben je? (optioneel)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.8em',
                          cursor: 'pointer',
                          padding: 0,
                          color: rating && star <= rating ? '#fbbf24' : '#d1d5db',
                          transition: 'color 0.2s'
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9em', fontWeight: 500 }}>
                    Jouw feedback
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Vertel ons wat je denkt..."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      resize: 'vertical',
                      fontSize: '0.9em'
                    }}
                  />
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                  style={{
                    backgroundColor: message.trim() ? '#8b1c6d' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.75rem',
                    fontSize: '1em',
                    fontWeight: 600,
                    cursor: message.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {submitting ? 'Verzenden...' : 'Verstuur feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

