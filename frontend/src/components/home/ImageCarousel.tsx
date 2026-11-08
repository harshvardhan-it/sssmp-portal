
import React, { useState, useEffect } from 'react';
import { useCarousel } from '../../contexts/CarouselContext';

export const ImageCarousel: React.FC = () => {
  const { activeSlides } = useCarousel();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [activeSlides.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [activeSlides.length]);

  if (activeSlides.length === 0) return null;

  return (
    <section className="py-4 pb-8 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5]">
      <div className="max-w-5xl mx-auto">
        <div
          className="relative w-full aspect-[16/10] sm:aspect-video md:aspect-[21/9] overflow-hidden rounded-2xl bg-slate-100 shadow-md border border-slate-200/90"
          role="region"
          aria-label="Organization photo carousel"
          aria-roledescription="carousel"
        >
          {activeSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentIndex
                  ? 'opacity-100 z-10'
                  : 'opacity-0 z-0'
              }`}
            >
              <img
                src={slide.imageUrl}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
