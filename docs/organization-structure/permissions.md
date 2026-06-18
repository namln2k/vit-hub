# Thiết kế phân quyền của Đội

## Mục đích

Tài liệu này mô tả mô hình phân quyền cho các tính năng quản lý Đội trên VIT Hub. Nội dung bao gồm chức vụ trong Đội, membership của mảng/nhóm/CLB-tổ, phân quyền sự kiện, permission matrix, vòng đời dữ liệu, và ranh giới API.

Tài liệu này chỉ ghi lại quyết định thiết kế, chưa triển khai code.

## Tóm tắt

Sử dụng scoped RBAC kết hợp với domain policy rules.

- `user.role` vẫn là vai trò kỹ thuật của ứng dụng: `member` hoặc `super_admin`.
- Chức vụ trong Đội được lưu bằng scoped role assignments, không lưu thành một role duy nhất trên user.
- Thành viên có thể tham gia nhiều mảng, nhiều nhóm, và nhiều CLB/tổ cùng lúc.
- Membership và role assignment cấp Đội/mảng/nhóm/CLB-tổ có khoảng thời gian hiệu lực.
- Event roles và event memberships tách khỏi lifecycle của chức vụ tổ chức vì event được hard delete.
- Permission definitions và role definitions là static seed data.
- Permission grants được lưu trong database và có thể chỉnh qua UI bởi những người hiện có quyền quản lý permissions.
- `super_admin` bypass permission matrix và luôn có toàn quyền.
- Các thao tác quản trị được enforce ở server API/domain services, không enforce bằng client-side Supabase calls.

## Mô hình scope

Hệ thống chỉ có một Đội. Bản đầu không có bảng `organizations`.

Dùng `organization` làm scope type với `scope_id = null` cho role cấp Đội và event toàn Đội.

Các scope type hợp lệ:

- `organization`
- `division`
- `group`
- `club`
- `event`

Quy tắc cấu trúc:

- Mảng và nhóm độc lập với nhau.
- Mỗi CLB/tổ thuộc đúng một mảng.
- Một thành viên có thể thuộc nhiều mảng, nhiều nhóm, và nhiều CLB/tổ.
- Một thành viên có thể giữ nhiều role assignment cùng lúc.

## Vai trò kỹ thuật của user

Role cấp user hiện tại vẫn là role kỹ thuật:

```text
user.role = member | super_admin
```

`super_admin`:

- không phải chức vụ trong Đội;
- bypass tất cả permission matrix checks;
- có thể truy cập và sửa toàn bộ dữ liệu hệ thống;
- có thể cứu hệ thống khi domain roles cấu hình sai permission matrix.

Nếu một người vừa là super admin vừa là Đội trưởng, người đó cần cả hai:

```text
user.role = super_admin
role_assignment = captain
```

## Trạng thái user

Thêm trạng thái user:

```text
user.status = active | disabled
```

Quy tắc:

- Chỉ user `active` mới được thêm vào membership, role, hoặc event mới.
- User `disabled` vẫn giữ lịch sử membership, role, và event participation.
- Disable user không tự động kết thúc memberships hoặc roles.
- User `disabled` không được thực hiện actions.

## Vai Trò Domain

Các static role keys:

```text
captain
vice_captain

division_lead
division_deputy

group_lead
group_deputy

club_lead
club_deputy

event_lead
event_deputy
event_staff_lead
event_volunteer
```

Dùng role keys cụ thể theo scope type. Không dùng key generic như `lead` hoặc `deputy`.

Roles là static seed data. Bản đầu không cho chỉnh roles qua UI.

Diễn giải domain:

- `captain`: Đội trưởng.
- `vice_captain`: Đội phó.
- `division_lead`: mảng trưởng.
- `division_deputy`: mảng phó.
- `group_lead`: nhóm trưởng.
- `group_deputy`: nhóm phó.
- `club_lead`: chủ nhiệm CLB/tổ trưởng.
- `club_deputy`: phó chủ nhiệm CLB/tổ phó.

## Memberships

Membership tách khỏi role assignment.

Dùng các bảng membership riêng để mỗi bảng có foreign key rõ ràng:

```text
division_memberships
group_memberships
club_memberships
event_memberships
```

Membership của mảng/nhóm/CLB-tổ có lifecycle:

```text
id
user_id
division_id | group_id | club_id
starts_at timestamptz
ends_at timestamptz null
status active | ended | revoked
added_by
ended_by
revoked_by
created_at
updated_at
```

