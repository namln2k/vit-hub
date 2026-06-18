import LandingPage from '@/screens/landing/LandingPage';
import { listHomeFeaturedPosts } from '@/server/services/posts/posts';

export const dynamic = 'force-dynamic';

export default async function HomeRoute() {
  const featuredPosts = await listHomeFeaturedPosts(10);
  return <LandingPage featuredPosts={featuredPosts} />;
}
