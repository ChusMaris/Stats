import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
          <div className="bg-white p-8 rounded-lg shadow-xl border-l-4 border-red-500 max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Se ha producido un error</h1>
            <p className="text-gray-600 mb-6">
              La aplicación no ha podido renderizarse correctamente. Aquí están los detalles técnicos:
            </p>
            
            <div className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-auto max-h-64 text-sm font-mono mb-6">
              {this.state.error?.toString()}
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);