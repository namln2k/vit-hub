# Plan: Server Service Architecture for Future Mobile Support

## Status

In progress.

This document describes the target architecture and migration work. It does not select a first
feature or require the work to happen in the order listed below. Each feature should be migrated as
an independently reviewable vertical slice.

## Implementation Progress

Completed foundation:

- added `server-only` guards to shared server infrastructure and new server entry points;
- added Vitest, test scripts, a dedicated typecheck script, and initial service/repository/adapter
  tests;
- added identity-only `Actor`, verified web actor creation, typed service errors, shared action
  results, Zod field-error mapping, and safe service-error translation;
- added ESLint boundaries preventing browser-facing modules from importing `src/server/**` or
  adding new direct Supabase browser dependencies;
- added architecture tests that keep direct browser Supabase imports and Data API calls inside an
  explicit shrinking allowlist until the organization and sports slices remove the remaining
  legacy call sites.

Completed vertical slices:

- **User status mutation:** moved account and permission reads to repositories, moved authorization
  and status rules to services, added a Zod-validated Server Action, migrated the management UI,
  removed the Bearer-token browser call, and removed `/api/users/[userId]/status`.
- **User search and administration list:** added repository pagination and stable DTO mapping,
  reduced public search results to intended fields, added on-demand search and authorized list
  actions, moved the initial management list to a direct Server Component service read, migrated
  all autocomplete/member-picker consumers, and removed the generic browser Supabase user query.
- **Current user profile and Auth provisioning:** added idempotent application-profile
  provisioning from verified Auth identity, constrained untrusted Auth metadata, fixed default
  member/active account state in persistence, added actor-scoped profile services and
  Zod-validated Server Actions, moved profile writes out of `AuthContext`, loaded initial profile
  data in the root Server Component, and retained the OAuth callback as a thin web adapter.
- **Email/password registration:** extracted Supabase Auth and R2 persistence into repositories,
  added a registration service with duplicate handling, fixed account defaults, avatar validation,
  and compensating cleanup, migrated the browser to a `FormData` Server Action, and removed
  `/api/auth/register`.
- **User import:** added Zod batch validation, active-super-admin authorization, exact persisted
  email checks, deterministic username allocation, Auth and application-user repository
  operations, and compensating cleanup; migrated the administration UI to a Server Action and
  removed `/api/users/import` and its Bearer-token browser client.
- **Signed-in avatar media:** added server-side MIME/size validation, actor-namespaced R2 upload
  intents and deletion, Zod-validated Server Actions, and abandoned-upload cleanup after profile
  confirmation failure; removed `/api/avatars/presign` and browser access-token handling.
- **Post-image media:** added active-super-admin authorization, server-side MIME/size validation,
  actor-namespaced upload intents, explicit-key and trusted-public-URL deletion, and
  Zod-validated Server Actions; removed `/api/posts/presign` and browser access-token handling.
- **Posts and home featured posts:** moved public and administration reads, mutations, featured
  ordering, DTO mapping, content normalization, publication rules, and image cleanup into
  repositories and services; added Zod-validated Server Actions and an atomic featured-order RPC;
  migrated landing, post detail, and administration screens to server reads/actions; and removed
  the browser Supabase post services.

Verification for the completed slice:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npx supabase migration list --local`
- `npx supabase db lint --local --level warning`
- `npx supabase db advisors --local --type security` (only pre-existing mutable-search-path
  warnings for `set_badminton_updated_at` and `set_posts_updated_at`)

Current slice in progress:

- **Organization authorization:** expanded the identity-only authorization service with
  repository-backed same-scope, organization-wide, and division-to-child-club permission matching.
  Legacy organization Route Handlers still use the old request-shaped actor and remain to be
  migrated feature by feature.

All other feature sections in this plan remain pending.

## Goal

Refactor the current web application so business behavior is independent of Next.js Server
Actions, Route Handlers, cookies, headers, and Supabase's client SDK.

The web application will continue to use Next.js Server Actions and direct Server Component reads.
The resulting server services must be reusable by a future mobile REST API without moving or
duplicating business logic.

The target dependency direction is:

```text
Web Server Component ───────────────┐
                                    │
