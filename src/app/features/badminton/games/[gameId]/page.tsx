import BadmintonManagementDetailPage from '@/features/badminton/components/BadmintonManagementDetailPage';

interface BadmintonGameManagementRouteProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default async function BadmintonGameManagementRoute({
  params,
}: BadmintonGameManagementRouteProps) {
  const { gameId } = await params;

  return <BadmintonManagementDetailPage gameId={gameId} />;
}
