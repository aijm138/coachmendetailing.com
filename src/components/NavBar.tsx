import React from 'react';

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--bg)]/80 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--bg)]/70">
      <nav className="container-page h-16 flex items-center justify-between" aria-label="Primary">
        <a href="#top" className="flex items-center gap-3" aria-label="Coachmen Detailing home">
          <img src="/favicon.svg" alt="Coachmen Detailing logo" className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-wide" style={{color: 'var(--fg)'}}>Coachmen Detailing</span>
        </a>
        <div className="hidden sm:flex items-center gap-6">
          <a href="#pricing" className="text-sm text-[color:var(--fg-dim)] hover:text-[color:var(--fg)]">Pricing</a>
          <a href="#contact" className="text-sm text-[color:var(--fg-dim)] hover:text-[color:var(--fg)]">Contact</a>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
