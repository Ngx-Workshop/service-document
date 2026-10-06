import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  AuthenticationGuard,
  RemoteAuthGuard,
  RolesGuard,
  Role,
} from '@tmdjr/ngx-auth-client';
import { RequestKeys } from '@tmdjr/ngx-auth-client/enums/request-keys.enum';
import { model, Types } from 'mongoose';
import { Request } from 'express';
import { Server } from 'node:http';
import * as request from 'supertest';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { Section } from './schemas/section.schema';
import { Workshop, WorkshopSchema } from './schemas/workshop.schema';
import { WorkshopJourneyItem } from './dto/journey.dto';
import { WorkshopDocumentService } from '../workshop-page/workshop-page.service';

const id = new Types.ObjectId().toString();
const pageId = new Types.ObjectId().toString();
const testId = new Types.ObjectId().toString();
const labId = new Types.ObjectId().toString();
type AppendPipeline = {
  $set: {
    workshopDocuments: {
      $concatArrays: [
        object,
        [
          {
            _id: { $literal: string };
            kind: { $literal: string };
            resourceId: { $literal: string };
            name: { $literal: string };
          },
        ],
      ];
    };
  };
}[];
type JourneyFilter = {
  __v: number;
  workshopDocuments: { $elemMatch: { _id: string } } & WorkshopJourneyItem[];
};
const items: WorkshopJourneyItem[] = [
  { _id: pageId, kind: 'PAGE', name: 'Intro', sortId: 0 },
  {
    _id: testId,
    kind: 'ASSESSMENT_TEST',
    resourceId: '$test',
    name: 'Quiz',
    sortId: 1,
  },
  {
    _id: labId,
    kind: 'CODING_LAB',
    resourceId: 'opaque-lab',
    name: 'Practice',
    sortId: 2,
  },
];
const WorkshopModel = model('WorkshopJourneyTest', WorkshopSchema);

