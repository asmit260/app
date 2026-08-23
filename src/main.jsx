import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isResetting: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash Caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleResetAndReload = async () => {
    this.setState({ isResetting: true });
    try {
      // 1. Clear session storage (AniList GraphQL cache)
      sessionStorage.clear();

      // 2. Safely re-initialize default Mock DB in localStorage instead of leaving it null
      const defaultDb = {
        profiles: {},
        watchlist: {},
        custom_lists: {},
        custom_list_items: {},
        episode_progress: {},
        calendar_events: {}
      };
      localStorage.setItem('anitrack_mock_db', JSON.stringify(defaultDb));

      // 3. Clear any orphaned theme or alert keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('anitrack_') || key.startsWith('sb-'))) {
          if (key !== 'anitrack_mock_db') keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // 4. Clear browser CacheStorage if available
      if (typeof caches !== 'undefined') {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.warn("Storage cleanup notice:", e);
    }

    // 5. Multi-strategy reload for Web, Capacitor WebView, and Mobile Browsers
    setTimeout(() => {
      try {
        window.location.replace(window.location.origin + window.location.pathname);
      } catch (_) {
        try {
          window.location.reload();
        } catch (_) {
          this.setState({ hasError: false, error: null, isResetting: false });
        }
      }
    }, 150);
  };

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || (typeof this.state.error === 'string' ? this.state.error : 'An unexpected rendering error occurred.');
      
      return (
        <div style={{
          minHeight: '100dvh',
          backgroundColor: '#F4EFE6',
          color: '#18130D',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            backgroundColor: '#FDFAF5',
            border: '2px solid #18130D',
            boxShadow: '4px 4px 0px 0px #18130D',
            padding: '24px 20px',
            borderRadius: '8px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header Badge */}
            <div style={{
              alignSelf: 'center',
              backgroundColor: '#D4974A',
              color: '#18130D',
              border: '2px solid #18130D',
              boxShadow: '2px 2px 0px 0px #18130D',
              padding: '6px 16px',
              fontWeight: 900,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              AniTrack Recovery
            </div>

            <div>
              <h2 style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: '20px',
                fontWeight: 900,
                color: '#18130D',
                margin: '0 0 6px 0'
              }}>
                Screen Loading Notice
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#6E5E4E',
                margin: 0,
                lineHeight: 1.45
              }}>
                AniTrack encountered a temporary glitch loading this screen. You can recover instantly below:
              </p>
            </div>

            {/* Error Message Box */}
            <div style={{
              backgroundColor: '#F4EFE6',
              border: '1.5px solid #18130D',
              borderRadius: '6px',
              padding: '10px 12px',
              textAlign: 'left',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#857460', marginBottom: '4px', letterSpacing: '0.04em' }}>
                Error Details:
              </div>
              <code style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: '#7A3E3E',
                wordBreak: 'break-word',
                display: 'block'
              }}>
                {errMsg}
              </code>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {/* Primary Action: Instant Re-render */}
              <button
                onClick={this.handleTryAgain}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#D4974A',
                  color: '#18130D',
                  border: '2px solid #18130D',
                  boxShadow: '2.5px 2.5px 0px 0px #18130D',
                  fontWeight: 900,
                  fontSize: '13px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  transition: 'transform 0.1s ease'
                }}
              >
                Reload Screen (Instant)
              </button>

              {/* Secondary Action: Deep Cache Clean & Restart */}
              <button
                onClick={this.handleResetAndReload}
                disabled={this.state.isResetting}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1E3A4A',
                  color: '#FDFAF5',
                  border: '2px solid #18130D',
                  boxShadow: '2px 2px 0px 0px #18130D',
                  fontWeight: 700,
                  fontSize: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: this.state.isResetting ? 0.6 : 1
                }}
              >
                {this.state.isResetting ? 'Resetting Cache...' : 'Clean Cache & Restart App'}
              </button>
            </div>
          </div>
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