Event memberships không dùng lifecycle đầy đủ. Events được hard delete, và event participation chỉ cần status riêng của event:

```text
event_memberships
- id
- event_id
- user_id
- status going | checked_in | absent
- joined_at
- added_by
```

Bản đầu, event membership chỉ dành cho users có account. Không có guest hoặc external participants. Nếu sau này cần, thêm bảng riêng: `event_external_participants`.

## Role Assignments Cấp Đội Và Scope

Dùng một bảng cho non-event role assignments:

```text
role_assignments
- id
- user_id
- role_key
- scope_type organization | division | group | club
- scope_id null for organization, non-null otherwise
- starts_at timestamptz
- ends_at timestamptz null
- status active | ended | revoked
- assigned_by
- ended_by
- revoked_by
- created_at
- updated_at
```

Constraints:

```text
scope_type = organization => scope_id IS NULL
scope_type != organization => scope_id IS NOT NULL
starts_at < ends_at when ends_at is not null
```

Effective-active rule:

```text
status = active
AND starts_at <= now
AND (ends_at IS NULL OR now < ends_at)
```

Không dựa vào cron để đổi rows đã hết hạn từ `active` sang `ended`.

Cho phép `starts_at` ở tương lai. UI nên phân biệt upcoming, active, và expired assignments.

Dùng half-open intervals:

```text
[starts_at, ends_at)
```

Cho phép các interval liền kề. Không cho lead intervals overlap.

Lưu timestamps bằng `timestamptz` UTC. UI nhập và hiển thị theo `Asia/Ho_Chi_Minh`.

## Role Assignments Của Event

Event roles được lưu riêng vì events được hard delete:

```text
event_role_assignments
- id
- event_id
- user_id
- role_key event_lead | event_deputy | event_staff_lead | event_volunteer
- assigned_by
- created_at
```

Event role assignments không cần `starts_at`, `ends_at`, hoặc `status`.

Khi xóa event:

```text
delete event =>
  cascade delete event_memberships
  cascade delete event_role_assignments
```

## Permission Matrix

Permission và role definitions là static seed data.

```text
roles
- key
- scope_type organization | division | group | club | event
- label

permissions
- key
- label
- description

role_permission_grants
- role_key
- permission_key
- effect_scope
- is_enabled
- updated_by
- updated_at
```

Permission definitions không chỉnh qua UI.

Role definitions không chỉnh qua UI.

Permission grants được chỉnh qua UI bởi domain role nào hiện có quyền manage permissions. Mặc định seed `captain` và `vice_captain` với full domain permissions, bao gồm permission matrix management.

Nếu `captain` và `vice_captain` tự gỡ permission management grants của chính mình, chỉ `super_admin` khôi phục được.

`super_admin` nằm ngoài matrix và luôn bypass authorization.

## Permission Keys

Dùng domain-specific permission keys với naming pattern nhất quán.

Các key khuyến nghị ban đầu:

```text
scope.member.view_contact
scope.member.manage
scope.role.assign_deputy
scope.role.assign_lead
scope.role.revoke_deputy
scope.role.revoke_lead

event.create
event.view_private
event.manage
event.member.manage
event.role.assign
event.role.revoke
event.attendance.update

permission.view
permission.manage
```

Bản đầu không dùng deny permissions. Authorization là allow-only.

Không dùng role hierarchy ẩn. Grant permissions trực tiếp cho từng role.

## Effect Scopes

Giữ `effect_scope` tối giản:

```text
self_scope
child_club
organization
owned_event
```

Ý nghĩa:

- `self_scope`: role có quyền trong chính scope được assign.
- `child_club`: role cấp mảng có quyền trên CLB/tổ thuộc mảng đó.
- `organization`: role có quyền toàn Đội.
- `owned_event`: event role có quyền trong chính event đó.

Các rule như "manager của owner scope có thể quản lý event" là domain policy code, không phải grant rows riêng.

## View Permissions

View permissions là một phần của authorization, không chỉ là ẩn/hiện UI.

Danh sách thành viên của scope:

```text
canViewScopeMemberBasic(user, scope) =
  user is authenticated

canViewScopeMemberContact(user, scope) =
  user is active member of scope
  OR user manages scope
  OR user is organization manager
  OR user is super_admin
```

Tất cả authenticated users có thể xem public/basic member data của mảng, nhóm, và CLB/tổ.

