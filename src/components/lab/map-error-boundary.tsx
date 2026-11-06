"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  onRestart: () => void;
};

type State = { hasError: boolean };

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-full min-h-64 flex-col items-start justify-center gap-3 p-6">
        <p className="text-sm text-muted-foreground">The map failed to draw.</p>
        <Button
          type="button"
          onClick={() => {
            this.setState({ hasError: false });
            this.props.onRestart();
          }}
        >
          Restart game
        </Button>
      </div>
    );
  }
}
