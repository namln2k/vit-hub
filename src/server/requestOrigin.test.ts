import { describe, expect, it } from 'vitest';
import { getRequestOriginFromHeaders } from './requestOrigin';

describe('getRequestOriginFromHeaders', () => {
  it('prefers the explicit browser origin header', () => {
    const headers = new Headers({
      origin: 'http://127.0.0.1:3000',
      host: '0.0.0.0:3000',
    });

    expect(getRequestOriginFromHeaders(headers)).toBe('http://127.0.0.1:3000');
  });

  it('maps 0.0.0.0 back to localhost when only host headers are available', () => {
    const headers = new Headers({
      host: '0.0.0.0:3000',
    });

    expect(getRequestOriginFromHeaders(headers)).toBe('http://localhost:3000');
  });

  it('ignores referer headers from third-party providers', () => {
    const headers = new Headers({
      referer: 'https://accounts.google.com/some/path',
      host: 'localhost:3000',
    });

    expect(getRequestOriginFromHeaders(headers)).toBe('http://localhost:3000');
  });

  it('uses forwarded proto when present', () => {
    const headers = new Headers({
      host: 'localhost:3000',
      'x-forwarded-proto': 'http',
    });

    expect(getRequestOriginFromHeaders(headers)).toBe('http://localhost:3000');
  });
});