Chỉ thành viên cùng scope, manager liên quan, Đội trưởng/Đội phó, và `super_admin` được xem contact data như email và số điện thoại.

Với CLB/tổ:

- mảng trưởng/mảng phó của mảng cha được xem contact data của CLB/tổ;
- thành viên thường của mảng cha không tự động thấy contact data của CLB/tổ nếu họ không đồng thời là thành viên CLB/tổ.

## Quy tắc quản lý

Managers cấp Đội:

```text
captain
vice_captain
```

Business rule hiện tại:

- `captain` và `vice_captain` có quyền domain ngang nhau theo mặc định.
- Đây vẫn là domain roles và phụ thuộc permission matrix grants.

Managers cấp scope:

```text
division_lead / division_deputy
group_lead / group_deputy
club_lead / club_deputy
```

Quy tắc lead/deputy:

- Cấp phó có gần như toàn quyền vận hành trong scope của mình.
- Cấp phó không được assign/revoke lead role.
- Cấp phó không được assign/revoke peer deputy roles.
- Cấp phó không được tự thay đổi role của chính mình.
- Lead được assign/revoke deputy roles trong scope của mình.
- Lead không được transfer hoặc revoke lead role của chính scope mình, trừ khi họ cũng có quyền từ scope cao hơn.

Kế thừa quyền từ mảng xuống CLB/tổ:

- Mảng trưởng/mảng phó có toàn quyền quản lý các CLB/tổ trong mảng đó.
- Quyền này tương đương quyền của chủ nhiệm CLB/tổ trưởng đối với vận hành CLB/tổ.

Quản lý membership:

- Scope managers được quản lý membership trong chính scope của mình.
- Mảng managers được quản lý membership của CLB/tổ con.

## Lead Singleton Rules

Mỗi scope chỉ có tối đa một active hoặc future-overlapping lead assignment:

```text
division_lead: max one non-overlapping interval per division
group_lead: max one non-overlapping interval per group
club_lead: max one non-overlapping interval per club
```

Deputies có thể có nhiều active assignments trong cùng scope.

Nếu assign lead khi đã có conflicting lead interval, trả về:

```text
409 Conflict
```

Normal assign endpoint không tự động end lead hiện tại.

Cần có operation transfer lead riêng.

## Transfer Lead

Dùng operation transfer riêng cho thay đổi lead.

Operation này phải chạy trong transaction:

```text
transfer lead:
  check actor can transfer lead
  check target user is active
  ensure target membership
  end current active lead assignment
  create new lead assignment
```

Bản đầu chỉ cần immediate transfer. Không cần scheduled transfer endpoint.

Permissions:

- `division_lead`: chỉ `captain`, `vice_captain`, `super_admin`.
- `group_lead`: chỉ `captain`, `vice_captain`, `super_admin`.
- `club_lead`: `captain`, `vice_captain`, `super_admin`, hoặc `division_lead`/`division_deputy` của mảng cha.
- `event_lead`: manager của event owner scope, `captain`, `vice_captain`, hoặc `super_admin`.

Target user có thể là chính actor nếu actor có transfer authority.

Lead hiện tại không được transfer lead role của chính scope mình nếu quyền duy nhất của họ đến từ việc đang là lead đó.

Event lead transfer:

```text
delete existing event_lead row
insert new event_lead row
ensure target event_membership
```

## Auto-Provision Membership

Khi assign scope-level role, tự động đảm bảo user có membership trong chính scope đó:

```text
assign division_lead/deputy => ensure division membership
assign group_lead/deputy => ensure group membership
assign club_lead/deputy => ensure club membership
```

Khi assign `club_lead` hoặc `club_deputy`, cũng tự động đảm bảo membership ở mảng cha.

Membership rows được tạo bởi role assignment nên ghi source:

```text
source = manual | role_assignment_auto
```

Kết thúc role assignment không kết thúc auto-provisioned membership.

## Membership And Role Cascades

Cascade một chiều:

```text
end membership => end related scope role assignments
end role assignment => keep memberships unchanged
```

Khi end membership tại thời điểm `T`, `T` có thể ở quá khứ hoặc tương lai.

Quy tắc:

- End membership tại `T` set `status = ended` và `ends_at = T`.
- Related active/upcoming role assignments trong cùng scope phải end không muộn hơn `T`.
- Nếu related role đã end trước `T`, giữ nguyên.
- Nếu `T` ở tương lai, related roles có thể vẫn effective đến `T`.

Rule đặc biệt với division membership:

