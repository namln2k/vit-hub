import PostPage from '@/screens/PostPage';
import { getPublishedPostBySlug } from '@/server/services/posts/posts';

export const dynamic = 'force-dynamic';

export default async function PostRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  return <PostPage post={post} />;
}