Web Server Action ── authenticate ──┼──> service ──> repository ──> Supabase/R2/third party
                                    │
Future REST/Hono adapter ─ auth ────┘
```

This phase does **not** add the future mobile REST/Hono API.

## Verified Current-State Baseline

This plan is based on the repository state verified on June 18, 2026:

- the web application has no Server Action layer under `src/actions/`;
- the API surface contains registration, user import/status, organization administration, sports,
  and media-presign Route Handlers;
- browser-imported modules under `src/services/` query Supabase tables directly for users,
  divisions, groups, posts, and home-featured posts;
- browser services obtain Supabase access tokens and call Route Handlers for organization, sports,
  user administration, and media operations;
- `AuthContext` currently combines Supabase Auth session orchestration with application-user
  provisioning and profile persistence;
- organization and sports already have server repository-like modules, but those modules also
  contain authorization, domain rules, DTO mapping, or HTTP-shaped errors;
- authorization helpers query Supabase directly and build a role/permission-rich actor rather than
  an identity-only actor;
- the project has no Vitest dependency or `test`/`typecheck` scripts;
- ESLint currently has no server/client import-boundary rules.

Before implementing a slice, re-check its current call sites and Route Handlers. This baseline is
planning evidence, not a substitute for slice-level discovery after the code changes.

## Agreed Architecture Decisions

1. Web and future API adapters authenticate credentials and pass an identity-only `Actor` to
   services.
2. Services enforce business authorization and all other domain invariants.
3. Repositories own database, RPC, storage, and third-party persistence details. Services do not
   access Supabase directly.
4. Adapters validate untrusted input shape and format with Zod.
5. Services enforce permissions, ownership, uniqueness, and valid state transitions.
6. Repositories enforce no business rules.
7. Services throw transport-agnostic typed errors. They never return `NextResponse`, HTTP status
   codes, redirects, or action result objects.
8. Server Components call services directly for initial reads.
9. Server Actions handle web mutations and client-triggered reads only where needed.
10. Services return stable application DTOs, never raw Supabase rows.
11. Repositories map raw rows into internal records. Services map records into application DTOs.
12. Migration is incremental by feature, with no required first feature.
13. `src/server/services/` is the server-only application service layer.
14. `src/services/` remains temporary client/browser code during migration and should be removed or
    reduced to browser-only utilities by the end.
15. REST/Hono adapters are a future phase after service boundaries stabilize.

## Layer Responsibilities

### Actor and Authentication

The shared actor is identity-only:

```ts
export interface Actor {
  userId: string;
}
```

The web adapter reads the Supabase session from server cookies, verifies it, and creates the actor.
The future mobile adapter will verify a Bearer token and create the same actor.

Services load current account state, roles, assignments, and permissions through repositories.
They must not trust role or permission snapshots supplied by an adapter.

Public services do not require an actor. Services with optional personalization accept
`Actor | null`.

### Server Services

Location:

```text
src/server/services/
  shared/
  auth/
  users/
  organization/
  posts/
  sports/
  media/
```

Each server entry point must be protected with `import 'server-only'`.

Services:

- expose use-case-oriented functions rather than generic CRUD;
- accept an `Actor` where identity is required;
- load authorization data and enforce business permissions;
- coordinate one or more repositories;
- define the required atomic workflow and call a repository operation that executes the transaction
  or RPC when multiple writes must commit atomically;
- return application DTOs;
- throw typed service errors;
- contain no Next.js, HTTP, cookie, header, or browser dependencies.

Example:

```ts
export async function updateClub(actor: Actor, input: UpdateClubInput): Promise<ClubDto> {
  const currentClub = await clubRepository.findById(input.clubId);

  if (!currentClub) {
    throw new NotFoundError('club', input.clubId);
  }

  await organizationAuthorization.requireCanManageClub(actor.userId, currentClub);
  // Enforce move/name/archive rules, then persist.
}
```

### Repositories

Location:

```text
src/server/repositories/
  users/
  organization/
  posts/
  sports/
  media/
