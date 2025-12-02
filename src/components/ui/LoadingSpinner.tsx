'use client';

/**
 * Globale loading spinner - paarse cirkel, gecentreerd op de pagina
 * Gebruik deze component overal waar je een laadstatus wilt tonen
 */
export default function LoadingSpinner() {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999
      }}
    >
      <div 
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#701c74',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
    </div>
  );
}

/**
 * Inline loading spinner - voor gebruik binnen content (niet fullscreen)
 */
export function InlineLoadingSpinner({ size = 48 }: { size?: number }) {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 3rem',
        width: '100%'
      }}
    >
      <div 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: '4px solid #e5e7eb',
          borderTopColor: '#701c74',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
    </div>
  );
}

