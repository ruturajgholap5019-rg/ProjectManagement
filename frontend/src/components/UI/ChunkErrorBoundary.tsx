import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
  error: Error | null;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const message = error?.message || '';
    const isChunkError =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Expected a JavaScript-or-Wasm module script') ||
      message.includes('error loading dynamically imported module') ||
      error.name === 'ChunkLoadError';

    return {
      hasError: true,
      isChunkError,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Render Error:', error, errorInfo);

    if (this.state.isChunkError) {
      const reloadKey = 'chunk_boundary_reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem('chunk_boundary_reload');
    sessionStorage.removeItem('vite_preload_reload');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '360px',
            padding: '32px 24px',
            textAlign: 'center',
            color: 'var(--text-primary)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: 'var(--primary)',
            }}
          >
            {this.state.isChunkError ? <RefreshCw size={28} /> : <AlertCircle size={28} color="var(--danger)" />}
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            {this.state.isChunkError ? 'New Update Available' : 'Something went wrong'}
          </h3>

          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              maxWidth: '440px',
              marginBottom: '24px',
              lineHeight: 1.5,
            }}
          >
            {this.state.isChunkError
              ? 'A newer version of the application was deployed. Click below to refresh and load the latest updates.'
              : 'An unexpected display error occurred while rendering this page.'}
          </p>

          <button
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <RefreshCw size={16} />
            Refresh & Update
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
