
import type { CarouselSlide } from '../types';

const photoFiles = [
  'teacher01.jpeg',
  'teacher02.jpeg',
  'teacher03.jpeg',
  'teacher04.jpeg',
  'teacher05.jpeg',
  'teacher06.jpeg',
  'teacher07.jpeg',
  'teacher08.jpeg',
  'teacher09.jpeg',
  'teacher10.jpeg',
  'teacher11.jpeg',
  'teacher12.jpeg',
  'teacher13.jpeg',
];

export const INITIAL_CAROUSEL_SLIDES: CarouselSlide[] = photoFiles.map(
  (photo, index) => ({
    id: `teacher-slide-${index + 1}`,
    imageUrl: `/images/carousel/${photo}`,
    titleHi: '',
    titleEn: '',
    captionHi: '',
    captionEn: '',
    isActive: true,
    order: index + 1,
  })
);
