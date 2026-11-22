import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { DocumentAuthModule } from '../local-development/document-auth.module';
import {
  WorkshopPage,
  WorkshopPageSchema,
} from './schemas/workshop-page.schema';
import { WorkshopController } from './workshop-page.controller';
import { WorkshopDocumentService } from './workshop-page.service';

const generating = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    DocumentAuthModule,
    ...(generating
      ? []
      : [
          MongooseModule.forFeature([
            { name: WorkshopPage.name, schema: WorkshopPageSchema },
          ]),
        ]),
  ],
  controllers: [WorkshopController],
  providers: [
    WorkshopDocumentService,
    ...(generating
      ? [{ provide: getModelToken(WorkshopPage.name), useValue: {} }]
      : []),
  ],
  exports: [WorkshopDocumentService],
})
export class WorkshopModule {}
