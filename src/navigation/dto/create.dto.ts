import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  WorkshopDocumentDto,
  WorkshopDocumentIdentifierDto,
} from '../../workshop-document/dto/create.dto';

export class SectionDto {
  @ApiProperty() _id: string;

  @ApiProperty()
  sectionTitle: string;

  @ApiProperty()
  summary: number;

  @ApiProperty()
  menuSvgPath: string;

  @ApiProperty()
  headerSvgPath: string;

  @ApiProperty({ type: String })
  categoriesLastUpdated: string;
}

export class CreateSectionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sectionTitle?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  summary?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  menuSvgPath?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  headerSvgPath?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  categoriesLastUpdated?: string;
}

export class WorkshopDto {
  @ApiProperty() _id: string;

  @ApiProperty()
  workshopDocumentGroupId: string;

  @ApiProperty()
  sectionId: string;

  @ApiProperty({ default: 0 })
  sortId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  summary: string;

  @ApiProperty({ default: 'https://via.placeholder.com/250/400' })
  thumbnail: string;

  @ApiProperty({ type: () => [WorkshopDocumentIdentifierDto] })
  workshopDocuments: WorkshopDocumentIdentifierDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  workshopDocumentsLastUpdated: Date;
}

export class CreateWorkshopDto {
  @ApiProperty()
  @IsOptional()
  _id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workshopDocumentGroupId?: string;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sortId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiPropertyOptional({ default: 'https://via.placeholder.com/250/400' })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ type: () => [WorkshopDocumentIdentifierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkshopDocumentIdentifierDto)
  @IsOptional()
  workshopDocuments?: WorkshopDocumentIdentifierDto[];

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  workshopDocumentsLastUpdated?: string;
}

export class PageParamsDto {
  @ApiProperty({ type: WorkshopDocumentDto })
  page: WorkshopDocumentDto;

  @ApiProperty()
  workshopId: string;
}
export class DeleteResultDto {
  @ApiProperty()
  acknowledged: boolean;

  @ApiProperty()
  deletedCount: number;
}

export class SectionsMapDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(SectionDto) },
  })
  sections: Record<string, SectionDto>;
}
