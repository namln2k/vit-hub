import 'server-only';

export const SERVICE_ERROR_CODES = [
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'DOMAIN_VALIDATION',
  'INFRASTRUCTURE',
] as const;

export type ServiceErrorCode = (typeof SERVICE_ERROR_CODES)[number];

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class AuthenticationRequiredError extends ServiceError {
  constructor(message = 'Bạn cần đăng nhập để thực hiện thao tác này.') {
    super('AUTHENTICATION_REQUIRED', message);
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super('FORBIDDEN', message);
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, resourceId?: string) {
    super(
      'NOT_FOUND',
      resourceId ? `Không tìm thấy ${resource} "${resourceId}".` : `Không tìm thấy ${resource}.`,
    );
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super('CONFLICT', message);
  }
}

export class DomainValidationError extends ServiceError {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super('DOMAIN_VALIDATION', message);
  }
}

export class InfrastructureError extends ServiceError {
  constructor(message = 'Không thể hoàn tất thao tác lúc này.', options?: ErrorOptions) {
    super('INFRASTRUCTURE', message, options);
  }
}
