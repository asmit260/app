import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash Caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', backgroundColor: '#F4EFE6', color: '#18130D', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ background: '#D4974A', color: '#18130D', padding: '6px 16px', border: '2px solid #18130D', fontWeight: 900, textTransform: 'uppercase', marginBottom: '16px' }}>
            AniTrack Recovery
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ fontSize: '12px', color: '#6E5E4E', maxWidth: '300px', marginBottom: '16px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding: '10px 18px', background: '#1E3A4A', color: '#FDFAF5', border: '2px solid #18130D', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}
          >
            Reset App Cache & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
