import { randomUUID } from 'node:crypto';
import { getSupabaseAdminServerConfig, getSupabasePublicServerConfig } from '../supabase-env.js';

const MAX_IMPORT_USERS = 500;

function json(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1_500_000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    request.on('error', reject);
  });
}

async function supabaseFetch(path, { key, method = 'GET', body, headers = {} }) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminServerConfig();
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: key ?? serviceRoleKey,
      Authorization: `Bearer ${key ?? serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return { response, data };
}

async function getSupabaseUid(accessToken) {
  const { supabaseUrl, publishableKey } = getSupabasePublicServerConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.id ?? null;
}

async function getImporterRole(uid) {
  const query = new URLSearchParams({
    select: 'role',
    id: `eq.${uid}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch(`/rest/v1/user?${query.toString()}`, {});

  if (!response.ok) {
    throw new Error(data?.message ?? 'Không thể kiểm tra quyền import.');
  }

  return Array.isArray(data) ? data[0]?.role : null;
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePhoneNumber(value) {
  return readString(value).replace(/\s+/g, '') || '-';
}

function normalizeGender(value) {
  if (value === 0 || value === 1) {
    return value;
  }

  return null;
}

function normalizeUser(value, index) {
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

  return {
    data: {
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
    },
  };
}

function getAuthErrorMessage(error, email) {
  if (!error) {
    return `Không thể tạo tài khoản Supabase cho ${email}.`;
  }

  if (/user already registered|already registered|already exists/i.test(error)) {
    return `Email đã tồn tại trong Supabase Auth: ${email}.`;
  }

  if (/error sending confirmation email/i.test(error)) {
    return 'Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP trong Supabase Auth.';
  }

  return error;
}

function getUserMetadata(row) {
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
  const tempPassword = `${randomUUID()}A1!`;
  console.log('Generated temporary password for new user:', tempPassword);
  return tempPassword;
}

function normalizeSignUpResponse(authData) {
  const user = authData?.user?.id ? authData.user : authData?.id ? authData : null;

  return { user };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeSlug(value) {
  const withoutMarks = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const vietnameseD = withoutMarks.replace(/[đĐ]/g, 'd');

  return vietnameseD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

function getBaseUsername(row, index) {
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

function findDuplicateEmails(rows) {
  const seenEmails = new Set();
  const duplicateEmails = new Set();

  for (const row of rows) {
    if (seenEmails.has(row.email)) {
      duplicateEmails.add(row.email);
    }

    seenEmails.add(row.email);
  }

  return [...duplicateEmails];
}

async function getExistingEmails(emails) {
  if (emails.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'email',
    email: `in.(${emails.map((email) => `"${email.replaceAll('"', '\\"')}"`).join(',')})`,
  });
  const { response, data } = await supabaseFetch(`/rest/v1/user?${query.toString()}`, {});

  if (!response.ok) {
    throw new Error(data?.message ?? 'Không thể kiểm tra email đã tồn tại.');
  }

  return (Array.isArray(data) ? data : []).map((row) => row.email);
}

async function getExistingUsernames(baseUsernames) {
  if (baseUsernames.length === 0) {
    return new Set();
  }

  const query = new URLSearchParams({
    select: 'username',
  });
  const { response, data } = await supabaseFetch(`/rest/v1/user?${query.toString()}`, {});

  if (!response.ok) {
    throw new Error(data?.message ?? 'Không thể kiểm tra username đã tồn tại.');
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

async function assignGeneratedIdentity(rows) {
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

async function signUpImportedUser(row) {
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
  const authData = await authResponse.json();

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

async function deleteImportedAuthUsers(userIds) {
  await Promise.all(
    userIds.map((userId) =>
      supabaseFetch(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' }).catch(() => null),
    ),
  );
}

async function signUpImportedUsers(rows) {
  const createdUserIds = [];

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

async function importUsers(rows) {
  const { response, data } = await supabaseFetch('/rest/v1/user?on_conflict=id', {
    method: 'POST',
    body: rows,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  });

  if (!response.ok) {
    throw new Error(data?.message ?? 'Không thể import nhân sự.');
  }

  return Array.isArray(data) ? data.length : rows.length;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    json(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const authHeader = request.headers.authorization ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!accessToken) {
    json(response, 401, { error: 'Missing Supabase access token.' });
    return;
  }

  try {
    const uid = await getSupabaseUid(accessToken);

    if (!uid) {
      json(response, 401, { error: 'Invalid Supabase access token.' });
      return;
    }

    const role = await getImporterRole(uid);

    if (role !== 'super_admin') {
      json(response, 403, { error: 'Bạn không có quyền import nhân sự.' });
      return;
    }

    const body = await parseBody(request);
    const users = Array.isArray(body.users) ? body.users : [];

    if (users.length === 0) {
      json(response, 400, { error: 'Không có nhân sự nào để import.' });
      return;
    }

    if (users.length > MAX_IMPORT_USERS) {
      json(response, 400, { error: `Mỗi lần chỉ import tối đa ${MAX_IMPORT_USERS} nhân sự.` });
      return;
    }

    const rows = [];

    for (const [index, user] of users.entries()) {
      const result = normalizeUser(user, index);

      if (result.error) {
        json(response, 400, { error: result.error });
        return;
      }

      rows.push(result.data);
    }

    const duplicateEmails = findDuplicateEmails(rows);

    if (duplicateEmails.length > 0) {
      json(response, 400, {
        error: `File có email bị trùng: ${duplicateEmails.join(', ')}.`,
      });
      return;
    }

    const existingEmails = await getExistingEmails(rows.map((row) => row.email));

    if (existingEmails.length > 0) {
      json(response, 409, {
        error: `Email đã tồn tại trong hệ thống: ${existingEmails.join(', ')}.`,
      });
      return;
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

    json(response, 200, { importedCount });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : 'Không thể import nhân sự.',
    });
  }
}
