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
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}
