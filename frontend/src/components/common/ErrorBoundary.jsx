import React from 'react';
import ErrorFallback from './ErrorFallback';
import posthog from 'posthog-js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this._reset = this._reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    try {
      posthog.capture('$exception', {
        $exception_message: error?.message,
        $exception_type: error?.name,
        $exception_stack: info?.componentStack?.slice(0, 500),
        $exception_source: 'ErrorBoundary',
      });
    } catch (_) { /* PostHog init olmamış olabilir */ }
  }

  _reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback
        ? this.props.fallback
        : ErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          onReset={this._reset}
        />
      );
    }
    return this.props.children;
  }
}
