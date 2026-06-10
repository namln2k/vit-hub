import SportManagementDetailPage from '@/features/sports/components/SportManagementDetailPage';

interface SportGameManagementRouteProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default async function SportGameManagementRoute({ params }: SportGameManagementRouteProps) {
  const { gameId } = await params;

  return <SportManagementDetailPage gameId={gameId} />;
}
