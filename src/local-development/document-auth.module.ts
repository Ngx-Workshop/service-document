import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NgxAuthClientModule, RolesGuard } from '@tmdjr/ngx-auth-client';
import { DocumentAuthGuard } from './document-auth.guard';

@Module({
  imports: [NgxAuthClientModule],
  providers: [
    DocumentAuthGuard,
    { provide: APP_GUARD, useExisting: DocumentAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
  ],
})
export class DocumentAuthModule {}
