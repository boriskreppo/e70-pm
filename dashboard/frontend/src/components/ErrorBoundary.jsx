import React from 'react';
import { ACCENT, TONE } from '../tokens.js';

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', background: '#08090B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ width: 40, height: 40, background: TONE.magenta, color: '#0A0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>!</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: TONE.magenta, marginBottom: 12 }}>GREŠKA APLIKACIJE</div>
          <div style={{ fontSize: 13, color: '#848B96', maxWidth: 420, lineHeight: 1.6 }}>{this.state.error.message}</div>
        </div>
        <button onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', background: ACCENT, color: '#0A0B0D', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', marginTop: 8 }}>
          RELOAD
        </button>
      </div>
    );
  }
}
