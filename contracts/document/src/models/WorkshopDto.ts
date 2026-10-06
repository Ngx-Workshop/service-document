/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssessmentTestIdentifierDto } from './AssessmentTestIdentifierDto';
import type { CodingLabIdentifierDto } from './CodingLabIdentifierDto';
import type { WorkshopPageIdentifierDto } from './WorkshopPageIdentifierDto';
export type WorkshopDto = {
    _id: string;
    workshopDocumentGroupId: string;
    sectionId: string;
    sortId: number;
    name: string;
    summary: string;
    thumbnail: string;
    workshopDocuments: Array<(WorkshopPageIdentifierDto | AssessmentTestIdentifierDto | CodingLabIdentifierDto)>;
    workshopDocumentsLastUpdated: string;
};

