import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  Equals,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import {
  WorkshopJourneyIdentifierDto,
  WorkshopPageIdentifierDto,
} from '../../workshop-page/dto/create.dto';

export class AssessmentTestIdentifierDto extends WorkshopJourneyIdentifierDto {
  @ApiProperty({ enum: ['ASSESSMENT_TEST'] })
  @Equals('ASSESSMENT_TEST')
  kind: 'ASSESSMENT_TEST';

  @ApiProperty({
    description: 'Opaque assessment-test ID supplied by the frontend',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  resourceId: string;
}

export class CodingLabIdentifierDto extends WorkshopJourneyIdentifierDto {
  @ApiProperty({ enum: ['CODING_LAB'] })
  @Equals('CODING_LAB')
  kind: 'CODING_LAB';

  @ApiProperty({ description: 'Opaque coding-lab ID supplied by the frontend' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  resourceId: string;
}

export type WorkshopJourneyItem =
  | WorkshopPageIdentifierDto
  | AssessmentTestIdentifierDto
  | CodingLabIdentifierDto;

export const journeyItemSchema = {
  oneOf: [
    WorkshopPageIdentifierDto,
    AssessmentTestIdentifierDto,
    CodingLabIdentifierDto,
  ].map((model) => ({ $ref: getSchemaPath(model) })),
  discriminator: {
    propertyName: 'kind',
    mapping: {
      PAGE: getSchemaPath(WorkshopPageIdentifierDto),
      ASSESSMENT_TEST: getSchemaPath(AssessmentTestIdentifierDto),
      CODING_LAB: getSchemaPath(CodingLabIdentifierDto),
    },
  },
};

export class AddWorkshopReferenceDto {
  @ApiProperty()
  @IsMongoId()
  workshopId: string;

  @ApiProperty({ enum: ['ASSESSMENT_TEST', 'CODING_LAB'] })
  @IsIn(['ASSESSMENT_TEST', 'CODING_LAB'])
  kind: 'ASSESSMENT_TEST' | 'CODING_LAB';

  @ApiProperty({
    description: 'Opaque resource ID; no remote existence check is performed',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  resourceId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name: string;
}
