import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WorkshopDocumentDoc,
  WorkshopDocumentSchema,
} from '../workshop-document/schemas/workshop-document.schema';
import { WorkshopDocumentService } from '../workshop-document/workshop-document.service';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { Section, SectionSchema } from './schemas/section.schema';
import { WorkshopDoc, WorkshopSchema } from './schemas/workshop.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Section.name, schema: SectionSchema },
      { name: WorkshopDoc.name, schema: WorkshopSchema },
      { name: WorkshopDocumentDoc.name, schema: WorkshopDocumentSchema },
    ]),
  ],
  controllers: [NavigationController],
  providers: [NavigationService, WorkshopDocumentService],
})
export class NavigationModule {}
