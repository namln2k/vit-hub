# Permissions
- Anyone can host a badminton game.
- Only the host can edit or delete the game.
- Logged-in users can join a game directly without an approval or pending state.
- Public users without an account can join as guest participants by entering a display name and optional phone/email.
  - Guest participants appear in the public participant list and are included in cost sharing after expiry.
  - Guest participants cannot manage costs, edit payments, leave/kick/promote, or access protected routes.
  - Host/co-hosts can remove guest participants.
  - Guests cannot self-remove in the first implementation.
  - Duplicate guest display names are allowed and shown exactly as entered. Host/co-hosts can remove mistaken duplicates.
  - If a guest later creates an account, the app does not need to link them to past games.
- Participants can leave a game and they will be removed from the participant list.
- The host can kick a participant out of the game if they do not want that user to participate, which will remove them from the participant list.
- Leaving or being kicked only changes the user's current membership status. A left or kicked user can rejoin before the game expires, which switches their membership status back to active.
- Rejoining after leaving or being kicked always restores the user as a regular participant, not as host or co-host.
- The host cannot leave while they are host. They must transfer ownership to an active participant or delete the game first.
- Co-hosts can leave the game. Leaving automatically removes their co-host role.
- Co-hosts can kick the host. When this happens, the kicking co-host becomes the new host and the previous host is removed from the participant list.
- Co-hosts can kick other co-hosts. The kicked co-host is removed from the participant list and loses their co-host role.
- The host can also promote a participant to co-host, giving them the same permissions as the host.
- Co-hosts can also edit or delete the game and kick participants out of the game.
- The host can demote a co-host back to a regular participant, removing their co-host permissions.
- The host can transfer ownership of the game to another participant, making them the new host and giving them all the permissions of the original host.
  - Only active account participants can be promoted to co-host or receive ownership transfer.
  - Guest participants cannot be promoted or receive ownership.
  - Ownership can only be transferred to an active participant or active co-host.
  - Ownership cannot be transferred to left or kicked users, after the game expires, or while the game is soft-deleted.
  - After transfer, the previous host becomes a regular active participant.
- Anyone with the share link can view public game details: game name, host, date, time, location, participant names list, and share link.
- Public participant lists include the host, co-hosts, and joined participants. Left and kicked users are not shown in the public participant list.
- Cost management details are protected and can only be viewed or edited by users with the appropriate game permissions.

# Flow
0. `/features/badminton` is the logged-in badminton management dashboard.
   - Upcoming games: non-expired, non-deleted games.
   - Finished games: expired, non-deleted games.
   - Deleted games: soft-deleted games that are restorable before expiry.
   - The dashboard includes a create game button/form.
   - Each game row/card links to its protected management detail route, e.g. `/features/badminton/games/:gameId`.
   - Public shared game details live separately at `/badminton/games/:gameId`.
   - Both public and protected detail routes use the game UUID as `:gameId`.
   - This implementation does not include a public all-games listing. Public access is by direct share link.
   - The dashboard shows games connected to the logged-in user: host, co-host, active participant, or left/kicked former member if the game is still relevant to their history.
   - A separate public discovery list can be added later, but public shared pages handle external discovery for this implementation.
   - Left/kicked former members can open protected game detail pages in read-only mode for non-cost game context.
   - Cost management is visible only to active participants, co-hosts, and the host. Left/kicked users cannot access cost management unless they rejoin before expiry.
1. A user creates a badminton game by providing details: date (required), time (optional), location (optional; includes a location name and optional location link), and game name (optional). The user becomes the host of the game.
   - If the game name is not provided, the app auto-generates one with the formula: `Cầu lông | {location name} | {date} | {time} | {host name}_{optional index if current name is duplicated}`.
   - Missing information is omitted from the generated name.
   - Auto-generated game names must be unique across all non-deleted badminton games. If the generated name already exists, append a numeric index such as `_2`, `_3`, etc.
2. The host can edit or delete the game as needed.
   - Deleted games are soft-deleted first so the host can undo the deletion before the scheduled game time.
   - Soft-deleted games are not shown in the public active games list and cannot be joined or edited except for undoing the deletion.
   - After the scheduled game time passes, soft-deleted games are treated as permanently deleted, excluded from non-deleted game name uniqueness checks, and can be physically removed by cleanup.
3. The host can share the game via a unique link or invite others to join.
4. Interested users can view the public game details and join the game directly.
   - Logged-in users join as account participants.
   - Users without an account can join as guest participants by entering a display name and optional phone/email.
5. Joined users are added to the participant list and can view the game details.
6. Participants can leave the game if they no longer wish to participate, which will remove them from the participant list.
   - The host cannot leave while they are host. They must transfer ownership to an active participant or delete the game first.
   - Co-hosts can leave, and leaving automatically removes their co-host role.
7. Hosts and co-hosts can kick participants out of the game if needed. Kicked users can rejoin before the game expires.
   - Co-hosts can kick the host. When this happens, the kicking co-host becomes the new host.
   - Co-hosts can kick other co-hosts. The kicked co-host loses their co-host role.
   - A kicked user who rejoins comes back as a regular participant unless the current host promotes them again.
