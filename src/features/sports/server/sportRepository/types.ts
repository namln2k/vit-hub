import type {
  SportType,
  SportMemberRole,
  SportMemberStatus,
  SportPaymentStatus,
} from '@/features/sports/types';

export interface SportGameRow {
  id: string;
  type: SportType;
  name: string;
  host_user_id: string;
  game_date: string;
  game_time: string | null;
  location_name: string | null;
  location_url: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface SportMemberRow {
  id: string;
  game_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_contact: string | null;
  role: SportMemberRole;
  status: SportMemberStatus;
}

export interface SportCostItemRow {
  id: string;
  game_id: string;
  label: string;
  amount: string | number;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface SportPaymentRow {
  id: string;
  game_id: string;
  member_id: string;
  amount_override: string | number | null;
  payment_status: SportPaymentStatus;
  payment_note: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface UserNameRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  nickname: string | null;
  username: string | null;
  email: string | null;
}

export interface CreateSportGameInput {
  hostUserId: string;
  type: SportType;
  name?: string;
  gameDate?: string;
  gameTime?: string;
  locationName?: string;
  locationUrl?: string;
}

export interface JoinGuestInput {
  gameId: string;
  guestName: string;
  guestContact?: string;
}

export interface UpdateGameInput {
  actorUserId: string;
  gameId: string;
  type: SportType;
  name: string;
  gameDate?: string;
  gameTime?: string;
  locationName?: string;
  locationUrl?: string;
}

export interface UpsertCostItemInput {
  actorUserId: string;
  gameId: string;
  costItemId?: string;
  label: string;
  amount: number;
}

export interface UpdatePaymentInput {
  actorUserId: string;
  gameId: string;
  memberId: string;
  amountOverride: number | null;
  paymentStatus: SportPaymentStatus;
  paymentNote?: string;
}
