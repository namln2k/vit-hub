export type BadmintonMemberRole = 'host' | 'co_host' | 'participant';
export type BadmintonMemberStatus = 'active' | 'left' | 'kicked';
export type BadmintonGameBucket = 'upcoming' | 'finished' | 'deleted';
export type BadmintonPaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface BadmintonParticipant {
  id: string;
  role: BadmintonMemberRole;
  status: BadmintonMemberStatus;
  name: string;
  isGuest: boolean;
  userId: string | null;
  guestContact: string;
}

export interface BadmintonGameSummary {
  id: string;
  name: string;
  hostUserId: string;
  hostName: string;
  gameDate: string;
  gameTime: string;
  locationName: string;
  locationUrl: string;
  costSharingEnabled: boolean;
  deletedAt: string;
  isExpired: boolean;
  bucket: BadmintonGameBucket;
  activeParticipantCount: number;
}

export interface PublicBadmintonGame {
  id: string;
  name: string;
  hostName: string;
  gameDate: string;
  gameTime: string;
  locationName: string;
  locationUrl: string;
  sharePath: string;
  deletedAt: string;
  isExpired: boolean;
  participants: BadmintonParticipant[];
}

export interface BadmintonManagementPermissions {
  canViewProtectedDetail: boolean;
  canManageGameDetails: boolean;
  canManageMembership: boolean;
  canPromote: boolean;
  canTransferOwnership: boolean;
  canRestore: boolean;
  canManageCosts: boolean;
}

export interface BadmintonManagementGame {
  id: string;
  name: string;
  hostUserId: string;
  hostName: string;
  gameDate: string;
  gameTime: string;
  locationName: string;
  locationUrl: string;
  costSharingEnabled: boolean;
  deletedAt: string;
  isExpired: boolean;
  currentUserMemberId: string;
  currentUserRole: BadmintonMemberRole | '';
  currentUserStatus: BadmintonMemberStatus | '';
  permissions: BadmintonManagementPermissions;
  participants: BadmintonParticipant[];
}

export interface BadmintonCostItem {
  id: string;
  label: string;
  amount: number;
  createdBy: string;
  createdByName: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}

export interface BadmintonPayment {
  memberId: string;
  participantName: string;
  participantRole: BadmintonMemberRole;
  isGuest: boolean;
  amountDue: number;
  amountOverride: number | null;
  effectiveAmountDue: number;
  paymentStatus: BadmintonPaymentStatus;
  paymentNote: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}

export interface BadmintonCostManagement {
  gameId: string;
  isEnabled: boolean;
  totalCost: number;
  splitParticipantCount: number;
  baseAmountDue: number;
  costItems: BadmintonCostItem[];
  payments: BadmintonPayment[];
}
