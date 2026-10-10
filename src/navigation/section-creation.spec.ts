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
import { CreateSectionDto, SectionDto, SectionsMapDto } from './dto/create.dto';
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
    create: jest.fn(async (input: CreateSectionDto) => {
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
    const response: { body: SectionDto } = await request(app.getHttpServer())
      .post('/navigation/section/create-section')
      .set('x-test-role', Role.Admin)
      .send({ sectionTitle: '  TypeScript  ' })
      .expect(201);
    expect(response.body).toEqual({
      _id: expect.stringMatching(/^[a-f0-9]{24}$/),
      sectionTitle: 'TypeScript',
      sectionDescription: '',
      summary: 0,
      menuSvgPath: '',
      headerSvgPath: '',
      categoriesLastUpdated: expect.any(String),
    });
    const list: { body: SectionsMapDto } = await request(app.getHttpServer())
      .get('/navigation/sections')
      .expect(200);
    expect(list.body.sections[response.body._id].sectionTitle).toBe(
      'TypeScript'
    );
    expect(list.body.sections[response.body._id].sectionDescription).toBe('');
    expect(persistence.create).toHaveBeenCalledWith({
      sectionTitle: 'TypeScript',
      sectionDescription: undefined,
      menuSvgPath: undefined,
      headerSvgPath: undefined,
    });
  });
  it.each([
    { sectionDescription: '', menuSvgPath: '', headerSvgPath: '' },
    { menuSvgPath: '/menu.svg' },
    { headerSvgPath: '/header.svg' },
    { menuSvgPath: '/menu.svg', headerSvgPath: '/header.svg' },
  ])(
    'persists optional artwork and exposes it in public reads: %j',
    async (fields) => {
      const response: { body: SectionDto } = await request(app.getHttpServer())
        .post('/navigation/section/create-section')
        .set('x-test-role', Role.Admin)
        .send({ sectionTitle: 'Rust', ...fields })
        .expect(201);
      const expected = {
        sectionTitle: 'Rust',
        sectionDescription: '',
        menuSvgPath: fields.menuSvgPath ?? '',
        headerSvgPath: fields.headerSvgPath ?? '',
      };
      expect(response.body).toMatchObject(expected);
      expect(records[0]).toMatchObject(expected);
      const list: { body: SectionsMapDto } = await request(app.getHttpServer())
        .get('/navigation/sections')
        .expect(200);
      expect(list.body.sections[response.body._id]).toMatchObject(expected);
    }
  );
  it.each(
    ['menuSvgPath', 'headerSvgPath'].flatMap((field) =>
      [null, 123, false, [], {}].map((value) => ({
        sectionTitle: 'Rust',
        [field]: value,
      }))
    )
  )('rejects invalid artwork without persistence: %j', async (body) => {
    await request(app.getHttpServer())
      .post('/navigation/section/create-section')
      .set('x-test-role', Role.Admin)
      .send(body)
      .expect(400);
    expect(persistence.create).not.toHaveBeenCalled();
  });
  it.each(['A section description', '', '  First line\nSecond line  '])(
    'persists and lists the description verbatim: %j',
    async (sectionDescription) => {
      const response: { body: SectionDto } = await request(app.getHttpServer())
        .post('/navigation/section/create-section')
        .set('x-test-role', Role.Admin)
        .send({ sectionTitle: 'Test', sectionDescription })
        .expect(201);
      expect(response.body.sectionDescription).toBe(sectionDescription);
      expect(records[0]).toHaveProperty(
        'sectionDescription',
        sectionDescription
      );
      const list: { body: SectionsMapDto } = await request(app.getHttpServer())
        .get('/navigation/sections')
        .expect(200);
      expect(list.body.sections[response.body._id].sectionDescription).toBe(
        sectionDescription
      );
    }
  );
  it.each([
    {},
    { sectionTitle: '' },
    { sectionTitle: '   ' },
    { sectionTitle: 7 },
    { sectionTitle: null },
    { sectionTitle: 'x'.repeat(121) },
    { sectionTitle: 'Test', _id: 'injected' },
    { sectionTitle: 'Test', summary: 2 },
    { sectionTitle: 'Test', sectionDescription: null },
    { sectionTitle: 'Test', sectionDescription: 123 },
    { sectionTitle: 'Test', sectionDescription: false },
    { sectionTitle: 'Test', sectionDescription: [] },
    { sectionTitle: 'Test', sectionDescription: {} },
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
    expect(list.body).toHaveProperty('sections.angular.sectionDescription', '');
    expect(records[0]).not.toHaveProperty('sectionDescription');
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