```text
end division_membership(user, division, T) =>
  end division roles at T
  end club_lead/club_deputy roles at T for all clubs under that division
  keep club_memberships
  keep event_memberships
  keep event_role_assignments
```

Kết thúc scope membership không xóa event membership hoặc event roles.

## End And Revoke

Dùng hai lifecycle outcomes:

```text
ended
revoked
```

Ý nghĩa:

- `ended`: kết thúc bình thường, hết nhiệm kỳ, bàn giao, hoặc rời scope tự nhiên.
- `revoked`: thu hồi trước hạn, sửa sai, hoặc administrative revocation.

Operations:

```text
end:
  status = ended
  ends_at = provided time or now
  ended_by = actor

revoke:
  status = revoked
  ends_at = now
  revoked_by = actor
```

UI bản đầu có thể chỉ expose "end". Domain services vẫn nên hỗ trợ `revoke` cho `super_admin` hoặc correction flows.

## Events

Mỗi event có đúng một owner scope:

```text
events
- id
- name
- owner_scope_type organization | division | group | club
- owner_scope_id null for organization, non-null otherwise
- visibility organization | scope | managers
- show_participants_publicly boolean default true
- starts_at
- ends_at
- created_by
- updated_by
- created_at
- updated_at
```

Quy tắc:

```text
owner_scope_type = organization => owner_scope_id IS NULL
owner_scope_type != organization => owner_scope_id IS NOT NULL
```

Owner scope immutable sau khi tạo. Nếu event được tạo sai owner, xóa event và tạo lại event mới.

Events được hard delete. Event memberships và event role assignments được cascade delete.

Giá trị mặc định của event:

```text
owner = organization => visibility = organization
owner = division/group/club => visibility = scope
```

Event visibility có thể được update bởi users có quyền manage event.

Event thuộc mảng/nhóm/CLB-tổ có thể dùng `visibility = organization` để mở basic details cho toàn bộ authenticated users trong Đội. Owner và management permissions không đổi.

## Tạo Event

Ai được tạo events:

- `captain`, `vice_captain`: mọi owner scope, bao gồm toàn Đội.
- `division_lead`, `division_deputy`: mảng của mình, CLB/tổ con, và organization-level events.
- `group_lead`, `group_deputy`: nhóm của mình.
- `club_lead`, `club_deputy`: CLB/tổ của mình.
- Thành viên thường: không được tạo official events.

Bản đầu không có event proposal workflow.

Event members có thể đến từ ngoài owner scope.

## Quản Lý Event

Event roles:

```text
event_lead:
  manage event
  manage event members
  assign/revoke event roles
  update attendance

event_deputy:
  nearly full event management
  cannot transfer/revoke event_lead

event_staff_lead:
  update attendance for all event members in the first version
  can later be narrowed when shifts/teams exist

event_volunteer:
  view relevant event information
  cannot manage other users
```

Manager override:

```text
canManageEvent(user, event) =
  user has event_lead/event_deputy permission for that event
  OR user manages event owner scope
  OR user is organization manager with needed grant
  OR user is super_admin
```

Với event thuộc CLB/tổ, mảng trưởng/mảng phó của mảng cha có thể quản lý event thông qua quyền kế thừa từ mảng xuống CLB/tổ.

Không cần full audit log, nhưng nên lưu row metadata như `created_by` và `updated_by`.

## Attendance Của Event

Các status values:

```text
going
checked_in
absent
```

Ai được update attendance:

- `event_lead`
- `event_deputy`
- `event_staff_lead`
- manager của event owner scope
- `captain` hoặc `vice_captain` với grants liên quan
- `super_admin`

Bản đầu không cho user tự check-in hoặc tự mark attendance cho bản thân.

Attendance update là một permission matrix key:

```text
event.attendance.update
```

Default grants gồm:

```text
event_lead -> event.attendance.update
event_deputy -> event.attendance.update
event_staff_lead -> event.attendance.update
```

## Dữ Liệu Hiển Thị Của Event

Dữ liệu event cơ bản:

- tên
- thời gian
- địa điểm public, nếu có
- owner scope
- mô tả public
- người phụ trách theo tên/avatar
- danh sách tham gia với public data, nếu `show_participants_publicly = true`

Dữ liệu event riêng tư:

- thông tin liên hệ của participants
- attendance status
- ghi chú nội bộ
- các trường vận hành cho ban tổ chức

Dữ liệu public của event member:

- user id
- display name
- avatar
- event role label, nếu có
- primary scope/position, nếu cần

