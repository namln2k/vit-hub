import { randomUUID } from 'node:crypto';
import { getRequiredR2Config, getSupabaseAdminServerConfig } from '@/server/env';
import { jsonResponse, readJsonBody } from '@/server/api';
import { createPresignedPutUrl, getExtension, getPublicBaseUrl } from '@/server/r2';
import { supabaseFetch } from '@/server/supabase';

export const runtime = 'nodejs';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024;

interface RegisterBody {
  email?: unknown;
  emailRedirectTo?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  middleName?: unknown;
  nickname?: unknown;
  username?: unknown;
  avatar?: {
    contentType?: unknown;
    dataBase64?: unknown;
    size?: unknown;
  } | null;
}

interface RegisterData {
  email: string;
  emailRedirectTo: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
}

interface UploadedAvatar {
  avatarKey: string;
  avatarUrl: string;
}

function getAuthErrorMessage(error: unknown) {
  const message = typeof error === 'string' ? error : '';

  if (!message) {
    return 'Không thể tạo tài khoản Supabase.';
  }

  if (/user already registered|already registered/i.test(message)) {
    return 'Email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.';
  }

  if (/error sending confirmation email/i.test(message)) {
    return 'Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP trong Supabase Auth.';
  }

  return message;
}

function readString(body: RegisterBody, key: keyof RegisterData) {
  return typeof body[key] === 'string' ? body[key].trim() : '';
}

function validateRegisterBody(body: RegisterBody) {
  const data: RegisterData = {
    email: readString(body, 'email'),
    emailRedirectTo: readString(body, 'emailRedirectTo'),
    password: typeof body.password === 'string' ? body.password : '',
    firstName: readString(body, 'firstName'),
    lastName: readString(body, 'lastName'),
    middleName: readString(body, 'middleName'),
    nickname: readString(body, 'nickname'),
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

function validateAvatar(avatar: RegisterBody['avatar']) {
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

async function usernameExists(username: string) {
  const query = new URLSearchParams({
    select: 'id',
    username: `eq.${username}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<Array<{ id: string }>>(
    `/rest/v1/user?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể kiểm tra username.');
  }

  return Array.isArray(data) && data.length > 0;
}

function getUserMetadata(userData: RegisterData, avatar: UploadedAvatar | null) {
  const fullName = `${userData.lastName} ${userData.middleName} ${userData.firstName}`.trim();

  return {
    avatar_key: avatar?.avatarKey ?? '',
    avatar_url: avatar?.avatarUrl ?? '',
    first_name: userData.firstName,
    full_name: fullName,
    last_name: userData.lastName,
    middle_name: userData.middleName,
    nickname: userData.nickname,
    role: 'member',
    username: userData.username,
  };
}

function normalizeSignUpResponse(authData: Record<string, unknown>) {
  const rawUser =
    authData.user && typeof authData.user === 'object' && 'id' in authData.user
      ? (authData.user as { id?: string })
      : authData.id
        ? ({ id: String(authData.id) } as { id: string })
        : null;
  const user = rawUser?.id ? { id: rawUser.id } : null;
  const session =
    authData.session && typeof authData.session === 'object'
      ? (authData.session as { access_token?: string; refresh_token?: string })
      : authData.access_token && authData.refresh_token
        ? {
            access_token: String(authData.access_token),
            refresh_token: String(authData.refresh_token),
          }
        : null;

  return { user, session };
}

async function signUpUser(userData: RegisterData, password: string) {
  const { supabaseUrl, publishableKey } = getSupabaseAdminServerConfig();
  const signupUrl = new URL(`${supabaseUrl}/auth/v1/signup`);

  if (userData.emailRedirectTo) {
    signupUrl.searchParams.set('redirect_to', userData.emailRedirectTo);
  }

  const authResponse = await fetch(signupUrl, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userData.email,
      password,
      data: getUserMetadata(userData, null),
    }),
  });
  const authData = (await authResponse.json()) as Record<string, unknown>;

  if (!authResponse.ok) {
    throw new Error(
      getAuthErrorMessage(authData.error_description ?? authData.msg ?? authData.error),
    );
  }

  const normalizedAuthData = normalizeSignUpResponse(authData);

  if (!normalizedAuthData.user?.id) {
    throw new Error('Không thể tạo tài khoản Supabase.');
  }

  return {
    user: normalizedAuthData.user,
    session: normalizedAuthData.session,
  };
}

async function updateAuthUserMetadata(uid: string, userData: RegisterData, avatar: UploadedAvatar) {
  const { response } = await supabaseFetch(`/auth/v1/admin/users/${uid}`, {
    method: 'PUT',
    body: {
      user_metadata: getUserMetadata(userData, avatar),
    },
  });

  if (!response.ok) {
    throw new Error('Không thể cập nhật metadata người dùng.');
  }
}

async function uploadAvatar(uid: string, avatarBuffer: Buffer, contentType: string) {
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
    body: new Uint8Array(avatarBuffer),
  });

  if (!uploadResponse.ok) {
    throw new Error('Không thể upload ảnh đại diện lên Cloudflare R2.');
  }

  return {
    avatarKey,
    avatarUrl: `${getPublicBaseUrl()}/${avatarKey}`,
  };
}

async function upsertUser(uid: string, userData: RegisterData, avatar: UploadedAvatar | null) {
  const row = {
    id: uid,
    email: userData.email,
    first_name: userData.firstName,
    last_name: userData.lastName,
    middle_name: userData.middleName,
    nickname: userData.nickname,
    username: userData.username,
    phone_number: '-',
    school_name: '',
    enter_year: '',
    cohort: '',
    gender: null,
    avatar_url: avatar?.avatarUrl ?? '',
    avatar_key: avatar?.avatarKey ?? '',
    role: 'member',
  };
  const { response } = await supabaseFetch('/rest/v1/user?on_conflict=id', {
    method: 'POST',
    body: row,
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể lưu hồ sơ người dùng.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<RegisterBody>(request, 1_500_000);
    const registerResult = validateRegisterBody(body);

    if (registerResult.error || !registerResult.data) {
      return jsonResponse({ error: registerResult.error }, 400);
    }

    const avatarResult = validateAvatar(body.avatar);

    if (avatarResult.error) {
      return jsonResponse({ error: avatarResult.error }, 400);
    }

    if (await usernameExists(registerResult.data.username)) {
      return jsonResponse({ error: 'Username đã tồn tại. Vui lòng chọn username khác.' }, 409);
    }

    const authData = await signUpUser(registerResult.data, registerResult.data.password);
    const uid = authData.user.id;
    const avatar = avatarResult.avatarBuffer
      ? await uploadAvatar(uid, avatarResult.avatarBuffer, avatarResult.contentType)
      : null;

    if (avatar) {
      await updateAuthUserMetadata(uid, registerResult.data, avatar);
    }

    await upsertUser(uid, registerResult.data, avatar);

    return jsonResponse({
      needsEmailConfirmation: !authData.session,
      session: authData.session
        ? {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          }
        : null,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Không thể đăng ký tài khoản.',
      },
      500,
    );
  }
}
