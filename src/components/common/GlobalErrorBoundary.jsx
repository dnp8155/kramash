import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("GlobalErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            The app encountered an unexpected error. Try refreshing the page.
          </p>
          {this.state.error?.message && (
            <pre className="mt-3 max-w-md text-xs text-muted-foreground bg-muted rounded-lg p-3 overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="h-9 px-4 rounded-md border border-border bg-card text-foreground text-sm font-medium hover:bg-muted"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}