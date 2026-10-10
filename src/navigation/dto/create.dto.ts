import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { journeyItemSchema, WorkshopJourneyItem } from './journey.dto';

export class SectionDto {
  @ApiProperty() _id: string;

  @ApiProperty()
  sectionTitle: string;

  @ApiProperty({ default: '' })
  sectionDescription: string;

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
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    description: 'Display name of the section',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  sectionTitle: string;

  @ApiPropertyOptional({
    description: 'Description of the section; an empty string clears it',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  sectionDescription?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  menuSvgPath?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  headerSvgPath?: string;
}

export class SectionParamsDto {
  @ApiProperty({
    description: 'Section key: a Mongo ObjectId string or a legacy string key',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/\S/, { message: 'id must not be blank' })
  id: string;
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

  @ApiProperty({ default: 1, minimum: 1, maximum: 20, type: 'integer' })
  level: number;

  @ApiProperty()
  summary: string;

  @ApiProperty({ default: 'https://via.placeholder.com/250/400' })
  thumbnail: string;

  @ApiProperty({ type: 'array', items: journeyItemSchema })
  workshopDocuments: WorkshopJourneyItem[];

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

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 20, type: 'integer' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  level?: number;

  @ApiPropertyOptional({ default: 'https://via.placeholder.com/250/400' })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  workshopDocumentsLastUpdated?: string;
}

export class DeletePageParamsDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;

  @ApiProperty()
  @IsMongoId()
  workshopId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
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
