import 'server-only';

import type { Actor } from '@/server/services/shared/actor';

export interface AuthIdentity {
  actor: Actor;
  email: string;
  metadata: Record<string, unknown>;
}
