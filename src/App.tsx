import React from 'react';
import NavBar from './components/NavBar';
import Hero from './components/Hero';
import EmailCTA from './components/EmailCTA';

export default function App() {
  return (
    <div id="top">
      <NavBar />
      <main id="main">
        <Hero />
        <div className="relative z-10 bg-[color:var(--bg)]">
          <EmailCTA />
          <footer id="contact" className="border-t border-[color:var(--border)] py-10">
            <div className="container-page text-sm text-[color:var(--fg-dim)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p>© {new Date().getFullYear()} Coachmen Detailing. All rights reserved.</p>
              <a href="#top" className="hover:text-[color:var(--fg)]">Back to top</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
