
import React from 'react';
import { Introduction } from '../../components/home/Introduction';
import { ImageCarousel } from '../../components/home/ImageCarousel';
import { SubscriptionPlans } from '../../components/home/SubscriptionPlans';
import { RegistrationProcess } from '../../components/home/RegistrationProcess';
import { OrganizationValues } from '../../components/home/OrganizationValues';
import { QuickInfoSection } from '../../components/home/QuickInfoSection';

export const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F5]">
      {/* Introduction */}
      <Introduction />

      {/* Organization Photo Carousel */}
      <ImageCarousel />

      {/* Membership Subscription */}
      <SubscriptionPlans />

      {/* Organization purpose and membership information */}
      <OrganizationValues />

      {/* Registration Process */}
      <RegistrationProcess />

      {/* Quick Organization Information */}
      <QuickInfoSection />
    </div>
  );
};
