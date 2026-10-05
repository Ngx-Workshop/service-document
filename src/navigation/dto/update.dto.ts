import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNumber, IsString, ValidateIf } from 'class-validator';
import { CreateSectionDto, CreateWorkshopDto } from './create.dto';

export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {}

export class UpdateSectionDto extends PartialType(CreateSectionDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNumber()
  summary?: number;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  menuSvgPath?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  headerSvgPath?: string;
}
