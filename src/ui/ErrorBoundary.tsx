import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected runtime error.',
    };
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main className="flex h-[100dvh] w-full items-center justify-center bg-gradient-to-b from-[#49B4FF] via-[#69C9FF] to-[#9BE4FF] p-5">
          <div className="game-panel w-full max-w-[320px] p-6 text-center">
            <h1 className="font-display text-2xl font-bold text-[#24415C]">
              Oops! Game Paused
            </h1>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#24415C]/75">
              Something went wrong in this session. Your high score, custom face, and settings remain safe.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-base btn-primary mt-5 min-h-[48px] w-full text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>RELOAD GAME</span>
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
