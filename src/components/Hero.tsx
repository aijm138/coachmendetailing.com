import React from 'react';
import Button from './ui/Button';

export function Hero() {
  return (
    <section
      aria-label="Hero"
      className="relative h-[100svh] flex items-start justify-center pt-[17vh] md:pt-[23vh] lg:pt-[25vh] text-[color:var(--fg)] bg-cover bg-center bg-no-repeat bg-scroll md:bg-fixed"
      style={{ backgroundImage: `url('/hero_background.jpg')`, backgroundColor: 'var(--bg-alt)' }}
    >
      <div aria-hidden className="absolute inset-0 bg-[color:var(--overlay)]" />

      <div className="relative container-page text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Cleaner than brand new, same day
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-[color:var(--fg-dim)]">
          Premium mobile detailing that restores your car’s showroom shine.
        </p>
        <div className="mt-8 flex justify-center">
          <Button as="a" href="#pricing" aria-label="See pricing options" className="text-base">
            Clean my car now!
          </Button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
