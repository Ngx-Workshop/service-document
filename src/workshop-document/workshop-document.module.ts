import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WorkshopDocumentDoc,
  WorkshopDocumentSchema,
} from './schemas/workshop-document.schema';
import { WorkshopController } from './workshop-document.controller';
import { WorkshopDocumentService } from './workshop-document.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkshopDocumentDoc.name, schema: WorkshopDocumentSchema },
    ]),
  ],
  controllers: [WorkshopController],
  providers: [WorkshopDocumentService],
})
export class WorkshopModule {}
