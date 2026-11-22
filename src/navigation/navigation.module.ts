import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { WorkshopModule } from '../workshop-page/workshop-page.module';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { Section, SectionSchema } from './schemas/section.schema';
import { Workshop, WorkshopSchema } from './schemas/workshop.schema';

const generating = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    WorkshopModule,
    ...(generating
      ? []
      : [
          MongooseModule.forFeature([
            { name: Section.name, schema: SectionSchema },
            { name: Workshop.name, schema: WorkshopSchema },
          ]),
        ]),
  ],
  controllers: [NavigationController],
  providers: [
    NavigationService,
    // Generation inspects metadata only; these models must never serve requests.
    ...(generating
      ? [
          { provide: getModelToken(Section.name), useValue: {} },
          { provide: getModelToken(Workshop.name), useValue: {} },
        ]
      : []),
  ],
})
export class NavigationModule {}
