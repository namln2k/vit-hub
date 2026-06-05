import { randomUUID } from 'node:crypto';
import { getSupabasePublicServerConfig } from '@/server/env';
import { getBearerToken, jsonResponse, readJsonBody } from '@/server/api';
import { getSupabaseUid, getUserRole, supabaseFetch } from '@/server/supabase';

export const runtime = 'nodejs';

const MAX_IMPORT_USERS = 500;

interface ImportBody {
  users?: unknown;
}

interface ImportUserInput {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  middleName?: unknown;
  phoneNumber?: unknown;
  schoolName?: unknown;
  enterYear?: unknown;
  cohort?: unknown;
  gender?: unknown;
}

interface ImportUserRow {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  nickname: string;
  username: string;
  phone_number: string;
  school_name: string;
  enter_year: string;
  cohort: string;
  gender: 0 | 1 | null;
  avatar_url: string;
  avatar_key: string;
  role: 'member';
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePhoneNumber(value: unknown) {
  return readString(value).replace(/\s+/g, '') || '-';
}

function normalizeGender(value: unknown) {
  if (value === 0 || value === 1) {
    return value as 0 | 1;
  }

  return null;
}

function normalizeUser(value: ImportUserInput, index: number) {
  const email = readString(value?.email).toLowerCase();
  const firstName = readString(value?.firstName);
  const lastName = readString(value?.lastName);
  const middleName = readString(value?.middleName);
  const phoneNumber = normalizePhoneNumber(value?.phoneNumber);

  if (!isValidEmail(email)) {
    return { error: `Dòng ${index + 1}: Email không hợp lệ.` };
  }

  if (!firstName || !lastName) {
    return { error: `Dòng ${index + 1}: Họ tên không hợp lệ.` };
  }

  const data: ImportUserRow = {
    email,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    nickname: '',
    username: '',
    phone_number: phoneNumber,
    school_name: readString(value?.schoolName),
    enter_year: readString(value?.enterYear),
    cohort: readString(value?.cohort),
    gender: normalizeGender(value?.gender),
    avatar_url: '',
    avatar_key: '',
    role: 'member',
  };

  return {
    data,
  };
}

function getAuthErrorMessage(error: unknown, email: string) {
  const message = typeof error === 'string' ? error : '';

  if (!message) {
    return `Không thể tạo tài khoản Supabase cho ${email}.`;
  }

  if (/user already registered|already registered|already exists/i.test(message)) {
    return `Email đã tồn tại trong Supabase Auth: ${email}.`;
  }

  if (/error sending confirmation email/i.test(message)) {
    return 'Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP trong Supabase Auth.';
  }

  return message;
}

function getUserMetadata(row: ImportUserRow) {
  const fullName = `${row.last_name} ${row.middle_name} ${row.first_name}`.trim();

  return {
    avatar_key: '',
    avatar_url: '',
    first_name: row.first_name,
    full_name: fullName,
    last_name: row.last_name,
    middle_name: row.middle_name,
    nickname: row.nickname,
    role: row.role,
    username: row.username,
  };
}

function generateTemporaryPassword() {
  return `${randomUUID()}A1!`;
}

function normalizeSignUpResponse(authData: Record<string, unknown>) {
  const user =
    authData.user && typeof authData.user === 'object' && 'id' in authData.user
      ? (authData.user as { id?: string })
      : authData.id
        ? ({ id: String(authData.id) } as { id: string })
        : null;

  return { user };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeSlug(value: string) {
  const withoutMarks = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const vietnameseD = withoutMarks.replace(/[đĐ]/g, 'd');

  return vietnameseD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

function getBaseUsername(row: ImportUserRow, index: number) {
  const emailUsername = normalizeSlug(row.email.split('@')[0] ?? '');
  const nameSlug = normalizeSlug(`${row.last_name} ${row.middle_name} ${row.first_name}`);
  const phoneDigits = row.phone_number.replace(/\D/g, '').slice(-4);
  const fallback = `user_${index + 1}`;
  const base = [emailUsername || nameSlug || fallback, phoneDigits]
    .filter(Boolean)
    .join('_')
    .slice(0, 20);

  return base.length >= 3 ? base : `${base}_${fallback}`.slice(0, 20);
}

function findDuplicateEmails(rows: ImportUserRow[]) {
  const seenEmails = new Set<string>();
  const duplicateEmails = new Set<string>();

  for (const row of rows) {
    if (seenEmails.has(row.email)) {
      duplicateEmails.add(row.email);
    }

    seenEmails.add(row.email);
  }

  return [...duplicateEmails];
}

async function getExistingEmails(emails: string[]) {
  if (emails.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'email',
    email: `in.(${emails.map((email) => `"${email.replaceAll('"', '\\"')}"`).join(',')})`,
  });
  const { response, data } = await supabaseFetch<Array<{ email: string }>>(
    `/rest/v1/user?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể kiểm tra email đã tồn tại.');
  }

  return (Array.isArray(data) ? data : []).map((row) => row.email);
}

async function getExistingUsernames(baseUsernames: string[]) {
  if (baseUsernames.length === 0) {
    return new Set<string>();
  }

  const query = new URLSearchParams({
    select: 'username',
  });
  const { response, data } = await supabaseFetch<Array<{ username: string }>>(
    `/rest/v1/user?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể kiểm tra username đã tồn tại.');
  }

  const prefixes = new Set(baseUsernames);

  return new Set(
    (Array.isArray(data) ? data : [])
      .map((row) => row.username)
      .filter((username) =>
        [...prefixes].some((prefix) => username === prefix || username.startsWith(`${prefix}_`)),
      ),
  );
}

async function assignGeneratedIdentity(rows: ImportUserRow[]) {
  const baseUsernames = rows.map((row, index) => getBaseUsername(row, index));
  const usedUsernames = await getExistingUsernames([...new Set(baseUsernames)]);

  rows.forEach((row, index) => {
    const baseUsername = baseUsernames[index];
    let username = baseUsername;
    let suffix = 1;

    while (usedUsernames.has(username)) {
      const suffixText = `_${suffix}`;
      username = `${baseUsername.slice(0, 20 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    usedUsernames.add(username);
    row.username = username;
  });
}

async function signUpImportedUser(row: ImportUserRow) {
  const { supabaseUrl, publishableKey } = getSupabasePublicServerConfig();
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: row.email,
      password: generateTemporaryPassword(),
      data: getUserMetadata(row),
    }),
  });
  const authData = (await authResponse.json()) as Record<string, unknown>;

  if (!authResponse.ok) {
    throw new Error(
      getAuthErrorMessage(authData.error_description ?? authData.msg ?? authData.error, row.email),
    );
  }

  const normalizedAuthData = normalizeSignUpResponse(authData);

  if (!normalizedAuthData.user?.id) {
    throw new Error(`Không thể tạo tài khoản Supabase cho ${row.email}.`);
  }

  return normalizedAuthData.user.id;
}

async function deleteImportedAuthUsers(userIds: string[]) {
  await Promise.all(
    userIds.map((userId) =>
      supabaseFetch(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' }).catch(() => null),
    ),
  );
}

async function signUpImportedUsers(rows: ImportUserRow[]) {
  const createdUserIds: string[] = [];

  try {
    for (const row of rows) {
      const authUserId = await signUpImportedUser(row);
      row.id = authUserId;
      createdUserIds.push(authUserId);
    }
  } catch (error) {
    await deleteImportedAuthUsers(createdUserIds);
    throw error;
  }

  return createdUserIds;
}

async function importUsers(rows: ImportUserRow[]) {
  const { response, data } = await supabaseFetch('/rest/v1/user?on_conflict=id', {
    method: 'POST',
    body: rows,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể import nhân sự.');
  }

  return Array.isArray(data) ? data.length : rows.length;
}

async function requireSuperAdmin(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return { error: jsonResponse({ error: 'Missing Supabase access token.' }, 401) };
  }

  const uid = await getSupabaseUid(accessToken);

  if (!uid) {
    return { error: jsonResponse({ error: 'Invalid Supabase access token.' }, 401) };
  }

  const role = await getUserRole(uid, 'Không thể kiểm tra quyền import.');

  if (role !== 'super_admin') {
    return { error: jsonResponse({ error: 'Bạn không có quyền import nhân sự.' }, 403) };
  }

  return { uid };
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const body = await readJsonBody<ImportBody>(request, 1_500_000);
    const users = Array.isArray(body.users) ? (body.users as ImportUserInput[]) : [];

    if (users.length === 0) {
      return jsonResponse({ error: 'Không có nhân sự nào để import.' }, 400);
    }

    if (users.length > MAX_IMPORT_USERS) {
      return jsonResponse({ error: `Mỗi lần chỉ import tối đa ${MAX_IMPORT_USERS} nhân sự.` }, 400);
    }

    const rows: ImportUserRow[] = [];

    for (const [index, user] of users.entries()) {
      const result = normalizeUser(user, index);

      if (result.error || !result.data) {
        return jsonResponse({ error: result.error }, 400);
      }

      rows.push(result.data);
    }

    const duplicateEmails = findDuplicateEmails(rows);

    if (duplicateEmails.length > 0) {
      return jsonResponse(
        {
          error: `File có email bị trùng: ${duplicateEmails.join(', ')}.`,
        },
        400,
      );
    }

    const existingEmails = await getExistingEmails(rows.map((row) => row.email));

    if (existingEmails.length > 0) {
      return jsonResponse(
        {
          error: `Email đã tồn tại trong hệ thống: ${existingEmails.join(', ')}.`,
        },
        409,
      );
    }

    await assignGeneratedIdentity(rows);
    const createdUserIds = await signUpImportedUsers(rows);
    let importedCount;

    try {
      importedCount = await importUsers(rows);
    } catch (error) {
      await deleteImportedAuthUsers(createdUserIds);
      throw error;
    }

    return jsonResponse({ importedCount });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Không thể import nhân sự.',
      },
      500,
    );
  }
}