describe('Mixed workshop journey', () => {
  let app: INestApplication<Server>;
  let service: NavigationService;
  const parent = () =>
    new WorkshopModel({
      _id: id,
      sectionId: 'angular',
      name: 'Journey',
      summary: 'Learn',
      workshopDocuments: items,
      workshopDocumentsLastUpdated: new Date(),
      __v: 2,
    });
  const workshops = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn<
      Promise<unknown>,
      [string, AppendPipeline, object]
    >(),
    findOneAndUpdate: jest.fn<
      Promise<unknown>,
      [JourneyFilter, { workshopDocuments: WorkshopJourneyItem[] }, object]
    >(),
    deleteOne: jest.fn(),
    find: jest.fn(),
  };
  const documents = {
    deleteOne: jest.fn(),
    deleteMany: jest.fn<Promise<void>, [WorkshopJourneyItem[]]>(),
    createWorkshopDocument: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [NavigationController],
      providers: [
        NavigationService,
        Reflector,
        AuthenticationGuard,
        RolesGuard,
        {
          provide: RemoteAuthGuard,
          useValue: {
            canActivate(context: ExecutionContext) {
              const req = context.switchToHttp().getRequest<Request>();
              if (!req.headers['x-test-role']) return false;
              req[RequestKeys.REQUEST_USER_KEY] = {
                role: req.headers['x-test-role'],
              };
              return true;
            },
          },
        },
        { provide: getModelToken(Section.name), useValue: {} },
        { provide: getModelToken(Workshop.name), useValue: workshops },
        { provide: WorkshopDocumentService, useValue: documents },
      ],
    }).compile();
    service = module.get(NavigationService);
    app = module.createNestApplication<INestApplication<Server>>();
    app.useLogger(false);
    app.useGlobalGuards(
      module.get(AuthenticationGuard),
      module.get(RolesGuard)
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
    );
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    workshops.findById.mockResolvedValue(parent());
    workshops.findByIdAndUpdate.mockResolvedValue(parent());
    workshops.findOneAndUpdate.mockResolvedValue(parent());
    documents.deleteOne.mockResolvedValue({
      acknowledged: true,
      deletedCount: 1,
    });
  });
  afterAll(async () => {
    await app.close();
  });

  const post = (route: string, body: unknown, role: string = Role.Admin) =>
    request(app.getHttpServer())
      .post(`/navigation/page/${route}`)
      .set('x-test-role', role)
      .send(body as object);
  const reference = {
    workshopId: id,
    kind: 'ASSESSMENT_TEST',
    resourceId: '$opaque-id',
    name: '$Quiz',
  };

  it.each(['ASSESSMENT_TEST', 'CODING_LAB'])(
    'appends %s with literal opaque strings and server ID/position',
    async (kind) => {
      await post('add-reference', { ...reference, kind }).expect(201);
      const [workshopId, pipeline] = workshops.findByIdAndUpdate.mock.calls[0];
      expect(workshopId).toBe(id);
      const entry = pipeline[0].$set.workshopDocuments.$concatArrays[1][0];
      expect(entry.kind).toEqual({ $literal: kind });
      expect(entry.resourceId).toEqual({ $literal: reference.resourceId });
      expect(entry.name).toEqual({ $literal: reference.name });
      expect(Types.ObjectId.isValid(entry._id.$literal)).toBe(true);
      expect(documents.createWorkshopDocument).not.toHaveBeenCalled();
      expect(documents.deleteOne).not.toHaveBeenCalled();
    }
  );
  it('assigns distinct entry IDs for repeated resources', async () => {
    await service.addReference(reference as never);
    await service.addReference(reference as never);
    const ids = workshops.findByIdAndUpdate.mock.calls.map(
      ([, pipeline]) =>
        pipeline[0].$set.workshopDocuments.$concatArrays[1][0]._id.$literal
    );
    expect(new Set(ids).size).toBe(2);
  });
  it.each([
    { kind: 'PAGE' },
    { kind: 'other' },
    { resourceId: '' },
    { resourceId: '   ' },
    { resourceId: 3 },
    { resourceId: null },
    { name: '' },
    { name: null },
    { workshopId: 'bad' },
    { sortId: 0 },
    { html: '[]' },
  ])('rejects invalid external input %j', async (changes) => {
    await post('add-reference', { ...reference, ...changes }).expect(400);
    expect(workshops.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  it.each(['user', ''])('denies mutation to role %s', async (role) => {
    await post('add-reference', reference, role).expect(role ? 403 : 401);
    expect(workshops.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  it('returns 404 for a missing parent', async () => {
    workshops.findByIdAndUpdate.mockResolvedValue(null);
    await post('add-reference', reference).expect(404);
  });
  it('propagates a persistence failure', async () => {
    workshops.findByIdAndUpdate.mockRejectedValue(
      new Error('Database unavailable')
    );
    await post('add-reference', reference).expect(500);
  });
  it('publicly returns all three variants and opaque IDs', async () => {
    workshops.find.mockReturnValue({
      sort: () => ({ exec: () => Promise.resolve([parent()]) }),
    });
    const response = await request(app.getHttpServer())
      .get('/navigation/workshops?section=angular')
      .expect(200);
    expect(
      (response.body as { workshopDocuments: WorkshopJourneyItem[] }[])[0]
        .workshopDocuments
    ).toEqual(items);
  });
  it('reorders mixed entries with canonical metadata and compare-and-set', async () => {
    await post(
      `sort-pages?workshopId=${id}`,
      [...items].reverse().map((item) => ({
        ...item,
        name: 'forged',
        resourceId: item.kind === 'PAGE' ? undefined : 'forged',
      }))
    ).expect(201);
    const [filter, update] = workshops.findOneAndUpdate.mock.calls[0];
    expect(filter).toHaveProperty('__v');
    expect(update.workshopDocuments).toEqual(
      [...items].reverse().map((item, sortId) => ({ ...item, sortId }))
    );
  });
  it.each([
    [items[0]],
    [items[0], items[0], items[2]],
    [
      ...items.slice(0, 2),
      { ...items[2], _id: new Types.ObjectId().toString() },
    ],
    [...items.slice(0, 2), { ...items[2], kind: 'INVALID' }],
    [...items.slice(0, 2), { ...items[2], resourceId: null }],
    [null],
    [],
    'bad',
  ])('rejects malformed/incomplete/foreign reorder %j', async (payload) => {
    await post(`sort-pages?workshopId=${id}`, payload).expect(400);
    expect(workshops.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('returns conflict if journey changed during reorder', async () => {
    workshops.findOneAndUpdate.mockResolvedValue(null);
    await post(`sort-pages?workshopId=${id}`, items).expect(409);
  });
  it.each([testId, labId])(
    'unlinks external entry %s without deleting content',
    async (entryId) => {
      await post('delete-page-and-update-workshop', {
        _id: entryId,
        workshopId: id,
        name: 'Label',
      }).expect(201);
      expect(documents.deleteOne).not.toHaveBeenCalled();
      expect(
        workshops.findOneAndUpdate.mock.calls[0][0].workshopDocuments.$elemMatch
          ._id
      ).toBe(entryId);
    }
  );
  it('deletes owned content for a PAGE entry', async () => {
    await service.deletePageAndUpdateWorkshop(pageId, id);
    expect(documents.deleteOne).toHaveBeenCalledWith(pageId);
  });
  it('rejects foreign entry deletion before any mutation', async () => {
    await post('delete-page-and-update-workshop', {
      _id: new Types.ObjectId().toString(),
      workshopId: id,
      name: 'Other',
    }).expect(404);
    expect(workshops.findOneAndUpdate).not.toHaveBeenCalled();
    expect(documents.deleteOne).not.toHaveBeenCalled();
  });
  it('does not delete content if membership changed concurrently', async () => {
    workshops.findOneAndUpdate.mockResolvedValue(null);
    await expect(
      service.deletePageAndUpdateWorkshop(pageId, id)
    ).rejects.toThrow();
    expect(documents.deleteOne).not.toHaveBeenCalled();
  });
  it('workshop cascade includes only owned pages', async () => {
    await service.deleteWorkshopAndWorkshopDocuments(id);
    expect(
      documents.deleteMany.mock.calls[0][0].map((item) => item._id)
    ).toEqual([pageId]);
  });
  it('does not create content for a missing parent', async () => {
    workshops.findById.mockResolvedValue(null);
    await expect(service.createPage({ workshopId: id })).rejects.toThrow();
    expect(documents.createWorkshopDocument).not.toHaveBeenCalled();
  });
  it('compensates failed page linking', async () => {
    documents.createWorkshopDocument.mockResolvedValue({
      _id: pageId,
      name: 'Page',
    });
    workshops.findByIdAndUpdate.mockRejectedValue(new Error('Append failed'));
    await expect(service.createPage({ workshopId: id })).rejects.toThrow(
      'Append failed'
    );
    expect(documents.deleteOne).toHaveBeenCalledWith(pageId);
  });
  it('schema persists mixed entries and requires external resource IDs', async () => {
    const record = parent();
    await expect(record.validate()).resolves.toBeUndefined();
    record.workshopDocuments = [
      {
        _id: labId,
        kind: 'CODING_LAB',
        name: 'Broken',
        sortId: 0,
      } as WorkshopJourneyItem,
    ];
    await expect(record.validate()).rejects.toThrow('resourceId');
  });
});
