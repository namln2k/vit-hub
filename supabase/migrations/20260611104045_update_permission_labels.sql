insert into public.permissions (key, label, description)
values
  (
    'scope.member.view_contact',
    'Xem liên hệ thành viên trong phạm vi',
    'Xem email và số điện thoại của thành viên trong phạm vi quản lý.'
  ),
  (
    'scope.member.manage',
    'Quản lý thành viên trong phạm vi',
    'Thêm hoặc kick thành viên trong phạm vi quản lý.'
  ),
  (
    'scope.role.assign_deputy',
    'Bổ nhiệm cấp phó',
    'Bổ nhiệm cấp phó trong phạm vi quản lý.'
  ),
  (
    'scope.role.assign_lead',
    'Bổ nhiệm cấp trưởng',
    'Bổ nhiệm hoặc chuyển giao cấp trưởng trong phạm vi quản lý.'
  ),
  (
    'scope.role.revoke_deputy',
    'Gỡ cấp phó',
    'Kết thúc hoặc gỡ cấp phó trong phạm vi quản lý.'
  ),
  (
    'scope.role.revoke_lead',
    'Gỡ cấp trưởng',
    'Kết thúc hoặc gỡ cấp trưởng trong phạm vi quản lý.'
  ),
  (
    'event.create',
    'Tạo sự kiện',
    'Tạo sự kiện trong phạm vi quản lý.'
  ),
  (
    'event.view_private',
    'Xem chi tiết vận hành sự kiện',
    'Xem chi tiết vận hành sự kiện, bao gồm ghi chú nội bộ, cấu hình riêng tư, danh sách thành viên, vai trò trong sự kiện và trạng thái tham gia.'
  ),
  (
    'event.manage',
    'Quản lý sự kiện',
    'Cập nhật thông tin tổng quan sự kiện.'
  ),
  (
    'event.member.manage',
    'Quản lý thành viên sự kiện',
    'Thêm hoặc cập nhật thành viên sự kiện.'
  ),
  (
    'event.role.assign',
    'Bổ nhiệm vai trò trong sự kiện',
    'Bổ nhiệm vai trò trong sự kiện.'
  ),
  (
    'event.role.revoke',
    'Gỡ vai trò trong sự kiện',
    'Gỡ vai trò trong sự kiện.'
  ),
  (
    'event.attendance.update',
    'Cập nhật trạng thái tham gia sự kiện',
    'Cập nhật trạng thái tham gia của thành viên sự kiện.'
  ),
  (
    'permission.view',
    'Xem quản lý phân quyền',
    'Xem các quyền được cấp cho từng vai trò.'
  ),
  (
    'permission.manage',
    'Quản lý phân quyền',
    'Cập nhật các quyền được cấp cho từng vai trò.'
  )
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;
