/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WorkshopDocumentIdentifierDto } from './WorkshopDocumentIdentifierDto';
export type UpdateWorkshopDto = {
    _id?: string;
    sectionId?: string;
    workshopDocumentGroupId?: string;
    sortId?: number;
    name?: string;
    summary?: string;
    thumbnail?: string;
    workshopDocuments?: Array<WorkshopDocumentIdentifierDto>;
    workshopDocumentsLastUpdated?: string;
};