8. The host can promote an active account participant to co-host (see #Permissions).
9. The host can demote a co-host back to a regular participant (see #Permissions).
10. The host can transfer ownership of the game to an active account participant or co-host (see #Permissions).
    - Ownership can only be transferred to an active participant or active co-host.
    - After transfer, the previous host becomes a regular active participant.
11. After the game date and time have passed, the game is automatically archived. Game details and membership actions are locked, but cost management remains editable by active participants, co-hosts, and the host.
    - If a game has a date but no time, it expires at the end of that date in Vietnam time (`Asia/Ho_Chi_Minh`).
    - The same date/time rule determines when a soft-deleted game becomes permanently deleted.
    - Account users and guests cannot join the game after it expires.
    - After expiry, the public page shows the final participant list and no join form.
    - Expired games cannot be edited for date, time, location, or name.
    - Expired games do not allow join, leave, kick, promote, demote, or ownership transfer actions.
    - Soft-deleted games remain fully locked except for undoing the deletion before expiry.
12. Finished games are displayed in a separate section for users to view past games and their details.
13. The app provides a feature for cost sharing among participants, allowing them to split the cost of the game (e.g., court rental) and track payments. Participants can mark their payment status, and the host can view the overall payment status for the game. This feature's details is in the "Cost Sharing" section of the documentation.

# Cost Sharing
1. The host can enable cost sharing for the game when creating or editing the game details.
2. Any active participant, co-host, or host can add, edit, or delete any cost item (e.g., court rental, equipment rental) before or after the game expires.
   - Cost items store lightweight accountability metadata: `created_by`, `updated_by`, and `updated_at`.
   - The app does not need a full cost item edit history.
3. The total cost is automatically calculated based on the added cost items.
4. All costs are split equally among the participants, including the host, co-hosts, account participants, and guest participants.
   - Final cost sharing is calculated using the participant set after the scheduled game time.
5. Payment status is tracked at the whole-game participant level, not per cost item.
   - The app calculates each participant's `amount_due` from the total cost split.
   - Each participant has an optional `amount_override`, a `payment_status` of `unpaid`, `partial`, or `paid`, and an optional `payment_note`.
   - `payment_note` is required when an amount override is set.
   - Any active account participant, co-host, or host can edit, update, or reset any account or guest participant's payment information.
   - Payment information stores lightweight accountability metadata: `updated_by` and `updated_at`; `updated_by` must be an account user.
6. The host can view the overall payment status for the game, including which participants have paid, partially paid, or remain unpaid.
7. The host can edit/remove the payment amount for each participant if necessary (e.g., if a participant is exempt from payment or has a different payment arrangement). These changes will be saved and reflected in the overall cost sharing calculations. Make sure these changes are properly noted and displayed for transparency and accountability.
8. Participants can view the cost sharing details, including the total cost, individual cost share, participant-level amount due, overrides, notes, and payment status.

# Implementation Plan
## Phase 1: Core Game Sharing
- Add Supabase migration for core badminton tables: `badminton_games` and `badminton_game_members`.
- Implement game creation with required date, optional time, optional location name/link, and optional game name with unique auto-generated fallback.
- Implement public shared game route `/badminton/games/:gameId` using the game UUID.
- Public shared details show only: game name, host, date, time, location, participant names, and share link.
- Support logged-in account join/rejoin before expiry.
- Support guest join before expiry with display name and optional phone/email.
- Block account and guest joins after expiry.
- Add protected dashboard at `/features/badminton` with user-connected upcoming, finished, and soft-deleted/restorable games plus a create game flow.

## Phase 2: Membership And Moderation
- Add protected management detail route `/features/badminton/games/:gameId`.
- Implement account membership actions: leave, kick, promote to co-host, demote co-host, and transfer ownership.
- Implement guest participant removal by host/co-host.
- Enforce role edge cases:
  - Host cannot leave while still host.
  - Co-host can kick the host and becomes the new host.
  - Co-host can kick other co-hosts.
  - Kicked/left account users can rejoin as regular participants.
  - Only active account participants can become co-host or host.
- Implement soft delete/restore:
  - Restore is allowed before scheduled expiry.
  - Soft-deleted games are locked except restore.
  - Cleanup can physically remove soft-deleted games after expiry.
- Lock game details and membership actions after expiry.

## Phase 3: Cost Sharing
- Add cost/payment tables: `badminton_game_cost_items` and `badminton_game_payments`.
- Implement protected cost management visible only to active account participants, co-hosts, and host.
- Allow any active account participant, co-host, or host to add/edit/delete any cost item.
- Allow any active account participant, co-host, or host to edit/reset any account or guest participant payment information.
- Track lightweight metadata:
  - Cost items: `created_by`, `updated_by`, `updated_at`.
  - Payments: `updated_by`, `updated_at`.
- Calculate final split after expiry using host, co-hosts, active account participants, and guest participants.
- Payment fields: calculated `amount_due`, nullable `amount_override`, `payment_status` (`unpaid`, `partial`, `paid`), and nullable `payment_note` required when an override is set.

## Phase 4: Hardening
- Add API route validation and permission tests around key flows.
- Add RLS defense-in-depth policies in the migration.
- Run lint/build.
- Manually verify public guest join, logged-in join/rejoin, host/co-host moderation, expiry behavior, and cost split/payment edits.
