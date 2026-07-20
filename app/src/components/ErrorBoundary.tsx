// Demo insurance: if any component throws (animation edge case, bad data),
// render a graceful shell with a reload button instead of a blank page.
import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode }, { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[sanket] boundary caught:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <div className="kicker justify-center">Sanket</div>
          <h1 className="display mt-4 text-3xl font-extrabold text-[var(--ink)]">
            Something glitched — the data is safe.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[var(--ink-dim)]">
            A display component failed to render. Reloading restores the view;
            all entries and flags live in the database, untouched.
          </p>
          <button onClick={() => location.reload()}
            className="mt-6 rounded-full bg-[var(--lime)] px-6 py-3 text-sm font-bold text-[#111] transition-transform hover:scale-105">
            Reload
          </button>
          <pre className="mono mx-auto mt-6 max-w-lg overflow-auto rounded-lg border border-[var(--edge)] bg-[var(--surface)] p-3 text-left text-[10px] text-[var(--ink-faint)]">
            {String(this.state.error)}
          </pre>
        </div>
      </div>
    )
  }
}
