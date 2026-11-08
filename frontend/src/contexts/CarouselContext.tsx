import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CarouselSlide } from '../types';
import { INITIAL_CAROUSEL_SLIDES } from '../data/carouselData';

interface CarouselContextType {
  slides: CarouselSlide[];
  activeSlides: CarouselSlide[];
  addSlide: (slide: Omit<CarouselSlide, 'id' | 'order' | 'isActive'>) => void;
  updateSlide: (id: string, updated: Partial<CarouselSlide>) => void;
  toggleSlideActive: (id: string) => void;
  deleteSlide: (id: string) => void;
  moveSlide: (index: number, direction: 'up' | 'down') => void;
  resetToDefault: () => void;
}

const CarouselContext = createContext<CarouselContextType | undefined>(undefined);

export const CarouselProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slides, setSlides] = useState<CarouselSlide[]>(() => {
    const saved = localStorage.getItem('sssmp_carousel_slides');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved carousel slides', e);
      }
    }
    return INITIAL_CAROUSEL_SLIDES;
  });

  useEffect(() => {
    localStorage.setItem('sssmp_carousel_slides', JSON.stringify(slides));
  }, [slides]);

  const activeSlides = slides
    .filter((s) => s.isActive)
    .sort((a, b) => a.order - b.order);

  const addSlide = (newSlideData: Omit<CarouselSlide, 'id' | 'order' | 'isActive'>) => {
    const newSlide: CarouselSlide = {
      ...newSlideData,
      id: 'slide-' + Date.now(),
      isActive: true,
      order: slides.length + 1,
    };
    setSlides((prev) => [...prev, newSlide]);
  };

  const updateSlide = (id: string, updated: Partial<CarouselSlide>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const toggleSlideActive = (id: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const deleteSlide = (id: string) => {
    setSlides((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      return remaining.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    setSlides((prev) => {
      const newSlides = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSlides.length) return prev;

      const temp = newSlides[index];
      newSlides[index] = newSlides[targetIndex];
      newSlides[targetIndex] = temp;

      return newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
  };

  const resetToDefault = () => {
    setSlides(INITIAL_CAROUSEL_SLIDES);
    localStorage.setItem('sssmp_carousel_slides', JSON.stringify(INITIAL_CAROUSEL_SLIDES));
  };

  return (
    <CarouselContext.Provider
      value={{
        slides,
        activeSlides,
        addSlide,
        updateSlide,
        toggleSlideActive,
        deleteSlide,
        moveSlide,
        resetToDefault,
      }}
    >
      {children}
    </CarouselContext.Provider>
  );
};

export const useCarousel = (): CarouselContextType => {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within a CarouselProvider');
  }
  return context;
};