Không bao giờ đưa email hoặc phone vào public participant data.

`show_participants_publicly` có thể được chỉnh bởi users có quyền manage event.

## Chính Sách Xem Event

Quy tắc visibility:

```text
visibility = organization:
  every authenticated active user can view basic event data

visibility = scope:
  active member of owner scope
  OR event member
  OR manager of owner scope
  OR organization manager with relevant grant
  OR super_admin

visibility = managers:
  event manager
  OR manager of owner scope
  OR organization manager with relevant grant
  OR super_admin
```

Nếu `show_participants_publicly = false`, ẩn participant list khỏi basic event views.

## Archive Và Delete

Chính sách delete:

- Events: hard delete.
- Division/group/club memberships: không delete; chỉ set status và effective end.
- Role assignments: không delete; chỉ set status và effective end.
- Divisions/groups/CLB-tổ: archive/soft delete nếu đã có linked history.
- Chỉ hard delete divisions/groups/CLB-tổ khi tạo nhầm và chưa có linked data.

Archive scope:

```text
archive scope at T =>
  set archived_at = T
  end all active/upcoming memberships in that scope at T
  end all active/upcoming role assignments in that scope at T
```

Archive guards:

- Không archive mảng nếu còn active CLB/tổ bên dưới.
- Không archive mảng/nhóm/CLB-tổ nếu còn event nào có owner scope là scope đó.
- Event owner không được transfer. Xóa và tạo lại event nếu cần.

## API Boundary

Các administrative operations phải đi qua server API/domain services.

Khi implement model này, không giữ direct client-side Supabase writes cho organization management.

Trách nhiệm của server:

- validate access token;
- load actor user và status;
- bypass cho `super_admin`;
- evaluate permission matrix và domain policy;
- chạy multi-step operations trong transactions;
- ghi metadata như `assigned_by`, `added_by`, `ended_by`, `updated_by`.

RLS vẫn nên là safety layer cơ bản, nhưng complex authorization nằm trong server code vì policy phụ thuộc dynamic permission grants và domain relationships.

HTTP error conventions:

```text
401 Unauthorized  -- not logged in or invalid token
403 Forbidden     -- logged in but lacks permission
404 Not Found     -- resource does not exist
400 Bad Request   -- invalid input
409 Conflict      -- invariant violation, such as conflicting lead interval
```

Bản đầu không dùng `404` để che giấu internal resources. Dùng `403` cho permission failures vì dễ debug hơn.

## Yêu Cầu Transaction

Multi-step domain operations phải chạy trong transactions.

Ví dụ:

- transfer lead;
- assign chủ nhiệm CLB/tổ trưởng hoặc phó chủ nhiệm CLB/tổ phó và auto-provision membership mảng + CLB/tổ;
- end membership và cascade role end times;
- archive scope và end related memberships/roles;
- delete event và cascade event memberships/roles.

## Thứ Tự Evaluate Authorization

Thứ tự khuyến nghị:

```text
1. Reject unauthenticated users.
2. Reject disabled users for actions.
3. If user.role = super_admin, allow.
4. Load effective-active organization/scope role assignments.
5. Load event role assignments when checking event actions.
6. Load role_permission_grants for relevant role keys.
7. Apply effect_scope and domain relationship rules.
8. Apply membership-based view rules.
9. Return allow or 403.
```

Permission matrix quyết định role được thực hiện actions nào. Domain policy quyết định role đó được thực hiện action ở đâu.

## Ghi Chú Implementation Cho Repo Hiện Tại

Codebase hiện tại có:

- `user.role = member | super_admin`;
- direct client Supabase services cho divisions và groups;
- server API/domain-style logic cho sports;
- sport game roles như host/co-host, vốn đã là resource-scoped roles.

Khi implement thiết kế này:

- giữ `super_admin` là technical override;
- migrate organization admin writes từ client Supabase services sang server API routes;
- model domain policies bằng server-side functions;
- không để permission checks chỉ nằm ở UI logic;
- thêm schema migrations trước UI changes;
- tránh implement toàn bộ permissions trong Supabase RLS.

## Follow-Ups Còn Mở

Các quyết định này được defer có chủ đích:

- exact permission seed matrix cho từng role;
- exact API route shapes;
- UI chỉnh permission matrix;
- UI cho term scheduling và future assignments;
- event shifts/teams để thu hẹp quyền của `event_staff_lead`;
- external event participants;
- full audit timeline.
