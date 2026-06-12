# Refactor API-First Cho Native Mobile

## Summary

Refactor codebase theo boundary: native mobile được dùng Supabase Auth SDK để login/session, nhưng không được gọi Supabase database/table/RPC/storage trực tiếp. Web và mobile sẽ cùng dùng backend API contract của VIT Hub. Upload tiếp tục theo pattern backend cấp presigned URL, client upload trực tiếp tới URL đó.

Mục tiêu thành công:

- Không còn business/data service phía client gọi `supabase.from(...)`.
- Tất cả nghiệp vụ hiện có có endpoint `/api/*` tương ứng.
- Web app chuyển sang dùng API client giống cách mobile sẽ dùng.
- Supabase chỉ còn nằm ở auth client, SSR/proxy auth, và server-side repository layer.
- Có test bằng Vitest cho API contract/helper/mapper trọng yếu.

## Key Changes

### API Boundary

- Tạo một API client framework-neutral cho web/mobile với input: `baseUrl`, `getAccessToken`, `fetchImpl`.
- Chuẩn hóa response shape: success trả data typed; lỗi trả `{ error: string }` với HTTP status rõ ràng.
- Gom logic lấy Bearer token, JSON parse, error handling vào một client helper dùng chung thay vì lặp ở `sports`, `organizationAdmin`, `clubs`, `avatarUpload`, `postImageUpload`.

### Backend Endpoints Cần Bổ Sung

- `GET /api/me`: trả hồ sơ app user hiện tại, tạo user row nếu Supabase auth user chưa có row.
- `PATCH /api/me`: cập nhật name, nickname, personnel fields, avatar metadata.
- `GET /api/users`: search/list users theo ids, emails, search, roles, pagination.
- `GET /api/divisions`: list divisions.
- `GET /api/divisions/:id/members`: list members qua backend.
- `GET /api/groups`, `POST /api/groups`, `PATCH /api/groups/:id`, `DELETE /api/groups/:id`.
- `GET /api/groups/:id/members`: list members qua backend.
- `GET /api/posts`: public published posts / featured posts.
- `GET /api/posts/:slug`: public post detail.
- `GET /api/admin/posts`, `POST /api/admin/posts`, `PATCH /api/admin/posts/:id`, `DELETE /api/admin/posts/:id`.
- `GET /api/admin/home-featured-posts`, `PUT /api/admin/home-featured-posts`.

### Server-Side Data Access

- Move all Supabase table access into server repositories.
- Keep existing sports and organization repositories as the target pattern.
- Add repositories for users/profile, divisions, groups, posts.
- Server repositories may use service role via existing `supabaseFetch`, but route handlers must enforce auth/authorization before calling privileged writes.
- Public read routes must expose only intended fields; do not mirror raw table rows.

### Web Refactor

- Replace client-side `supabase.from(...)` services with calls to the shared API client.
- Keep `supabase.auth.*` in `AuthContext` for web auth/session only.
- Move profile persistence out of `AuthContext` into `/api/me`; `AuthContext` becomes orchestration only.
- Keep upload flow as `presign -> direct upload -> metadata update`, but expose it through API client methods.

## Tiny Commit Plan

1. Add Vitest config and a first trivial test for API helper behavior.
2. Introduce shared API client core with `get`, `post`, `patch`, `delete`, Bearer injection, and normalized errors.
3. Refactor existing sports web service to use the shared API client without changing endpoints.
4. Refactor organization admin and clubs services to use the shared API client.
5. Add server auth helper shared by API routes: require Supabase access token, load uid, optionally load organization actor.
6. Add `/api/me` GET/PATCH and user profile repository.
7. Move `loadOrCreateAppUser` persistence behind `/api/me`; update `AuthContext`.
8. Add `/api/users` query endpoint and replace direct user queries.
9. Add divisions read/member endpoints and replace direct division queries.
10. Add groups CRUD/member endpoints and replace direct group table writes.
11. Add posts public/admin endpoints and replace direct post table writes.
12. Refactor avatar/post image services to use shared API client for presign/delete.
13. Search repo for remaining `supabase.from(...)`; allow only server repositories or explicitly documented server-only files.
14. Add tests for auth helper, API client error handling, `/api/me`, users query mapping, and one representative admin authorization route.
15. Add a short architecture doc describing the mobile API boundary and forbidden direct Supabase data access.

## Test Plan

- Add Vitest.
- Unit test API client:
  - attaches Bearer token when available;
  - omits token for public calls;
  - parses backend `{ error }`;
  - handles non-JSON failures.
- Unit test server auth helpers:
  - missing Bearer returns 401;
  - invalid token returns 401;
  - inactive user returns 403 where organization actor is required.
- Route/repository tests with mocked `fetch`:
  - `/api/me` loads or creates app user;
  - `/api/users` respects ids/search/roles/pagination;
  - group/post write endpoints reject unauthenticated users;
  - super-admin-only post admin endpoints reject non-super-admin.
- Verification commands:
  - `npm run lint`
  - `npm run build`
  - `npm test` after adding Vitest script.

## Assumptions

- Native app may use Supabase Auth SDK only for login/session/token refresh.
- Native app must not call Supabase tables, RPC, Realtime, or Storage helpers directly.
- Uploads use backend-issued presigned URLs, not Supabase/R2 SDKs in the app.
- API-first refactor covers all current modules, not only MVP mobile screens.
- Existing RLS remains defense-in-depth, but backend authorization becomes the primary business access layer.
- No schema migration is required for the refactor unless tests expose missing ownership/status fields.
