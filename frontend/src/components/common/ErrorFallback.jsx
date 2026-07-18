import React from 'react';

export default function ErrorFallback({ error, onReset }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080c14] px-4">
      <div className="relative w-full max-w-md">

        {/* ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative rounded-2xl border border-white/[0.06] bg-[#0d1220]/80 p-8 shadow-2xl backdrop-blur-md">

          {/* status badge */}
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
            </span>
            <span className="text-xs font-medium uppercase tracking-widest text-cyan-400/80">
              System Alert
            </span>
          </div>

          {/* icon */}
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path
                d="M14 4L25 23H3L14 4Z"
                stroke="#f59e0b"
                strokeWidth="1.6"
                strokeLinejoin="round"
                fill="rgba(245,158,11,0.1)"
              />
              <path d="M14 11V16" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="14" cy="19.5" r="1" fill="#f59e0b" />
            </svg>
          </div>

          <h1 className="mb-2 text-lg font-semibold text-white">
            Market data sync in progress
          </h1>
          <p className="mb-1 text-sm leading-relaxed text-white/50">
            A component encountered an unexpected error. Your positions and data are safe.
          </p>

          {error?.message && (
            <pre className="mt-3 mb-5 overflow-x-auto rounded-lg border border-white/[0.06] bg-black/40 px-4 py-3 text-xs text-red-400/80 font-mono">
              {error.message}
            </pre>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onReset}
              className="flex-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 active:scale-[0.98]"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:border-white/10 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
            >
              Reload page
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-white/20">
            If this persists, contact{' '}
            <a
              href="mailto:support@whaletracker.io"
              className="text-white/40 underline underline-offset-2 hover:text-white/60 transition-colors"
            >
              support@whaletracker.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
