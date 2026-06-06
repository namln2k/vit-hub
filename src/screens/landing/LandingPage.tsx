import AboutActivitiesSection from '@/screens/landing/components/AboutActivitiesSection';
import FeaturedPostsSection from '@/screens/landing/components/FeaturedPostsSection';
import HighlightsSection from '@/screens/landing/components/HighlightsSection';
import LandingHero from '@/screens/landing/components/LandingHero';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <main>
        <LandingHero />
        <FeaturedPostsSection />
        <HighlightsSection />
        <AboutActivitiesSection />
      </main>
    </div>
  );
}
