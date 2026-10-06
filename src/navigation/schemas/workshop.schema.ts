import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { WorkshopJourneyItem } from '../dto/journey.dto';
import { Schema as MongoSchema } from 'mongoose';

export type TWorkshopDocument = HydratedDocument<Workshop>;

@Schema()
export class Workshop {
  @Prop()
  workshopDocumentGroupId: string;

  @Prop({ required: true })
  sectionId: string;

  @Prop({
    default: () => 0,
  })
  sortId: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  summary: string;

  @Prop({
    required: true,
    default: 'https://via.placeholder.com/250/400',
  })
  thumbnail: string;

  @Prop({
    type: [
      new MongoSchema(
        {
          _id: { type: String, required: true },
          kind: {
            type: String,
            enum: ['PAGE', 'ASSESSMENT_TEST', 'CODING_LAB'],
            required: true,
          },
          name: { type: String, required: true },
          sortId: { type: Number, required: true },
          resourceId: {
            type: String,
            required: function (this: { kind: string }) {
              return this.kind !== 'PAGE';
            },
          },
        },
        { _id: false }
      ),
    ],
    default: [],
  })
  workshopDocuments: WorkshopJourneyItem[];

  @Prop()
  workshopDocumentsLastUpdated: Date;
}

export const WorkshopSchema = SchemaFactory.createForClass(Workshop);

WorkshopSchema.pre('save', function () {
  if (this.isNew) {
    this.workshopDocumentGroupId = toSpinalCase(this.name);
  }
});
// todo: move this to a utils file
export function toSpinalCase(str: string): string {
  return str
    .replace(/^[\W_]+|[\W_]+$|([\W_]+)/g, ($0, $1) => {
      return $1 ? '-' : '';
    })
    .replace(/([a-z])(?=[A-Z])/g, '$1-')
    .toLowerCase();
}
