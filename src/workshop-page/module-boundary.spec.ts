import {
  ExecutionContext,
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { RemoteAuthGuard, Role } from '@tmdjr/ngx-auth-client';
import { RequestKeys } from '@tmdjr/ngx-auth-client/enums/request-keys.enum';
import type { Request } from 'express';
import type { Server } from 'node:http';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Callable CommonJS Supertest.
import request = require('supertest');
import { NavigationModule } from '../navigation/navigation.module';
import { Section } from '../navigation/schemas/section.schema';
import { Workshop } from '../navigation/schemas/workshop.schema';
import { ObservabilityModule } from '../observability/observability.module';
import { WorkshopPage } from './schemas/workshop-page.schema';
import { WorkshopModule } from './workshop-page.module';

@Global()
@Module({
  providers: [
    {
      provide: getConnectionToken(),
      useValue: { models: {}, model: () => ({}) },
    },
  ],
  exports: [getConnectionToken()],
})
class IsolatedConnectionModule {}

describe('Real feature-module HTTP boundaries', () => {
  let app: INestApplication<Server>;
  const exec = jest.fn();
  const pages = {
    findById: jest.fn(() => ({ exec })),
    findByIdAndUpdate: jest.fn(() => ({ exec })),
  };
  const remote = jest.fn((context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest<Request>();
    const role = req.headers['x-test-role'];
    if (!role) return false;
    req[RequestKeys.REQUEST_USER_KEY] = { role };
    return true;
  });
  const id = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        IsolatedConnectionModule,
        NavigationModule,
        WorkshopModule,
        ObservabilityModule,
      ],
    })
      .overrideProvider(getModelToken(Section.name))
      .useValue({})
      .overrideProvider(getModelToken(Workshop.name))
      .useValue({})
      .overrideProvider(getModelToken(WorkshopPage.name))
      .useValue(pages)
      .overrideProvider(RemoteAuthGuard)
      .useValue({ canActivate: remote })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
    );
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    exec.mockResolvedValue({ html: 'serialized-blocks' });
  });
  afterAll(async () => {
    await app.close();
  });

  it('allows anonymous page reads and heartbeat through actual global guards', async () => {
    await request(app.getHttpServer())
      .get(`/workshop/${id}`)
      .expect(200, { html: 'serialized-blocks' });
    await request(app.getHttpServer()).get('/health').expect(200);
    expect(remote).not.toHaveBeenCalled();
  });
  it('denies anonymous and non-admin content writes without storage calls', async () => {
    await request(app.getHttpServer()).get('/workshop/workshops').expect(401);
    await request(app.getHttpServer())
      .post('/workshop/update-workshop-html')
      .send({ _id: id, html: 'text' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/workshop/update-workshop-html')
      .set('x-test-role', 'Reader')
      .send({ _id: id, html: 'text' })
      .expect(403);
    expect(pages.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  it('preserves admin saves, invalid IDs and missing pages', async () => {
    await request(app.getHttpServer())
      .post('/workshop/update-workshop-html')
      .set('x-test-role', Role.Admin)
      .send({ _id: id, html: 'text' })
      .expect(201, { html: 'serialized-blocks' });
    expect(remote).toHaveBeenCalledTimes(1);
    await request(app.getHttpServer()).get('/workshop/invalid').expect(400);
    exec.mockResolvedValue(null);
    await request(app.getHttpServer()).get(`/workshop/${id}`).expect(404);
  });
});
