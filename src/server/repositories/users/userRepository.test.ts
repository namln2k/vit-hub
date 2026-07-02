import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userRepository } from './userRepository';

const userRow = {
  id: 'user-1',
  email: 'member@example.com',
  first_name: 'An',
  last_name: 'Nguyen',
  middle_name: null,
  nickname: null,
  username: 'member',
  phone_number: null,
  school_name: null,
  enter_year: null,
  cohort: null,
  gender: null,
  avatar_url: null,
  avatar_key: null,
  role: 'member',
  status: 'active',
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('userRepository', () => {
  it('maps an account row without exposing the raw row shape', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          id: 'user-1',
          role: 'member',
          status: 'active',
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(userRepository.findAccountById('user-1')).resolves.toEqual({
      id: 'user-1',
      role: 'member',
      status: 'active',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/user?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer service-role-key',
        }),
      }),
    );
  });

  it('maps a profile row without exposing the raw row shape', async () => {
    const fetchMock = vi.fn(async () => Response.json([userRow]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(userRepository.findById('user-1')).resolves.toEqual({
      id: 'user-1',
      email: 'member@example.com',
      firstName: 'An',
      lastName: 'Nguyen',
      middleName: null,
      nickname: null,
      username: 'member',
      phoneNumber: null,
      schoolName: null,
      enterYear: null,
      cohort: null,
      gender: null,
      avatarUrl: null,
      avatarKey: null,
      role: 'member',
      status: 'active',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/id=eq\.user-1.*limit=1/),
      expect.any(Object),
    );
  });

  it('finds a profile by username case-insensitively', async () => {
    const fetchMock = vi.fn(async () => Response.json([userRow]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(userRepository.findByUsername('Member')).resolves.toMatchObject({
      id: 'user-1',
      username: 'member',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/username=ilike\.Member.*limit=1/),
      expect.any(Object),
    );
  });

  it('creates application profiles with fixed member and active account state', async () => {
    const fetchMock = vi.fn(async () => Response.json([userRow]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      userRepository.create({
        id: 'user-1',
        email: 'member@example.com',
        firstName: 'An',
        lastName: 'Nguyen',
        middleName: '',
        nickname: '',
        username: 'member',
        avatarUrl: '',
        avatarKey: '',
      }),
    ).resolves.toMatchObject({
      id: 'user-1',
      role: 'member',
      status: 'active',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('on_conflict=id'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Prefer: 'resolution=ignore-duplicates,return=representation',
        }),
        body: JSON.stringify({
          id: 'user-1',
          email: 'member@example.com',
          first_name: 'An',
          last_name: 'Nguyen',
          middle_name: '',
          nickname: '',
          username: 'member',
          phone_number: '-',
          school_name: '',
          enter_year: '',
          cohort: '',
          gender: null,
          avatar_url: '',
          avatar_key: '',
          role: 'member',
          status: 'active',
        }),
      }),
    );
  });

  it('returns exact existing emails for import conflict checks', async () => {
    const fetchMock = vi.fn(async () => Response.json([{ email: 'existing@example.com' }]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      userRepository.findExistingEmails(['existing@example.com', 'new@example.com']),
    ).resolves.toEqual(['existing@example.com']);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('email=in.%28%22existing%40example.com%22'),
      expect.any(Object),
    );
  });

  it('creates imported users as active members in one batch', async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json([userRow]);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      userRepository.createMany([
        {
          id: 'user-1',
          email: 'member@example.com',
          firstName: 'An',
          lastName: 'Nguyen',
          middleName: '',
          username: 'member',
          phoneNumber: '-',
          schoolName: '',
          enterYear: '',
          cohort: '',
          gender: null,
        },
      ]),
    ).resolves.toBe(1);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(requestInit?.body))).toEqual([
      expect.objectContaining({
        id: 'user-1',
        role: 'member',
        status: 'active',
      }),
    ]);
  });

  it('maps profile update input to persistence columns', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          ...userRow,
          nickname: 'New name',
          school_name: 'New school',
          gender: 1,
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      userRepository.updateProfile(
        'user-1',
        {
          nickname: 'New name',
          schoolName: 'New school',
          gender: 1,
        },
        '2026-06-18T10:00:00.000Z',
      ),
    ).resolves.toMatchObject({
      nickname: 'New name',
      schoolName: 'New school',
      gender: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('id=eq.user-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify({
          nickname: 'New name',
          school_name: 'New school',
          gender: 1,
          updated_at: '2026-06-18T10:00:00.000Z',
        }),
      }),
    );
  });

  it('maps the updated status representation to a repository record', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          id: 'user-1',
          status: 'disabled',
          updated_at: '2026-06-18T10:00:00.000Z',
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      userRepository.updateStatus('user-1', 'disabled', '2026-06-18T10:00:00.000Z'),
    ).resolves.toEqual({
      id: 'user-1',
      status: 'disabled',
      updatedAt: '2026-06-18T10:00:00.000Z',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('select=id%2Cstatus%2Cupdated_at'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify({
          status: 'disabled',
          updated_at: '2026-06-18T10:00:00.000Z',
        }),
      }),
    );
  });

  it('maps paginated search rows and reads the exact count', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([userRow], {
        headers: {
          'content-range': '0-0/12',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      userRepository.search({
        search: 'member',
        limit: 1,
        offset: 0,
      }),
    ).resolves.toEqual({
      records: [
        {
          id: 'user-1',
          email: 'member@example.com',
          firstName: 'An',
          lastName: 'Nguyen',
          middleName: null,
          nickname: null,
          username: 'member',
          phoneNumber: null,
          schoolName: null,
          enterYear: null,
          cohort: null,
          gender: null,
          avatarUrl: null,
          avatarKey: null,
          role: 'member',
          status: 'active',
        },
      ],
      total: 12,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/limit=1.*offset=0.*or=/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Prefer: 'count=exact',
        }),
      }),
    );
  });
});
