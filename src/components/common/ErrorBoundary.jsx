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
          <button
            onClick={() => window.location.reload()}
            className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}