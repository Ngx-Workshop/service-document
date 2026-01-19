import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TWorkshopPageDocument = HydratedDocument<WorkshopPage>;

@Schema()
export class WorkshopPage {
  @Prop({ required: true })
  workshopGroupId: string;

  @Prop({ default: () => 'Page' })
  name: string;

  @Prop({ default: () => 0 })
  sortId: number;

  @Prop({ default: () => 'PAGE' })
  pageType: string;

  @Prop({ default: () => Date.now() })
  lastUpdated: Date;

  @Prop({
    default: () => JSON.stringify(defaultWorkshopDocumentHtml),
  })
  html: string;
}

export const WorkshopPageSchema = SchemaFactory.createForClass(WorkshopPage);

const defaultWorkshopDocumentHtml = [
  {
    blockId: 'eftkta822ke',
    sortIndex: 0,
    name: 'NgxEditorjsHeaderBlockMediator',
    dataClean: 'Create a Magical Workshop&nbsp;🪄',
  },
];