```

Repositories:

- are the only layer that reads or writes Supabase tables and RPCs;
- own Supabase Auth Admin, R2, and third-party persistence calls behind operation-specific
  interfaces;
- own row types, query construction, persistence mapping, and infrastructure failures;
- may use the service-role key only from server-only modules;
- expose operation-specific methods;
- do not inspect `Request`, cookies, headers, or `Actor`;
- do not decide whether an operation is allowed;
- do not return application DTOs or Supabase query builders.

Database constraints may reject an invalid write as defense in depth. Repositories translate those
failures into persistence-level outcomes; services decide whether an outcome is a conflict, domain
validation failure, or infrastructure failure.

Existing code under `src/features/organization-structure/server/adminRepository/` and
`src/features/sports/server/sportRepository/` should be moved or adapted to this boundary. Database
queries currently embedded in authorization helpers should also become repository methods.

### Web Server Actions

Location:

```text
src/actions/
  auth.ts
  users.ts
  organization.ts
  posts.ts
  sports.ts
  media.ts
```

Split files further by feature if a module becomes large.

Actions:

- contain `'use server'`;
- authenticate from server cookies and create `Actor`;
- validate `FormData` or plain inputs with Zod;
- call one service use case;
- translate typed service errors into a stable serializable action result;
- call `revalidatePath`, `revalidateTag`, or `redirect` only after service success;
- contain no Supabase queries and no business authorization.

Use a shared result type:

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ServiceErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

Do not expose stack traces, repository errors, or internal Supabase messages.

### Direct Server Reads

Initial reads in App Router pages, layouts, and Server Components should:

1. obtain the actor from server cookies when required;
2. call the service directly;
3. render the returned DTO.

Client Components should receive initial DTOs as props. Add a read Server Action only when a
client interaction genuinely requires an on-demand server query, such as user autocomplete.

### Browser-Only Utilities

Some current `src/services/` modules contain legitimate browser behavior rather than application
services:

- image compression and dimension checks;
- CSV/XLSX parsing;
- file download helpers;
- client-side form normalization.

Move these to feature-local `client/` or `lib/` modules. They may call Server Actions, but must not
query Supabase tables or contain business authorization.

### Typed Service Errors

Create a shared error hierarchy in `src/server/services/shared/errors.ts`:

```text
ServiceError
├── AuthenticationRequiredError
├── ForbiddenError
├── NotFoundError
├── ConflictError
├── DomainValidationError
└── InfrastructureError
```

Each error has a stable machine-readable code and a safe user-facing message. The error types must
not contain HTTP status codes.

Adapters own mappings:

| Service error                 | Server Action                                 | Future REST mapping |
| ----------------------------- | --------------------------------------------- | ------------------- |
| `AuthenticationRequiredError` | action error                                  | 401                 |
| `ForbiddenError`              | action error                                  | 403                 |
| `NotFoundError`               | action error or `notFound()` at page boundary | 404                 |
| `ConflictError`               | action error                                  | 409                 |
| `DomainValidationError`       | field/form error                              | 422                 |
| `InfrastructureError`         | generic action error                          | 500                 |

Zod adapter failures are returned directly as input field errors and do not enter the service.

## Target Project Structure

```text
src/
  actions/                          # web mutation/read adapters
  app/
    api/                            # HTTP-only routes now; future mobile API later
  server/
    auth/
      actor.ts                      # cookie session -> Actor
    services/
      shared/
        actor.ts
        errors.ts
      auth/
      users/
      organization/
      posts/
      sports/
      media/
    repositories/
      users/
      organization/
      posts/
      sports/
      media/
  features/
    <feature>/
      components/
      client/                       # browser-only helpers
      schemas/                      # reusable input schemas where appropriate
      types/                        # public UI/application DTO imports if needed
