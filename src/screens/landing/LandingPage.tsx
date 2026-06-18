import AboutActivitiesSection from '@/screens/landing/components/AboutActivitiesSection';
import FeaturedPostsSection from '@/screens/landing/components/FeaturedPostsSection';
import HighlightsSection from '@/screens/landing/components/HighlightsSection';
import LandingHero from '@/screens/landing/components/LandingHero';
import type { PublicPostDto } from '@/features/posts/types';

export default function LandingPage({ featuredPosts }: { featuredPosts: PublicPostDto[] }) {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <main>
        <LandingHero />
        <FeaturedPostsSection featuredPosts={featuredPosts} />
        <HighlightsSection />
        <AboutActivitiesSection />
      </main>
    </div>
  );
}
