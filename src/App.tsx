import React, { useState, useCallback } from 'react';
import NavBar from './components/NavBar';
import Hero from './components/Hero';
import Pricing from './components/Pricing';
import { BookingModal } from './components/modal/BookingModal';
import type { Plan } from './types/booking';

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const openBooking = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  }, []);

  const closeBooking = useCallback(() => {
    setModalOpen(false);
  }, []);

  // Hero CTA scrolls to pricing section
  const scrollToPricing = useCallback(() => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div id="top">
      <NavBar />
      <main id="main">
        <Hero onCtaClick={scrollToPricing} />
        <div className="relative z-10 bg-[color:var(--bg)]">
          <Pricing onSelectPlan={openBooking} />
          <footer id="contact" className="border-t border-[color:var(--border)] py-10">
            <div className="container-page text-sm text-[color:var(--fg-dim)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p>&copy; {new Date().getFullYear()} Coachmen Detailing. All rights reserved.</p>
              <a href="#top" className="hover:text-[color:var(--fg)]">Back to top</a>
            </div>
          </footer>
        </div>
      </main>

      <BookingModal
        isOpen={modalOpen}
        onClose={closeBooking}
        plan={selectedPlan}
      />
    </div>
  );
}
