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
      // Reload at most once per page every 30 s. (The flag used to be cleared on every mount, so a page whose code
      // kept failing to load reloaded the app over and over.) Timestamped flags simply expire; nothing clears them.
      const reloadKey = "chunk_reload_" + (location.pathname || "root");
      let last = 0;
      try { last = Number(sessionStorage.getItem(reloadKey)) || 0; } catch { /* storage blocked */ }
      if (Date.now() - last > 30000) {
        try { sessionStorage.setItem(reloadKey, String(Date.now())); } catch { /* storage blocked */ }
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}
