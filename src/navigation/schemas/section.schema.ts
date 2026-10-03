import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SectionDocumentDoc = Section & Document;

@Schema()
export class Section {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  sectionTitle: string;

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
