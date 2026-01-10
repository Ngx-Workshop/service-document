import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import {
  AuthenticationGuard,
  NgxAuthClientModule,
  RemoteAuthGuard,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import {
  WorkshopDocument,
  WorkshopDocumentSchema,
} from './schemas/workshop-document.schema';
import { WorkshopController } from './workshop-document.controller';
import { WorkshopDocumentService } from './workshop-document.service';

const SCHEMA_IMPORTS =
  process.env.GENERATE_OPENAPI === 'true'
    ? []
    : [
        MongooseModule.forFeature([
          { name: WorkshopDocument.name, schema: WorkshopDocumentSchema },
        ]),
      ];
// When generating OpenAPI, stub out the Mongoose model and the guard
const FAKE_PROVIDERS =
  process.env.GENERATE_OPENAPI === 'true'
    ? [
        {
          provide: getModelToken(WorkshopDocument.name),
          // Minimal fake the service can accept; if service calls methods during generation (it shouldn't), add no-op fns
          useValue: {
            // common Mongoose methods we might accidentally touch
            find: () => ({ exec: async () => [] }),
            findById: () => ({ exec: async () => null }),
            findByIdAndUpdate: () => ({ exec: async () => null }),
            findOne: () => ({ exec: async () => null }),
          },
        },
        {
          // In case the guard has runtime deps — make it a no-op
          provide: RemoteAuthGuard,
          useValue: { canActivate: () => true },
        },
      ]
    : [];

@Module({
  imports: [HttpModule, NgxAuthClientModule, ...SCHEMA_IMPORTS],
  controllers: [WorkshopController],
  providers: [
    WorkshopDocumentService,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    ...FAKE_PROVIDERS,
  ],
})
export class WorkshopModule {}
