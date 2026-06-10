# Host Kèo Sports Feature

## Domain

- `Host kèo` is the sports game hosting feature.
- A sport game is a shared kèo for one sport type.
- Current sport types:
  - `badminton` -> `Cầu lông`
  - `pickleball` -> `Pickleball`
  - `swimming` -> `Bơi lội`
- Sport type is a product-managed enum, not a user-created value. To add a new type later:
  - Add a Postgres enum value to `sport_type`.
  - Add the TypeScript `SportType` value.
  - Add the UI label, badge theme, and icon mapping.
- All sport types currently share the same fields, membership rules, routes, cost sharing flow, and permissions.
- Pickleball is no longer a standalone feature route. It is a sport type inside `Host kèo`.

## Routes

- `/features/sports` is the logged-in sports management dashboard.
- `/features/sports/games/:gameId` is the protected game management detail route.
- `/sports/games/:gameId` is the public shared game detail route.
- `/api/sports/games` is the API namespace for all sport game actions.
- There is no backward-compatible redirect from the old badminton or pickleball routes.
- `/sports` is intentionally left available for a future public discovery list.

## Database

- Core tables:
  - `sport_games`
  - `sport_game_members`
  - `sport_game_cost_items`
  - `sport_game_payments`
- `sport_games.type` stores the sport type as `sport_type not null`.
- Existing badminton data should be migrated to `type = 'badminton'`.
- Existing game fields remain generic and unchanged:
  - `game_date`
  - `game_time`
  - `location_name`
  - `location_url`
- Cost sharing is always enabled; `sport_games` does not store a cost sharing toggle.

## Permissions

- Anyone with an account can host a sport game.
- The creator becomes the host.
- Logged-in users can join directly without approval.
- Public users without an account can join as guest participants by entering a display name and optional phone/email.
- Guest participants appear in the public participant list and are included in cost sharing after expiry.
- Guest participants cannot manage costs, edit payments, leave/kick/promote, or access protected routes.
- Host/co-hosts can remove guest participants.
- Guests cannot self-remove in the first implementation.
- Duplicate guest display names are allowed and shown exactly as entered.
- If a guest later creates an account, the app does not need to link them to past games.
- Participants can leave a game and are removed from the active participant list.
- Leaving or being kicked only changes current membership status. A left or kicked user can rejoin before the game expires, which restores them as a regular participant.
- The host cannot leave while they are host. They must transfer ownership to an active account participant or delete the game first.
- Co-hosts can leave. Leaving automatically removes their co-host role.
- Co-hosts can kick the host. When this happens, the kicking co-host becomes the new host and the previous host is removed from the participant list.
- Co-hosts can kick other co-hosts. The kicked co-host loses the co-host role.
- The host can promote an active account participant to co-host.
- The host can demote a co-host back to participant.
- The host can transfer ownership to another active account participant or co-host.
- Guest participants cannot be promoted or receive ownership.
- Expired or deleted games lock membership and game detail actions.
- Cost management details are protected and can only be viewed or edited by users with the appropriate game permissions.

## Dashboard

- `/features/sports` shows games connected to the logged-in user:
  - host
  - co-host
  - active participant
  - left/kicked former member when relevant to their history
- Games are bucketed into:
  - Upcoming
  - Finished
  - Deleted
- Games keep the repository's date/time ordering inside each bucket.
- Games are not grouped or filtered by sport type in the first sports version.
- Each game card shows:
  - sport type label
  - sport type icon
  - sport type accent color on badge, card border, and metadata icons
  - status bucket
  - host
  - date/time
  - location
  - participant count
  - management link
  - public link
- The type theme config should be easy to extend to at least five sport types.

## Create And Edit Flow

- A user creates a sport game by providing:
  - sport type, required, default `badminton`
  - date, required
  - time, optional
  - location name, optional
  - location link, optional
  - game name, optional
- The create and edit forms use a `Loại kèo` select for the sport type.
- Host/co-hosts can edit sport type before the game expires and while it is not deleted.
- Changing sport type does not automatically rename an existing game.
- If the game name is omitted during creation, the app auto-generates:
  - `{sport type label} | {location name} | {date} | {time} | {host name}`
- Missing information is omitted from the generated name.
- Auto-generated names must be unique across all non-deleted sport games. If a generated name already exists, append `_2`, `_3`, etc.

## Public Detail

- Anyone with `/sports/games/:gameId` can view public game details:
  - sport type label/icon
  - game name
  - host
  - date
  - time
  - location
  - participant names
  - share link context
- The public participant list includes host, co-hosts, active account participants, and active guest participants.
- Left and kicked users are not shown in the public participant list.
- Account and guest joins are blocked after expiry.
- Expired games show the final participant list and no join form.

## Protected Detail

- `/features/sports/games/:gameId` shows protected management details for connected account users.
- Left/kicked former members can open protected detail pages in read-only mode for non-cost game context.
- Cost management is visible only to active account participants, co-hosts, and host.
- Protected detail shows sport type badge/icon in the header and allows editing sport type when the actor can edit game details.

## Expiry And Soft Delete

- A game expires after its scheduled date/time.
- If a game has a date but no time, it expires at the end of that date in Vietnam time (`Asia/Ho_Chi_Minh`).
- The same date/time rule determines when a deleted game becomes permanently deleted.
- Deleted games are locked except for restore before expiry.
- Deleted games are excluded from public active lists and cannot be joined.
- Expired games cannot be edited for sport type, date, time, location, or name.
- Expired games do not allow join, leave, kick, promote, demote, or ownership transfer.

## Cost Sharing

- Cost sharing is always available for sport games.
- Any active account participant, co-host, or host can add, edit, or delete any cost item before or after expiry.
- Cost items store lightweight accountability metadata:
  - optional `label`
  - required `amount`
  - `created_by`
  - `updated_by`
  - `updated_at`
- Total cost is calculated from cost items.
- Costs are split equally among active final participants, including host, co-hosts, account participants, and guest participants.
- Payment status is tracked at whole-game participant level, not per cost item.
- Each participant has:
  - calculated `amount_due`
  - nullable `amount_override`
  - `payment_status` of `unpaid` or `paid`
  - nullable `payment_note`
- `payment_note` is required when `amount_override` is set.
- Any active account participant, co-host, or host can edit/reset any account or guest participant payment information.
- Payment information stores:
  - `updated_by`
  - `updated_at`
