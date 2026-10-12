import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PickleQueue caught an unhandled component error:', error, errorInfo);
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 clay-card rounded-3xl border border-rose-200/80 bg-rose-50/60 text-slate-900 max-w-lg mx-auto shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900">
                {this.props.fallbackTitle || 'Panel Temporarily Unavailable'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                The screen encountered a display issue and prevented a collapse.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 bg-white/90 rounded-xl text-[11px] font-mono text-rose-800 border border-rose-100 mb-4 overflow-x-auto max-h-24">
              {this.state.error.message || 'Unknown render error'}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={this.handleReload}
              className="px-4 py-2.5 rounded-xl clay-btn clay-btn-primary text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recover View</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-4 py-2.5 rounded-xl clay-btn clay-btn-secondary text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
