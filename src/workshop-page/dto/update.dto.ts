import { PartialType } from '@nestjs/swagger';
import { CreateWorkshopPageDto } from './create.dto';

export class UpdateWorkshopPageDto extends PartialType(CreateWorkshopPageDto) {}
