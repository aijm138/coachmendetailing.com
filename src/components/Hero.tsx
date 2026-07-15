import React, { useState, useEffect, useCallback } from 'react';
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

type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<SlideDirection>('left');

  const getRandomDirection = useCallback((): SlideDirection => {
    const directions: SlideDirection[] = ['left', 'right', 'top', 'bottom'];
    return directions[Math.floor(Math.random() * directions.length)]!;
  }, []);

  // Auto-advance slideshow every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPrevIndex(currentIndex);
      const nextIndex = (currentIndex + 1) % slideshowImages.length;
      setCurrentIndex(nextIndex);
      setDirection(getRandomDirection());
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, getRandomDirection]);

  // Preload all images
  useEffect(() => {
    slideshowImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const getSlideStyle = (idx: number, isActive: boolean) => {
    if (!isActive && idx !== prevIndex) return { display: 'none' as const };

    const isExiting = idx === prevIndex;
    let transform = 'translateX(-50%)';
    let opacity = isActive ? 1 : 0;

    const offset = 25;

    if (isExiting) {
      switch (direction) {
        case 'left':
          transform = `translateX(calc(-50% - ${offset}vw))`;
          break;
        case 'right':
          transform = `translateX(calc(-50% + ${offset}vw))`;
          break;
        case 'top':
          transform = `translateX(-50%) translateY(-${offset}vh)`;
          break;
        case 'bottom':
          transform = `translateX(-50%) translateY(${offset}vh)`;
          break;
      }
      opacity = 0;
    } else if (idx === currentIndex) {
      switch (direction) {
        case 'left':
          transform = `translateX(calc(-50% + ${offset}vw))`;
          break;
        case 'right':
          transform = `translateX(calc(-50% - ${offset}vw))`;
          break;
        case 'top':
          transform = `translateX(-50%) translateY(${offset}vh)`;
          break;
        case 'bottom':
          transform = `translateX(-50%) translateY(-${offset}vh)`;
          break;
      }
      opacity = 1;
    }

    return {
      opacity,
      transform,
      transition: 'all 1100ms cubic-bezier(0.32, 0.72, 0, 1)',
    };
  };

  return (
    <section
      aria-label="Hero"
      className="relative h-[100svh] flex items-start justify-center pt-[17vh] md:pt-[23vh] lg:pt-[25vh] text-[color:var(--fg)] overflow-hidden"
      style={{ backgroundColor: '#000' }}
    >
      {/* Slideshow */}
      <div className="absolute inset-0 bg-black overflow-hidden">
        {slideshowImages.map((src, idx) => {
          const isActive = idx === currentIndex;
          const style = getSlideStyle(idx, isActive);

          return (
            <img
              key={src}
              src={src}
              alt=""
              className="absolute top-0 left-1/2 h-full w-auto max-w-none"
              style={{
                ...style,
                zIndex: isActive ? 2 : 1,
              }}
              aria-hidden="true"
            />
          );
        })}
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
