export type SportType = 'badminton' | 'pickleball' | 'swimming';
export type SportMemberRole = 'host' | 'co_host' | 'participant';
export type SportMemberStatus = 'active' | 'left' | 'kicked';
export type SportGameBucket = 'upcoming' | 'finished' | 'deleted';
export type SportPaymentStatus = 'unpaid' | 'paid';

export interface SportParticipant {
  id: string;
  role: SportMemberRole;
  status: SportMemberStatus;
  name: string;
  isGuest: boolean;
  userId: string | null;
  guestContact: string;
}

export interface SportGameSummary {
  id: string;
  type: SportType;
  name: string;
  hostUserId: string;
  hostName: string;
  gameDate: string;
  gameTime: string;
  locationName: string;
  locationUrl: string;
  deletedAt: string;
  isExpired: boolean;
  bucket: SportGameBucket;
  activeParticipantCount: number;
}

export interface PublicSportGame {
  id: string;
  type: SportType;
  name: string;
  hostName: string;
  gameDate: string;
  gameTime: string;
  locationName: string;
  locationUrl: string;
  sharePath: string;
  deletedAt: string;
  isExpired: boolean;
  participants: SportParticipant[];
}

export interface SportManagementPermissions {
  canViewProtectedDetail: boolean;
  canManageGameDetails: boolean;
  canManageMembership: boolean;
  canPromote: boolean;
  canTransferOwnership: boolean;
  canRestore: boolean;
  canManageCosts: boolean;
}

export interface SportManagementGame {
  id: string;
  type: SportType;
  name: string;
  hostUserId: string;
  hostName: string;
  gameDate: string;
  gameTime: string;
  locationName: string;
  locationUrl: string;
  deletedAt: string;
  isExpired: boolean;
  currentUserMemberId: string;
  currentUserRole: SportMemberRole | '';
  currentUserStatus: SportMemberStatus | '';
  permissions: SportManagementPermissions;
  participants: SportParticipant[];
}

export interface SportCostItem {
  id: string;
  label: string;
  amount: number;
  createdBy: string;
  createdByName: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}

export interface SportPayment {
  memberId: string;
  participantName: string;
  participantRole: SportMemberRole;
  isGuest: boolean;
  amountDue: number;
  amountOverride: number | null;
  effectiveAmountDue: number;
  paymentStatus: SportPaymentStatus;
  paymentNote: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}

export interface SportCostManagement {
  gameId: string;
  totalCost: number;
  splitParticipantCount: number;
  baseAmountDue: number;
  costItems: SportCostItem[];
  payments: SportPayment[];
}
