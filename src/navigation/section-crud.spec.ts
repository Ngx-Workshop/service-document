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
  Role,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import { RequestKeys } from '@tmdjr/ngx-auth-client/enums/request-keys.enum';
import { Request } from 'express';
import { HydratedDocument, model, Types } from 'mongoose';
import { Server } from 'node:http';
import * as request from 'supertest';
import { WorkshopDocumentService } from '../workshop-page/workshop-page.service';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { SectionDto } from './dto/create.dto';
import { Section, SectionSchema } from './schemas/section.schema';
import { Workshop } from './schemas/workshop.schema';

type SectionFilter = { _id: { $in: (string | Types.ObjectId)[] } };

describe('Section CRUD HTTP contract', () => {
  let app: INestApplication<Server>;
  const SectionModel = model('SectionCrudTest', SectionSchema);
  const records = new Map<string, HydratedDocument<Section>>();
  const findRecord = (filter: SectionFilter) => {
    const query = SectionModel.findOne(filter);
    query.cast(SectionModel);
    return filter._id.$in
      .map((key) => records.get(key.toString()))
      .find(Boolean);
  };
  const persistence = {
    findOne: jest.fn((filter: SectionFilter) => ({
      exec: jest.fn(() => Promise.resolve(findRecord(filter) ?? null)),
    })),
    findOneAndUpdate: jest.fn(
      (filter: SectionFilter, update: { $set: Partial<Section> }) => ({
        exec: jest.fn(async () => {
          const record = findRecord(filter);
          if (!record) return null;
          record.set(update.$set);
          await record.validate();
          return record;
        }),
      })
    ),
    deleteOne: jest.fn((filter: { _id: string | Types.ObjectId }) => ({
      exec: jest.fn(() =>
        Promise.resolve({
          acknowledged: true,
          deletedCount: records.delete(filter._id.toString()) ? 1 : 0,
        })
      ),
    })),
  };
  const workshops = {
    exists: jest.fn(() => ({
      exec: jest.fn(
        (): Promise<{ _id: Types.ObjectId } | null> => Promise.resolve(null)
      ),
    })),
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
            canActivate: (context: ExecutionContext) => {
              const req = context.switchToHttp().getRequest<Request>();
              const role = req.headers['x-test-role'];
              if (!role) return false;
              req[RequestKeys.REQUEST_USER_KEY] = { role };
              return true;
            },
          },
        },
        { provide: getModelToken(Section.name), useValue: persistence },
        { provide: getModelToken(Workshop.name), useValue: workshops },
        { provide: WorkshopDocumentService, useValue: {} },
      ],
    }).compile();
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
    jest.clearAllMocks();
    records.clear();
  });
  afterAll(async () => {
    await app.close();
  });

  const seed = (id: string | Types.ObjectId = new Types.ObjectId()) => {
    const record = new SectionModel({
      _id: id,
      sectionTitle: 'Original',
      sectionDescription: 'Original description',
      summary: 5,
      menuSvgPath: '/menu.svg',
      headerSvgPath: '/header.svg',
      categoriesLastUpdated: '2020-01-01T00:00:00.000Z',
    });
    records.set(id.toString(), record);
    return record;
  };

  it.each(['angular', new Types.ObjectId(), '0123456789abcdef01234567'])(
    'publicly reads existing section %s with compatible IDs and no internals',
    async (id) => {
      const record = seed(id);
      const response = await request(app.getHttpServer())
        .get(`/navigation/section/${id.toString()}`)
        .expect(200);
      expect(response.body).toEqual({
        _id: id.toString(),
        sectionTitle: record.sectionTitle,
        sectionDescription: record.sectionDescription,
        summary: record.summary,
        menuSvgPath: record.menuSvgPath,
        headerSvgPath: record.headerSvgPath,
        categoriesLastUpdated: record.categoriesLastUpdated,
      });
    }
  );

  it('returns an empty description for a legacy section without the field', async () => {
    const record = seed('angular');
    record.set('sectionDescription', undefined);
    const response = await request(app.getHttpServer())
      .get('/navigation/section/angular')
      .expect(200);
    expect(response.body).toHaveProperty('sectionDescription', '');
    expect(record.sectionDescription).toBeUndefined();
  });

  it('preserves string and ObjectId alternatives through real Mongoose casting', () => {
    const id = new Types.ObjectId();
    const filter = { _id: { $in: ['angular', id.toString(), id] } };
    const query = SectionModel.findOne(filter);
    query.cast(SectionModel);
    expect(query.getFilter()).toEqual(filter);
    expect(new SectionModel()._id).toBeInstanceOf(Types.ObjectId);
  });

  it.each(['angular', new Types.ObjectId()])(
    'updates all editable fields and preserves the identity for %s',
    async (id) => {
      seed(id);
      const response = await request(app.getHttpServer())
        .patch(`/navigation/section/${id.toString()}`)
        .set('x-test-role', Role.Admin)
        .send({
          sectionTitle: '  Updated  ',
          sectionDescription: 'Updated description',
          summary: 0,
          menuSvgPath: '',
          headerSvgPath: '/new-header.svg',
        })
        .expect(200);
      expect(response.body).toMatchObject({
        _id: id.toString(),
        sectionTitle: 'Updated',
        sectionDescription: 'Updated description',
        summary: 0,
        menuSvgPath: '',
        headerSvgPath: '/new-header.svg',
      });
      const saved = records.get(id.toString());
      expect(saved).toBeDefined();
      if (!saved) throw new Error('Updated section missing');
      expect(response.body).toHaveProperty(
        'categoriesLastUpdated',
        saved.categoriesLastUpdated
      );
      expect(Date.parse(saved.categoriesLastUpdated)).toBeGreaterThan(
        Date.parse('2020-01-01T00:00:00.000Z')
      );
      expect(records.get(id.toString())?.sectionTitle).toBe('Updated');
      expect(persistence.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: {
            sectionTitle: 'Updated',
            sectionDescription: 'Updated description',
            summary: 0,
            menuSvgPath: '',
            headerSvgPath: '/new-header.svg',
            categoriesLastUpdated: saved.categoriesLastUpdated,
          },
        }),
        { returnDocument: 'after', runValidators: true }
      );
      const read = await request(app.getHttpServer())
        .get(`/navigation/section/${id.toString()}`)
        .expect(200);
      expect(read.body).toEqual(response.body);
    }
  );

  it('preserves unspecified fields on partial updates and accepts title boundaries', async () => {
    const record = seed();
    for (const title of ['x', 'x'.repeat(120)]) {
      const response = await request(app.getHttpServer())
        .patch(`/navigation/section/${record._id.toString()}`)
        .set('x-test-role', Role.Admin)
        .send({ sectionTitle: title })
        .expect(200);
      expect(response.body).toMatchObject({
        sectionTitle: title,
        sectionDescription: 'Original description',
        summary: 5,
        menuSvgPath: '/menu.svg',
        headerSvgPath: '/header.svg',
      });
    }
  });

  it.each([
    { sectionDescription: '  Updated\nDescription  ' },
    { sectionDescription: '' },
    { summary: 2.5 },
    { menuSvgPath: '/new-menu.svg' },
    { headerSvgPath: '' },
  ])('updates an individual optional field: %j', async (body) => {
    seed('angular');
    const response: { body: SectionDto } = await request(app.getHttpServer())
      .patch('/navigation/section/angular')
      .set('x-test-role', Role.Admin)
      .send(body)
      .expect(200);
    expect(response.body).toMatchObject({
      sectionTitle: 'Original',
      sectionDescription: 'Original description',
      summary: 5,
      menuSvgPath: '/menu.svg',
      headerSvgPath: '/header.svg',
      ...body,
    });
    expect(records.get('angular')?.sectionDescription).toBe(
      body.sectionDescription ?? 'Original description'
    );
    expect(Date.parse(response.body.categoriesLastUpdated)).toBeGreaterThan(
      Date.parse('2020-01-01T00:00:00.000Z')
    );
    const read = await request(app.getHttpServer())
      .get('/navigation/section/angular')
      .expect(200);
    expect(read.body).toEqual(response.body);
  });

  it.each([
    {},
    { sectionTitle: '' },
    { sectionTitle: '   ' },
    { sectionTitle: null },
    { sectionTitle: 123 },
    { sectionTitle: 'x'.repeat(121) },
    { sectionDescription: null },
    { sectionDescription: 123 },
    { sectionDescription: false },
    { sectionDescription: [] },
    { sectionDescription: {} },
    { summary: null },
    { summary: '2' },
    { summary: {} },
    { menuSvgPath: null },
    { menuSvgPath: 123 },
    { headerSvgPath: null },
    { headerSvgPath: [] },
    { sectionTitle: 'Test', _id: 'injected' },
    { categoriesLastUpdated: '2025-01-01' },
  ])('rejects invalid updates without writing: %j', async (body) => {
    seed('angular');
    await request(app.getHttpServer())
      .patch('/navigation/section/angular')
      .set('x-test-role', Role.Admin)
      .send(body)
      .expect(400);
    expect(persistence.findOneAndUpdate).not.toHaveBeenCalled();
    expect(records.get('angular')?.sectionTitle).toBe('Original');
  });

  it.each(['angular', new Types.ObjectId()])(
    'deletes empty section %s and subsequently returns 404',
    async (id) => {
      seed(id);
      const response = await request(app.getHttpServer())
        .delete(`/navigation/section/${id.toString()}`)
        .set('x-test-role', Role.Admin)
        .expect(200);
      expect(response.body).toEqual({ acknowledged: true, deletedCount: 1 });
      expect(workshops.exists).toHaveBeenCalledWith({
        sectionId: id.toString(),
      });
      expect(persistence.deleteOne).toHaveBeenCalledWith({ _id: id });
      await request(app.getHttpServer())
        .get(`/navigation/section/${id.toString()}`)
        .expect(404);
    }
  );

  it('rejects a nonempty section without deleting any records', async () => {
    seed('angular');
    workshops.exists.mockReturnValueOnce({
      exec: jest.fn(() => Promise.resolve({ _id: new Types.ObjectId() })),
    });
    const response = await request(app.getHttpServer())
      .delete('/navigation/section/angular')
      .set('x-test-role', Role.Admin)
      .expect(409);
    expect(response.body).toHaveProperty(
      'message',
      'Section contains workshops'
    );
    expect(persistence.deleteOne).not.toHaveBeenCalled();
    expect(records.has('angular')).toBe(true);
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'returns 404 for missing sections on %s',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/navigation/section/missing')
        .set('x-test-role', Role.Admin)
        .send(method === 'patch' ? { sectionTitle: 'Test' } : undefined)
        .expect(404);
      expect(persistence.deleteOne).not.toHaveBeenCalled();
      expect(workshops.exists).not.toHaveBeenCalled();
    }
  );

  it.each(['get', 'patch', 'delete'] as const)(
    'rejects blank and oversized identifiers on %s',
    async (method) => {
      for (const id of ['%20', 'x'.repeat(121)]) {
        await request(app.getHttpServer())
          [method](`/navigation/section/${id}`)
          .set('x-test-role', Role.Admin)
          .send(method === 'patch' ? { summary: 0 } : undefined)
          .expect(400);
      }
      expect(persistence.findOne).not.toHaveBeenCalled();
      expect(persistence.findOneAndUpdate).not.toHaveBeenCalled();
      expect(persistence.deleteOne).not.toHaveBeenCalled();
    }
  );

  it.each(['patch', 'delete'] as const)(
    'requires authenticated admins for %s',
    async (method) => {
      seed('angular');
      for (const role of [undefined, Role.Regular, Role.Publisher]) {
        const call = request(app.getHttpServer())
          [method]('/navigation/section/angular')
          .send(method === 'patch' ? { summary: 0 } : undefined);
        if (role) call.set('x-test-role', role);
        await call.expect(role ? 403 : 401);
      }
      expect(persistence.findOne).not.toHaveBeenCalled();
      expect(persistence.findOneAndUpdate).not.toHaveBeenCalled();
      expect(persistence.deleteOne).not.toHaveBeenCalled();
    }
  );

  it.each(['findOne', 'findOneAndUpdate', 'deleteOne'] as const)(
    'propagates persistence failure from %s',
    async (operation) => {
      seed('angular');
      persistence[operation].mockReturnValueOnce({
        exec: jest.fn(
          (): Promise<never> =>
            Promise.reject(new Error('Database unavailable'))
        ),
      });
      const method =
        operation === 'findOne'
          ? 'get'
          : operation === 'findOneAndUpdate'
            ? 'patch'
            : 'delete';
      await request(app.getHttpServer())
        [method]('/navigation/section/angular')
        .set('x-test-role', Role.Admin)
        .send(method === 'patch' ? { summary: 0 } : undefined)
        .expect(500);
      expect(records.has('angular')).toBe(true);
    }
  );

  it('does not delete when the workshop existence check fails', async () => {
    seed('angular');
    workshops.exists.mockReturnValueOnce({
      exec: jest.fn(() => Promise.reject(new Error('Database unavailable'))),
    });
    await request(app.getHttpServer())
      .delete('/navigation/section/angular')
      .set('x-test-role', Role.Admin)
      .expect(500);
    expect(persistence.deleteOne).not.toHaveBeenCalled();
  });

  it('reports concurrent deletion as missing, not a successful deletion', async () => {
    seed('angular');
    persistence.deleteOne.mockReturnValueOnce({
      exec: jest.fn(() =>
        Promise.resolve({ acknowledged: true, deletedCount: 0 })
      ),
    });
    await request(app.getHttpServer())
      .delete('/navigation/section/angular')
      .set('x-test-role', Role.Admin)
      .expect(404);
  });

  it('reports unacknowledged deletion as a failure', async () => {
    seed('angular');
    persistence.deleteOne.mockReturnValueOnce({
      exec: jest.fn(() =>
        Promise.resolve({ acknowledged: false, deletedCount: 0 })
      ),
    });
    await request(app.getHttpServer())
      .delete('/navigation/section/angular')
      .set('x-test-role', Role.Admin)
      .expect(500);
  });
});
