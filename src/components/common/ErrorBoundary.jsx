import { Component } from "react";
import ErrorState from "@/components/common/ErrorState";

// Per-page boundary (keyed on the route, so navigating away clears it).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error("ErrorBoundary caught:", error);
    const msg = error?.message || String(error);
    if (msg.includes("dynamically imported module") || msg.includes("Loading chunk") || msg.includes("Importing a module script failed")) {
      const reloadKey = "chunk_reload_" + (location.pathname || "root");
      const hasReloaded = sessionStorage.getItem(reloadKey);
      if (!hasReloaded) {
        sessionStorage.setItem(reloadKey, "true");
        window.location.reload();
      }
    }
  }

  componentDidMount() {
    // Clear reload flags on successful mount
    try {
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith("chunk_reload_"));
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch { /* noop */ }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}
