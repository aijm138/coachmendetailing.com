import React, { useState, useEffect } from 'react';
import Button from './ui/Button';

const slideshowImages = [
  '/hero_slideshow/00.jpg',
  '/hero_slideshow/01.jpg',
  '/hero_slideshow/02.jpg',
  '/hero_slideshow/03.jpg',
  '/hero_slideshow/04.jpg',
  '/hero_slideshow/05.jpg',
  '/hero_slideshow/06.jpg',
  '/hero_slideshow/07.jpg',
  '/hero_slideshow/08.jpg',
  '/hero_slideshow/09.jpg',
  '/hero_slideshow/10.jpg',
  '/hero_slideshow/11.jpg',
];

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance every 5 seconds with simple fade
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideshowImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Preload images
  useEffect(() => {
    slideshowImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <section
      aria-label="Hero"
      className="relative h-[100svh] flex items-start justify-center pt-[17vh] md:pt-[23vh] lg:pt-[25vh] text-[color:var(--fg)] overflow-hidden"
      style={{ backgroundColor: '#000' }}
    >
      {/* Slideshow */}
      <div className="absolute inset-0 bg-black">
        {slideshowImages.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000"
            style={{
              opacity: idx === currentIndex ? 1 : 0,
              zIndex: idx === currentIndex ? 2 : 1,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Dark overlay */}
      <div 
        aria-hidden 
        className="absolute inset-0 bg-[color:var(--overlay)] z-10" 
      />

      {/* Content */}
      <div className="relative z-20 container-page text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Cleaner than brand new, same day
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-[color:var(--fg-dim)]">
          Premium mobile detailing that restores your car’s showroom shine.
        </p>
        <div className="mt-8 flex justify-center">
          <Button as="a" href="#early-bird" aria-label="Sign up for early bird discount" className="text-base">
            Clean my car now!
          </Button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
