import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNumber, ValidateIf } from 'class-validator';
import { CreateSectionDto, CreateWorkshopDto } from './create.dto';

export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {}

export class UpdateSectionDto extends PartialType(CreateSectionDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNumber()
  summary?: number;
}
