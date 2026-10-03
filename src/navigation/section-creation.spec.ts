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
import { model } from 'mongoose';
import * as request from 'supertest';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { Section, SectionSchema } from './schemas/section.schema';
import { Workshop } from './schemas/workshop.schema';
import { WorkshopDocumentService } from '../workshop-page/workshop-page.service';

// Real controller, validation, service, schema defaults and role guard; DB and
// remote identity lookup are isolated doubles, never live MongoDB/auth traffic.
describe('Section creation HTTP contract', () => {
  let app: INestApplication;
  const SectionModel = model('SectionCreationTest', SectionSchema);
  const records: Record<string, unknown>[] = [];
  const persistence = {
    create: jest.fn(async (input: { sectionTitle: string }) => {
      const record = new SectionModel(input);
      await record.validate();
      records.push({ ...record.toObject() });
      return record;
    }),
    find: () => ({ lean: () => ({ exec: async () => records }) }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [NavigationController],
      providers: [
        NavigationService,
        { provide: getModelToken(Section.name), useValue: persistence },
        { provide: getModelToken(Workshop.name), useValue: {} },
        { provide: WorkshopDocumentService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    const reflector = new Reflector();
    const identity = {
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        const role = req.headers['x-test-role'];
        if (!role) return false;
        req[RequestKeys.REQUEST_USER_KEY] = { role };
        return true;
      },
    } as unknown as RemoteAuthGuard;
    app.useGlobalGuards(
      new AuthenticationGuard(reflector, identity),
      new RolesGuard(reflector)
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
    );
    await app.init();
  });
  beforeEach(() => {
    records.length = 0;
    persistence.create.mockClear();
  });
  afterAll(async () => {
    await app.close();
  });

  it('persists a trimmed name with server defaults and exposes it in public reads', async () => {
    const response = await request(app.getHttpServer())
      .post('/navigation/section/create-section')
      .set('x-test-role', Role.Admin)
      .send({ sectionTitle: '  TypeScript  ' })
      .expect(201);
    expect(response.body).toEqual({
      _id: expect.stringMatching(/^[a-f0-9]{24}$/),
      sectionTitle: 'TypeScript',
      summary: 0,
      menuSvgPath: '',
      headerSvgPath: '',
      categoriesLastUpdated: expect.any(String),
    });
    const list = await request(app.getHttpServer())
      .get('/navigation/sections')
      .expect(200);
    expect(list.body.sections[response.body._id].sectionTitle).toBe(
      'TypeScript'
    );
    expect(persistence.create).toHaveBeenCalledWith({
      sectionTitle: 'TypeScript',
    });
  });
  it.each([
    {},
    { sectionTitle: '' },
    { sectionTitle: '   ' },
    { sectionTitle: 7 },
    { sectionTitle: null },
    { sectionTitle: 'x'.repeat(121) },
    { sectionTitle: 'Test', _id: 'injected' },
    { sectionTitle: 'Test', summary: 2 },
  ])('rejects invalid requests without persistence: %j', async (body) => {
    await request(app.getHttpServer())
      .post('/navigation/section/create-section')
      .set('x-test-role', Role.Admin)
      .send(body)
      .expect(400);
    expect(persistence.create).not.toHaveBeenCalled();
  });
  it('accepts the name length boundary', async () => {
    await request(app.getHttpServer())
      .post('/navigation/section/create-section')
      .set('x-test-role', Role.Admin)
      .send({ sectionTitle: 'x'.repeat(120) })
      .expect(201);
  });
  it('rejects anonymous callers', async () => {
    await request(app.getHttpServer())
      .post('/navigation/section/create-section')
      .send({ sectionTitle: 'Test' })
      .expect(401);
    expect(persistence.create).not.toHaveBeenCalled();
  });
  it.each([Role.Regular, Role.Publisher])(
    'rejects the %s role',
    async (role) => {
      await request(app.getHttpServer())
        .post('/navigation/section/create-section')
        .set('x-test-role', role)
        .send({ sectionTitle: 'Test' })
        .expect(403);
      expect(persistence.create).not.toHaveBeenCalled();
    }
  );
  it('preserves legacy string section keys in the listing', async () => {
    records.push({ _id: 'angular', sectionTitle: 'Angular' });
    const list = await request(app.getHttpServer())
      .get('/navigation/sections')
      .expect(200);
    expect(list.body.sections.angular._id).toBe('angular');
  });
  it('propagates a failed write rather than returning a created section', async () => {
    persistence.create.mockRejectedValueOnce(new Error('Database unavailable'));
    await request(app.getHttpServer())
      .post('/navigation/section/create-section')
      .set('x-test-role', Role.Admin)
      .send({ sectionTitle: 'Test' })
      .expect(500);
    expect(records).toHaveLength(0);
  });
});
