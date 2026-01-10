import { PartialType } from '@nestjs/swagger';
import { CreateWorkshopDocumentDto } from './create.dto';

export class UpdateWorkshopDocumentDto extends PartialType(
  CreateWorkshopDocumentDto
) {}
