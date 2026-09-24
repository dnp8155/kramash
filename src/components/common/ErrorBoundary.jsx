import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-sm font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            This section failed to load. Try refreshing the page.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => this.setState({ hasError: false })}
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