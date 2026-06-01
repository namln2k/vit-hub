import { randomUUID } from 'node:crypto';
import { createPresignedPutUrl, getExtension, getPublicBaseUrl } from '../avatars/presign.js';
import { getSupabaseAdminServerConfig } from '../supabase-env.js';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024;

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

function getRequiredR2Config() {
  const requiredEnv = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_BASE_URL',
  ];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);

  if (missingEnv.length > 0) {
    throw new Error(`Missing R2 environment variables: ${missingEnv.join(', ')}`);
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
  };
}

function getAuthErrorMessage(error) {
  if (!error) {
    return 'Không thể tạo tài khoản Supabase.';
  }

  if (/user already registered|already registered/i.test(error)) {
    return 'Email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.';
  }

  if (/error sending confirmation email/i.test(error)) {
    return 'Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP trong Supabase Auth.';
  }

  return error;
}

function readString(body, key) {
  return typeof body[key] === 'string' ? body[key].trim() : '';
}

function validateRegisterBody(body) {
  const data = {
    email: readString(body, 'email'),
    emailRedirectTo: readString(body, 'emailRedirectTo'),
    password: typeof body.password === 'string' ? body.password : '',
    firstName: readString(body, 'firstName'),
    lastName: readString(body, 'lastName'),
    middleName: readString(body, 'middleName'),
    username: readString(body, 'username'),
  };

  if (!data.email || !data.email.includes('@')) {
    return { error: 'Email không hợp lệ.' };
  }

  if (data.password.length < 8) {
    return { error: 'Mật khẩu phải có ít nhất 8 ký tự.' };
  }

  if (!data.firstName || !data.lastName) {
    return { error: 'Họ và tên không được để trống.' };
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
    return { error: 'Username phải có 3-20 ký tự và chỉ chứa chữ cái, số, dấu gạch dưới.' };
  }

  return { data };
}

function validateAvatar(avatar) {
  if (!avatar) {
    return { avatarBuffer: null };
  }

  const contentType = typeof avatar.contentType === 'string' ? avatar.contentType : '';
  const dataBase64 = typeof avatar.dataBase64 === 'string' ? avatar.dataBase64 : '';
  const declaredSize = Number(avatar.size);
  const maxUploadBytes =
    Number(process.env.R2_FREE_TIER_MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return { error: 'Ảnh đại diện phải là JPG, PNG hoặc WebP.' };
  }

  if (!Number.isSafeInteger(declaredSize) || declaredSize <= 0 || declaredSize > maxUploadBytes) {
    return { error: `Ảnh đại diện tối đa ${maxUploadBytes} bytes.` };
  }

  const avatarBuffer = Buffer.from(dataBase64, 'base64');

  if (avatarBuffer.length !== declaredSize || avatarBuffer.length > maxUploadBytes) {
    return { error: 'Dung lượng ảnh đại diện không hợp lệ.' };
  }

  return { avatarBuffer, contentType };
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

async function usernameExists(username) {
  const query = new URLSearchParams({
    select: 'id',
    username: `eq.${username}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch(`/rest/v1/profiles?${query.toString()}`, {});

  if (!response.ok) {
    throw new Error(data?.message ?? 'Không thể kiểm tra username.');
  }

  return Array.isArray(data) && data.length > 0;
}

function getUserMetadata(profile, avatar) {
  const fullName = `${profile.lastName} ${profile.middleName} ${profile.firstName}`.trim();

  return {
    avatar_key: avatar?.avatarKey ?? '',
    avatar_url: avatar?.avatarUrl ?? '',
    first_name: profile.firstName,
    full_name: fullName,
    last_name: profile.lastName,
    middle_name: profile.middleName,
    role: 'member',
    username: profile.username,
  };
}

function normalizeSignUpResponse(authData) {
  const user = authData?.user?.id ? authData.user : authData?.id ? authData : null;
  const session =
    authData?.session ??
    (authData?.access_token && authData?.refresh_token
      ? {
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
        }
      : null);

  return { user, session };
}

async function signUpUser(profile, password) {
  const { supabaseUrl, publishableKey } = getSupabaseAdminServerConfig();
  const signupUrl = new URL(`${supabaseUrl}/auth/v1/signup`);

  if (profile.emailRedirectTo) {
    signupUrl.searchParams.set('redirect_to', profile.emailRedirectTo);
  }

  const authResponse = await fetch(signupUrl, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: profile.email,
      password,
      data: getUserMetadata(profile, null),
    }),
  });

  const authData = await authResponse.json();

  if (!authResponse.ok) {
    throw new Error(
      getAuthErrorMessage(authData.error_description ?? authData.msg ?? authData.error),
    );
  }

  const normalizedAuthData = normalizeSignUpResponse(authData);

  if (!normalizedAuthData.user?.id) {
    throw new Error('Không thể tạo tài khoản Supabase.');
  }

  return normalizedAuthData;
}

async function updateAuthUserMetadata(uid, profile, avatar) {
  const { response, data } = await supabaseFetch(`/auth/v1/admin/users/${uid}`, {
    method: 'PUT',
    body: {
      user_metadata: getUserMetadata(profile, avatar),
    },
  });

  if (!response.ok) {
    throw new Error(data?.message ?? 'Không thể cập nhật metadata người dùng.');
  }
}

async function uploadAvatar(uid, avatarBuffer, contentType) {
  const r2 = getRequiredR2Config();
  const avatarKey = `avatars/${uid}/${randomUUID()}.${getExtension(contentType)}`;
  const uploadUrl = createPresignedPutUrl({
    bucketName: r2.bucketName,
    accountId: r2.accountId,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    key: avatarKey,
  });
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: avatarBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error('Không thể upload ảnh đại diện lên Cloudflare R2.');
  }

  return {
    avatarKey,
    avatarUrl: `${getPublicBaseUrl()}/${avatarKey}`,
  };
}

async function upsertProfile(uid, profile, avatar) {
  const row = {
    id: uid,
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    middle_name: profile.middleName,
    username: profile.username,
    avatar_url: avatar?.avatarUrl ?? '',
    avatar_key: avatar?.avatarKey ?? '',
    role: 'member',
  };
  const { response, data } = await supabaseFetch('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    body: row,
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
  });

  if (!response.ok) {
    throw new Error(data?.message ?? 'Không thể lưu hồ sơ người dùng.');
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    json(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const body = await parseBody(request);
    const registerResult = validateRegisterBody(body);

    if (registerResult.error) {
      json(response, 400, { error: registerResult.error });
      return;
    }

    const avatarResult = validateAvatar(body.avatar);

    if (avatarResult.error) {
      json(response, 400, { error: avatarResult.error });
      return;
    }

    if (await usernameExists(registerResult.data.username)) {
      json(response, 409, { error: 'Username đã tồn tại. Vui lòng chọn username khác.' });
      return;
    }

    const authData = await signUpUser(registerResult.data, registerResult.data.password);

    const avatar = avatarResult.avatarBuffer
      ? await uploadAvatar(authData.user.id, avatarResult.avatarBuffer, avatarResult.contentType)
      : null;

    if (avatar) {
      await updateAuthUserMetadata(authData.user.id, registerResult.data, avatar);
    }

    await upsertProfile(authData.user.id, registerResult.data, avatar);

    json(response, 200, {
      needsEmailConfirmation: !authData.session,
      session: authData.session
        ? {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          }
        : null,
    });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : 'Không thể đăng ký tài khoản.',
    });
  }
}
