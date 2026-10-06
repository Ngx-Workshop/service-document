/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CodingLabIdentifierDto = {
    /**
     * Workshop entry ID; for PAGE entries this is the document page ID.
     */
    _id: string;
    /**
     * Workshop navigation label.
     */
    name: string;
    /**
     * Position of the entry in the workshop journey
     */
    sortId: number;
    kind: 'CODING_LAB';
    /**
     * Opaque coding-lab ID supplied by the frontend
     */
    resourceId: string;
};

