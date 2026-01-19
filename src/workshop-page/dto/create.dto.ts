import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class WorkshopPageDto {
  @ApiProperty() _id: string;

  @ApiProperty()
  workshopGroupId: string;

  @ApiProperty({ default: 'Page' })
  name: string;

  @ApiProperty({ default: 0 })
  sortId: number;

  @ApiProperty({ default: 'PAGE' })
  pageType: string;

  @ApiProperty({ type: String, format: 'date-time' })
  lastUpdated: string;

  @ApiProperty({ description: 'Serialized JSON of the document blocks' })
  html: string;

  @ApiProperty() __v: number;
}

export class CreateWorkshopPageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workshopId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workshopGroupId: string;

  @ApiPropertyOptional({ default: 'Page' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sortId?: number;

  @ApiPropertyOptional({ default: 'PAGE' })
  @IsString()
  @IsOptional()
  pageType?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  lastUpdated?: string;

  @ApiPropertyOptional({
    description: 'Serialized JSON of the document blocks',
  })
  @IsString()
  @IsOptional()
  html?: string;
}

export class WorkshopPageIdentifierDto {
  @ApiProperty({ description: 'Object id of the workshop-page.' })
  @IsString()
  @IsNotEmpty()
  _id: string;

  @ApiProperty({ description: 'Display name of the workshop-page.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Position of the doc item in the section's list",
  })
  @Type(() => Number)
  @IsNumber()
  sortId: number;
}

export class EditPageNameUpdateWorkshopDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  _id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workshopGroupId: string;
}
