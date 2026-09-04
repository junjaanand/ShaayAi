'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        // Last-resort recovery UI for client-only conversation failures.
        <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
          <div className="max-w-xl w-full">
            <h2 className="text-lg font-semibold text-destructive mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              An error occurred while loading the conversation.
            </p>
            {this.state.error && (
              <div className="mb-6 max-h-60 overflow-auto rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-left font-mono text-xs text-destructive">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 whitespace-pre-wrap opacity-80 text-[11px] font-mono">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Back to Home
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Happy path: render the wrapped conversation subtree unchanged.
    return this.props.children;
  }
}
