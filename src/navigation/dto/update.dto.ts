import { PartialType } from '@nestjs/swagger';
import { CreateSectionDto, CreateWorkshopDto } from './create.dto';

export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}