```

DTOs may live with their service or in a framework-neutral feature type module. Client Components
must import DTOs through `import type`; they must never import a server implementation module.
When a DTO is consumed by both server and client code, prefer a framework-neutral feature type
module so server-boundary lint rules do not need exceptions for type-only imports.

## Dependency Rules

| Layer                         | May depend on                                                | Must not depend on                                       |
| ----------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| Client UI/helpers             | DTO/type modules, client helpers, Server Action entry points | `src/server/**`, Supabase data APIs                      |
| Server Components             | services, DTO/type modules, web auth adapter                 | repositories directly, browser helpers                   |
| Server Actions/Route Handlers | Zod schemas, web auth, services, error mappers               | database queries, business authorization                 |
| Services                      | repository interfaces, domain helpers, DTO/type modules      | Next.js, HTTP, cookies, headers, Supabase/R2 SDK details |
| Repositories/infrastructure   | server environment, Supabase/R2/third-party clients          | `Actor`, UI, adapter result types                        |

`import 'server-only'` is a runtime/build guard, not the only boundary mechanism. ESLint and
architecture tests must enforce the same dependency direction statically.

## Cross-Cutting Foundation Tasks

These tasks should be completed before or alongside the first migrated vertical slice.

### 1. Guardrails

- Add the `server-only` package if it is not already available through Next.js.
- Add `import 'server-only'` to service, repository, server auth, Supabase admin, and R2 modules.
- Add ESLint boundaries preventing Client Components and browser modules from importing
  `src/server/**`.
- Add an ESLint restriction preventing direct `@/lib/supabase/client` imports outside the temporary
  auth/browser allowlist.
- Document that only repositories may call `supabaseFetch`, database REST endpoints, or RPCs.

### 2. Shared Server Authentication

- Add `requireWebActor()` using the server Supabase cookie client.
- Verify the current Supabase user server-side; do not use `getSession()` as proof of identity.
- Return only `{ userId }`.
- Add an optional `getWebActor()` for public pages with personalized behavior.
- Keep authentication callback and session-cookie refresh concerns in the web layer.

### 3. Shared Errors and Action Mapping

- Implement typed service errors.
- Implement one shared action error mapper.
- Implement Zod issue-to-field-error mapping.
- Define logging rules: unexpected repository/infrastructure errors are logged server-side once,
  while adapters return a generic message.

### 4. DTO and Repository Conventions

- Define naming conventions: application DTOs use camelCase; repository records may use camelCase;
  raw Supabase rows remain private and reflect database columns.
- Define pagination DTOs before migrating user search and list endpoints.
- Keep date/time values as documented ISO strings at service boundaries.
- Avoid returning authorization internals unless the UI needs explicit capabilities.
- When capabilities are returned, compute them in services rather than repositories.

### 5. Testing Foundation

- Add Vitest and test scripts.
- Add unit-test factories for `Actor`, repository records, and DTOs.
- Inject repository dependencies where useful so service tests do not require Supabase.
- Add adapter tests for Zod parsing and error translation.
- Add architecture checks that reject direct browser-side Supabase table access.

### 6. Characterization and Migration Harness

- Capture current externally visible behavior before moving logic, especially permission outcomes,
  error messages relied on by UI flows, ordering, pagination, and state transitions.
- Prefer service tests around injected repository interfaces and a smaller number of adapter tests.
- Keep temporary compatibility wrappers only when needed to migrate consumers one at a time; wrappers
  must delegate to the new boundary and have a documented removal point.
- Do not move a module and rewrite its behavior in the same step unless the behavior change is
  explicitly documented.

## Feature Migration Plan

The following sections cover all current feature areas. They may be implemented in any order, but
each migration must finish repository, service, web adapter, UI integration, and tests before its
old path is removed.

### Authentication and Registration

Current concerns include browser Supabase Auth orchestration, `/api/auth/register`, callback
handling, username checks, app-user creation, and password/profile workflows.

Tasks:

- Keep Supabase Auth sign-in, OAuth initiation, sign-out, token refresh, and password reset client
  behavior in the auth UI where the browser SDK is required.
- Create an auth/user-registration service for app-specific registration rules and app-user
  provisioning.
- Move username uniqueness checks behind a repository and service.
- Move app-user creation/upsert out of `AuthContext`.
- Replace `/api/auth/register` business logic with a registration Server Action where the
  operation is web-only.
- Keep `src/app/auth/callback/route.ts` because OAuth callback exchange and redirects are inherently
  HTTP/web concerns; make it call services for app-user provisioning.
- Ensure services never accept user role/status values from registration clients unless the
  business rule explicitly permits them.
- Keep Supabase Auth password updates in an auth adapter, but move application profile changes to
  user services.

Service use cases:

- `checkUsernameAvailability`
- `registerAppUser`
- `provisionAppUserFromAuthIdentity`
- `getCurrentUserProfile`

Tests:

- duplicate username/email conflicts;
- auth identity cannot provision another user;
- default role/status assignment;
- callback provisioning is idempotent.

### Current User Profile

Tasks:

- Create a user repository for profile reads and writes.
- Create profile services for names, nickname, personnel fields, and avatar metadata.
- Move profile persistence and application-user state out of `AuthContext`.
- Make `AuthContext` responsible for auth session orchestration only.
- Load initial profile in a Server Component where practical.
- Use Server Actions for profile mutations.
- Update client context from successful action DTOs or refresh server-rendered data.

Service use cases:

- `getCurrentUserProfile`
- `updateCurrentUserName`
- `updateCurrentUserNickname`
- `updateCurrentUserPersonnelInfo`
- `setCurrentUserAvatar`
- `removeCurrentUserAvatar`

Tests:

- actor may update only their own profile;
- immutable fields cannot be changed by profile actions;
- profile DTO never exposes internal auth or audit fields.

### User Administration, Search, Status, and Import

Current code mixes direct browser table queries, `/api/users/import`, and
`/api/users/[userId]/status`.

Tasks:

- Move user querying and pagination to a repository.
- Create a service-level user summary DTO and paginated result.
- Add a client-triggered read Server Action for search/autocomplete.
- Replace direct `supabase.from('user')` browser queries.
- Move status transition permission and conflict checks into a service.
- Move import orchestration into a service; keep CSV/XLSX parsing as a browser-only helper.
- Validate imported rows again in the Server Action with Zod. Client parsing is usability, not a
  trust boundary.
- Move Supabase Auth admin creation and database writes into repositories/infrastructure modules.
- Define import atomicity explicitly: either all valid rows succeed in a transaction/RPC, or the
  service returns per-row results. Do not preserve accidental partial-success behavior.
- Remove the user import and status Route Handlers after web callers use Server Actions, unless an
  external caller is already documented.

Service use cases:

- `searchUsers`
- `getUsersByIds`
- `changeUserStatus`
- `importUsers`

Tests:

- search filters and pagination;
- inactive account and protected-admin transition rules;
- duplicate emails within input and against persisted users;
- import authorization;
- deterministic import result and failure behavior.

### Organization Authorization

Current authorization code loads actors and permissions and sometimes accepts `Request`.

Tasks:

- Split authentication from authorization completely.
- Replace `OrganizationActor` as an adapter result with identity-only `Actor`.
- Move role assignment, permission grant, scope parent, and event ownership reads into
  repositories.
- Convert `canManageScope` and related checks into service/domain authorization functions that take
  `actor.userId` and repository-backed facts.
- Keep reusable permission matching logic pure where possible.
- Ensure every mutating organization service performs its own authorization.
- Compute UI capability DTOs in services to avoid duplicating permission logic in components.

Tests:

- super-admin, organization lead, division lead, club lead, group lead, and event role cases;
- expired/revoked assignments;
- archived scopes;
- cross-scope permission denial;
- capability DTO consistency with mutation authorization.

### Divisions

Tasks:

- Move division and division-member queries out of `src/services/divisions.ts`.
- Add division repository methods for listing, lookup, archive state, and membership persistence.
- Add services for listing, member management, lead transfer, and archive.
- Use direct server reads for initial management navigation and division panels.
- Use actions for add/remove/revoke members, lead transfer, and archive.
- Return `DivisionDto`, `OrganizationMemberDto`, and capability DTOs.

Service use cases:

- `listDivisions`
- `getDivisionMembers`
- `addDivisionMembers`
- `endDivisionMemberships`
- `revokeDivisionMemberships`
- `transferDivisionLead`
- `archiveDivision`

Tests:

- parent/organization manager permissions;
- membership date invariants;
- lead transfer conflicts;
- archive restrictions and effects.

### Clubs

Current `/api/organization/clubs` performs validation, authorization, and orchestration.

Tasks:

- Retain/adapt current club repository queries under `src/server/repositories/organization/`.
- Move create/update/move/archive authorization and invariants into club services.
- Replace the current club API client with direct server reads and actions.
- Remove `/api/organization/clubs` after all web callers migrate.
- Ensure moving a club checks permission over both current and destination divisions.
- Keep name conflicts as `ConflictError`, not repository/HTTP errors.

Service use cases:

- `listClubs`
- `createClub`
- `updateClub`
- `moveClubToDivision`
- `archiveClub`
- `getClubMembers`
- `addClubMembers`
- `endClubMemberships`
- `revokeClubMemberships`
- `transferClubLead`

Tests:

- current and destination scope authorization;
- duplicate names;
- archived parent/club behavior;
- membership and lead-transfer invariants.

### Groups

Current group CRUD and membership reads/writes use the browser Supabase client.

Tasks:

- Move all group queries and writes into a repository.
- Create services for CRUD/archive and membership workflows.
- Decide during implementation whether hard delete remains a valid domain operation; prefer archive
  if groups are referenced by audit/history records.
- If hard delete remains, make referential cleanup transactional rather than sequential browser
  deletes.
- Replace management component calls with Server Actions and direct server reads.

Service use cases:

- `listGroups`
- `createGroup`
- `updateGroup`
- `archiveGroup` or explicitly approved `deleteGroup`
- `getGroupMembers`
- `addGroupMembers`
- `endGroupMemberships`
- `revokeGroupMemberships`
- `transferGroupLead`

Tests:

- authorization;
- duplicate names;
- delete/archive referential behavior;
- membership and lead transitions.

### Organization Roles and Scope Assignments

Tasks:

- Move role definitions, assignments, and scope-role persistence into repositories.
- Create services for role listing, assignment, revocation, and lead/deputy transitions.
- Preserve effective-date rules in services.
- Use actions for all mutations and direct server reads for initial panels.
- Remove corresponding organization Route Handlers after migration.

Service use cases:

- `listOrganizationRoles`
- `createOrganizationRole` if custom role creation is supported
- `updateOrganizationRole`
- `assignScopeRole`
- `endScopeRole`
- `revokeScopeRole`
- `transferScopeLead`

Tests:

- one active lead where required;
- role/scope compatibility;
- effective date ranges;
- protected assignments;
- actor cannot grant permissions they do not control.

### Permission Matrix

Tasks:

- Move permission matrix reads/writes behind repositories and services.
- Keep permission key/effect-scope compatibility as service/domain rules.
- Ensure the service protects permissions that could escalate the caller beyond their authority.
- Return a stable matrix DTO rather than raw grants.
- Replace `/api/organization/permissions` with direct reads and actions for web.

Service use cases:

- `getPermissionMatrix`
- `updatePermissionGrant`
- `replaceRolePermissions` only if bulk replacement semantics are intentional

Tests:

- invalid role/permission/effect-scope combinations;
- privilege escalation prevention;
- disabled grant behavior;
- matrix DTO mapping.

### Events and Event Participants

Tasks:

- Move event and participant repositories into the standard repository tree.
- Create event services for listing, creation, detail updates, owner-scope changes, archive/delete,
  visibility, and participant management.
- Keep owner-scope and visibility rules in services.
- Ensure owner-scope changes validate authority over current and destination scopes.
- Create participant services for add/remove, attendance/status changes, and event-role assignment.
- Replace organization event Route Handlers with direct reads and actions.

Service use cases:

- `listEvents`
- `createEvent`
- `updateEvent`
- `moveEventOwnerScope`
- `archiveEvent` or explicitly approved `deleteEvent`
- `getEventParticipants`
- `addEventParticipants`
- `removeEventParticipants`
- `updateEventParticipant`
- `assignEventRole`

Tests:

- owner-scope permission;
- visibility rules;
- archived/deleted event transitions;
- participant uniqueness;
- event role compatibility;
- cross-scope move authorization.

### Posts and Home Featured Posts

Current post services directly query Supabase from browser-imported modules and perform image cleanup.

Tasks:

- Move post queries, mutations, and featured ordering to repositories.
- Move post mapping and content normalization into pure domain/application utilities.
- Keep editor-only slug previews and image compression as client helpers.
- Create services for public reads, admin reads, create/update/publish/unpublish/delete, and featured
  ordering.
- Enforce slug uniqueness, publication transitions, author/audit attribution, and featured limits in
  services.
- Coordinate post mutation and image cleanup explicitly. Do not silently leave database and R2
  state inconsistent.
- Render landing featured posts and post detail through direct server service reads.
- Use actions for admin mutations.

Service use cases:

- `listPublishedPosts`
- `getPublishedPostBySlug`
- `listAdminPosts`
- `createPost`
- `updatePost`
- `publishPost`
- `unpublishPost`
- `deletePost`
- `getHomeFeaturedPosts`
- `setHomeFeaturedPosts`

Tests:

- public visibility;
- admin authorization;
- slug conflicts;
- valid publication transitions;
- featured ordering, uniqueness, and maximum count;
- image cleanup success/failure policy.

### Avatar and Post Image Media

Uploads require a browser-to-R2 `PUT`, so the flow remains split across browser and server.

Target flow:

```text
browser validates/compresses
  -> Server Action requests authorized upload intent
  -> browser PUTs to presigned R2 URL
  -> Server Action confirms metadata/change
```

Tasks:

- Keep browser image validation, dimensions, and compression in client helpers.
- Move upload authorization, key generation, presigning, deletion authorization, and ownership
  checks into media services/repositories.
- Replace presign Route Handlers with Server Actions for current web use if Server Action response
  serialization supports the required URL payload cleanly.
- Keep narrowly scoped HTTP routes only if direct upload mechanics require them; these routes remain
  adapters and call media services.
- Never trust a client-supplied object key without validating namespace and ownership.
- Define cleanup for abandoned presigned uploads and failed profile/post updates.

Service use cases:

- `createAvatarUploadIntent`
- `confirmAvatarUpload`
- `deleteAvatarObject`
- `createPostImageUploadIntent`
- `deletePostImageObjects`

Tests:

- MIME/size constraints are enforced server-side;
- object-key ownership;
- actor authorization;
- URL/key DTO validation;
- abandoned and replacement image cleanup policy.

### Sports Games, Memberships, and Costs

Current sports Route Handlers contain authentication, input validation, and business orchestration,
while existing repositories already contain substantial behavior.

Tasks:

- Move all sports business authorization and state rules out of Route Handlers and repositories into
  sports services.
- Split existing sport repository modules into pure persistence operations.
- Move date, time, expiry, host/member role, and payment transition rules into services or pure
  domain helpers.
- Use direct server reads for management and public game pages.
- Use Server Actions for game create/update/delete/restore, join/leave, guest join, member role
  changes, cost items, and payments.
- Public guest join is still a Server Action without an actor; apply abuse controls separately.
- Remove sports Route Handlers after web callers migrate.
- Preserve DTOs for summary, public detail, management detail, cost management, and mutation
  results.

Service use cases:

- `listActorSportGames`
- `getPublicSportGame`
- `getManagedSportGame`
- `createSportGame`
- `updateSportGame`
- `archiveSportGame`
- `restoreSportGame`
- `joinSportGame`
- `joinSportGameAsGuest`
- `leaveSportGame`
- `kickSportGameMember`
- `promoteSportGameMember`
- `demoteSportGameMember`
- `transferSportGameHost`
- `getSportGameCosts`
- `createSportCostItem`
- `updateSportCostItem`
- `deleteSportCostItem`
- `updateSportPayment`
- `resetSportPayment`

Tests:

- host/member/guest authorization;
- expired and archived game transitions;
- join uniqueness and guest limits;
- host transfer invariants;
- cost arithmetic and amount validation;
- payment transitions and reset behavior;
- public DTO does not expose management/private fields.

## Route Handler Disposition

During this phase, Route Handlers are not the default web application boundary.

Expected disposition:

| Route category      | Action                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| OAuth callback      | Keep as HTTP adapter                                                     |
| R2 presign/delete   | Prefer Server Actions; keep thin routes only if upload mechanics require |
| Registration        | Replace with Server Action unless an external caller exists              |
| User import/status  | Replace with Server Actions                                              |
| Organization routes | Replace with direct reads and Server Actions                             |
| Sports routes       | Replace with direct reads and Server Actions                             |

Before deleting a route, search for external/documented consumers. If any exist, retain it as a thin
adapter over the same service rather than duplicating logic.

## Selecting the First Vertical Slice

This plan intentionally does not prescribe a first feature. Before implementation begins, select one
slice using these criteria:

- it exercises actor creation, a typed service error, a repository interface, a DTO, and one web
  adapter;
- its behavior can be characterized with focused tests;
- it has a small enough UI and Route Handler surface to complete end to end;
- it does not require resolving several unrelated open decisions first;
- it produces foundation code that the next slice can reuse without making that foundation generic
  beyond demonstrated needs.

The selected slice must be written down in its issue or pull request with its exact legacy call
sites, retained routes, intentional behavior changes, and removal checklist. Foundation work should
be delivered with that slice or in immediately preceding working commits, not as an unintegrated
architecture-only branch.

## Vertical Slice Definition of Done

A feature slice is complete only when:

- repository methods contain all persistence calls;
- service use cases contain authorization and domain rules;
- services expose DTOs and typed errors;
- initial web reads call services from server-rendered code;
- web mutations use Zod-validated Server Actions;
- Client Components no longer obtain Supabase access tokens for feature data operations;
- old browser data service and obsolete Route Handlers are removed;
- relevant service, repository mapping, and adapter tests pass;
- lint and architecture boundary checks pass;
- behavior and permission semantics are unchanged unless the slice documents an intentional change.

## Incremental Commit Template

Use small commits within each feature slice:

1. Add DTOs, service inputs, and characterization tests for current behavior.
2. Extract or adapt repository methods.
3. Add service use cases and service tests.
4. Add web actor/auth helper integration and Zod schemas.
5. Add direct server reads and/or Server Actions.
6. Migrate one UI consumer at a time.
7. Remove old browser Supabase/API code.
8. Remove obsolete Route Handlers.
9. Add boundary checks and update documentation.

Do not create one repository-wide mechanical move followed by a long period of broken imports.

## Verification

Add these scripts as part of the testing foundation:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

Run for every slice:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Final repository checks:

- no Client Component imports `src/server/**`;
- no browser module calls `supabase.from`, `supabase.rpc`, or database REST endpoints;
- no service imports `next/*`, reads cookies/headers, or returns an HTTP response;
- no repository accepts `Actor` or makes authorization decisions;
- no adapter contains domain permission logic;
- no application DTO exposes raw snake_case database rows;
- every retained Route Handler delegates to a service.

## Future Mobile REST/Hono Phase

After the web migration is complete and service boundaries have stabilized:

1. Introduce Hono under a Next.js catch-all Route Handler or a separately deployed API runtime.
2. Add Bearer-token authentication that verifies Supabase JWTs and returns the same identity-only
   `Actor`.
3. Define versioned REST contracts and OpenAPI schemas.
4. Reuse service inputs/DTOs selectively, while keeping HTTP schemas independently versionable.
5. Map typed service errors to HTTP responses in one middleware.
6. Add rate limiting, CORS policy, request IDs, structured logs, and mobile-specific observability.
7. Add contract and integration tests against the REST surface.
8. Keep mobile clients away from direct Supabase table, RPC, and storage access. Supabase Auth SDK
   may still manage mobile login and token refresh.

The mobile phase must add adapters only. It must not move business authorization or workflows out
of `src/server/services/`.

## Explicit Non-Goals for This Phase

- Building the mobile application.
- Adding Hono or publishing REST endpoints for hypothetical clients.
- Replacing Supabase Auth.
- Replacing Supabase as the database.
- Rewriting all features in one change.
- Moving browser image processing or file parsing onto the server without a concrete need.
- Treating repositories as generic CRUD abstractions.
- Preserving existing Route Handlers solely because they already exist.

## Open Decisions to Resolve Per Feature

These do not block the architecture but must be resolved before implementing the affected slice:

- whether group and event deletion is hard delete or archive;
- user import atomicity versus per-row result semantics;
- transaction/RPC boundaries for multi-write organization workflows;
- R2 cleanup behavior after partial failures or abandoned uploads;
- cache tags and revalidation scope for each direct server read;
- pagination contracts for large admin lists;
- which current Route Handlers have real external consumers;
- abuse protection for public guest sports joins;
- whether inactive application accounts are rejected by shared actor creation or by each protected
  service's authorization policy;
- the logging sink and request-correlation mechanism used for infrastructure failures;
- the first vertical slice and its characterization-test boundary.
