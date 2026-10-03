import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticationGuard, Role } from '@tmdjr/ngx-auth-client';
import { RequestKeys } from '@tmdjr/ngx-auth-client/enums/request-keys.enum';
import { Request } from 'express';

export const localMode = () =>
  process.env.DOCUMENT_LOCAL_DEV === 'true' &&
  process.env.NODE_ENV !== 'production';
export const localOrigins = [
  'https://admin.ngx-workshop.io',
  'http://localhost:4202',
  'http://127.0.0.1:4202',
];
export const localDatabaseUri = 'mongodb://127.0.0.1:27017/document_local';

export function assertLocalDatabase(): void {
  if (localMode() && process.env.MONGODB_URI !== localDatabaseUri) {
    throw new Error(
      'Local document mode requires the isolated document_local database on loopback'
    );
  }
}

@Injectable()
export class DocumentAuthGuard implements CanActivate {
  constructor(private readonly authentication: AuthenticationGuard) {}

  canActivate(context: ExecutionContext) {
    if (!localMode()) return this.authentication.canActivate(context);
    assertLocalDatabase();
    const request = context.switchToHttp().getRequest<Request>();
    if (
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
        request.socket.remoteAddress ?? ''
      ) ||
      (request.headers.origin !== undefined &&
        !localOrigins.includes(request.headers.origin))
    ) {
      throw new ForbiddenException(
        'Local development access requires loopback and an allowed origin'
      );
    }
    const localRequest = request as Request & {
      [RequestKeys.REQUEST_USER_KEY]: { sub: string; role: Role };
    };
    localRequest[RequestKeys.REQUEST_USER_KEY] = {
      sub: 'local-document-admin',
      role: Role.Admin,
    };
    return true;
  }
}
