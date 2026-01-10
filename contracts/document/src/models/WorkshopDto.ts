/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WorkshopDocumentIdentifierDto } from './WorkshopDocumentIdentifierDto';
export type WorkshopDto = {
    _id: string;
    workshopDocumentGroupId: string;
    sectionId: string;
    sortId: number;
    name: string;
    summary: string;
    thumbnail: string;
    workshopDocuments: Array<WorkshopDocumentIdentifierDto>;
    workshopDocumentsLastUpdated: string;
};

