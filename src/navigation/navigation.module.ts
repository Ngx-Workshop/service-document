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
  WorkshopPage,
  WorkshopPageSchema,
} from '../workshop-page/schemas/workshop-page.schema';
import { WorkshopDocumentService } from '../workshop-page/workshop-page.service';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { Section, SectionSchema } from './schemas/section.schema';
import { Workshop, WorkshopSchema } from './schemas/workshop.schema';

const SCHEMA_IMPORTS =
  process.env.GENERATE_OPENAPI === 'true'
    ? []
    : [
        MongooseModule.forFeature([
          { name: Section.name, schema: SectionSchema },
          { name: Workshop.name, schema: WorkshopSchema },
          { name: WorkshopPage.name, schema: WorkshopPageSchema },
        ]),
      ];
// When generating OpenAPI, stub out the Mongoose model and the guard
const FAKE_PROVIDERS =
  process.env.GENERATE_OPENAPI === 'true'
    ? [
        {
          provide: getModelToken(Section.name),
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
        {
          provide: getModelToken(Workshop.name),
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
        {
          provide: getModelToken(WorkshopPage.name),
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
  controllers: [NavigationController],
  providers: [
    NavigationService,
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
export class NavigationModule {}
