import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type SectionDocumentDoc = Section & Document;

@Schema()
export class Section {
  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: () => new Types.ObjectId(),
  })
  _id: Types.ObjectId | string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  sectionTitle: string;

  @Prop({ default: '' })
  sectionDescription: string;

  @Prop({ default: 0 })
  summary: number;

  @Prop({ default: '' })
  menuSvgPath: string;

  @Prop({ default: '' })
  headerSvgPath: string;

  @Prop({ default: () => new Date().toISOString() })
  categoriesLastUpdated: string;
}

export const SectionSchema = SchemaFactory.createForClass(Section);
