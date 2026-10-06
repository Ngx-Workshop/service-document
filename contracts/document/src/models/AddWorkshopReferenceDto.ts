/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AddWorkshopReferenceDto = {
    workshopId: string;
    kind: 'ASSESSMENT_TEST' | 'CODING_LAB';
    /**
     * Opaque resource ID; no remote existence check is performed
     */
    resourceId: string;
    name: string;
};

