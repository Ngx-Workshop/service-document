import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import type { Server } from 'node:http';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Callable CommonJS Supertest.
import request = require('supertest');
import { WorkshopPage } from '../workshop-page/schemas/workshop-page.schema';
import { WorkshopController } from '../workshop-page/workshop-page.controller';
import { WorkshopDocumentService } from '../workshop-page/workshop-page.service';
import { ObservabilityModule } from './observability.module';
import { createServiceLogger, httpLoggingMiddleware } from './observability';

type Entry = {
  level: string;
  context: string;
  message: {
    event: string;
    requestId?: string;
    operationId?: string;
    outcome?: string;
    statusCode?: number;
    durationMs: number;
  };
};

describe('Domain JSON logging', () => {
  let app: INestApplication<Server>;
  let service: WorkshopDocumentService;
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;
  const output: string[] = [];
  const firstId = '507f1f77bcf86cd799439011';
  const secondId = '507f1f77bcf86cd799439012';
  const html = '[{"dataClean":"private-content-canary"}]';
  const exec = jest.fn();
  const model = { findByIdAndUpdate: jest.fn(() => ({ exec })) };
  const entries = () =>
    output.flatMap((line) =>
      line
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((value) => JSON.parse(value) as Entry)
    );
  const save = (id = firstId) =>
    request(app.getHttpServer())
      .post('/workshop/update-workshop-html')
      .set('Authorization', 'Bearer private-token-canary')
      .set('Cookie', 'private-cookie-canary')
      .set('X-Request-ID', 'private-incoming-id-canary')
      .send({ _id: id, html });

  beforeAll(async () => {
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation((value) => {
      output.push(String(value));
      return true;
    });
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation((value) => {
      output.push(String(value));
      return true;
    });
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [WorkshopController],
      providers: [
        WorkshopDocumentService,
        { provide: getModelToken(WorkshopPage.name), useValue: model },
      ],
    }).compile();
    service = module.get(WorkshopDocumentService);
    app = module.createNestApplication({ logger: createServiceLogger() });
    app.use(httpLoggingMiddleware());
    await app.init();
  });
  beforeEach(() => {
    output.length = 0;
    exec.mockReset();
    exec.mockResolvedValue({ html });
  });
  afterAll(async () => {
    await app.close();
    stdout.mockRestore();
    stderr.mockRestore();
    Logger.overrideLogger(false);
  });

  it('correlates interleaved saves with HTTP records, not incoming identifiers', async () => {
    exec
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ html }), 25))
      )
      .mockResolvedValueOnce({ html });
    const responses = await Promise.all([save(), save(secondId)]);
    const domains = entries().filter(
      (entry) => entry.message.event === 'page_content_saved'
    );
    expect(domains).toHaveLength(2);
    expect(
      new Set(domains.map((entry) => entry.message.operationId)).size
    ).toBe(2);
    expect(
      new Set(responses.map((response) => response.headers['x-request-id']))
        .size
    ).toBe(2);
    for (const response of responses) {
      expect(response.status).toBe(201);
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(entries()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'log',
            context: 'WorkshopDocumentService',
            message: expect.objectContaining({
              event: 'page_content_saved',
              outcome: 'succeeded',
              requestId: response.headers['x-request-id'],
              operationId: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
              durationMs: expect.any(Number) as unknown,
            }) as unknown,
          }) as unknown,
          expect.objectContaining({
            context: 'HTTP',
            message: expect.objectContaining({
              event: 'http_request',
              requestId: response.headers['x-request-id'],
              statusCode: 201,
            }) as unknown,
          }),
        ])
      );
    }
    expect(output.join('')).not.toMatch(/private-|507f1f77/);
    expect(domains.every((entry) => entry.message.durationMs >= 0)).toBe(true);
  });

  it('emits one safe failed domain outcome and preserves the storage error', async () => {
    const failure = new Error(
      'private-error-canary mongodb://private-credentials'
    );
    exec.mockRejectedValue(failure);
    await expect(service.updateWorkshopHtml(firstId, html)).rejects.toBe(
      failure
    );
    expect(entries()).toEqual([
      expect.objectContaining({
        level: 'error',
        context: 'WorkshopDocumentService',
        message: {
          event: 'page_content_saved',
          outcome: 'failed',
          statusCode: 500,
          operationId: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
          durationMs: expect.any(Number) as unknown,
        },
      }) as unknown,
    ]);
    expect(output.join('')).not.toMatch(/private-|507f1f77/);
  });

  it('warns on rejected saves without exporting error text or page IDs', async () => {
    exec.mockResolvedValue(null);
    const response = await save().expect(404);
    const domain = entries().filter(
      (entry) => entry.message.event === 'page_content_saved'
    );
    expect(domain).toEqual([
      expect.objectContaining({
        level: 'warn',
        context: 'WorkshopDocumentService',
        message: expect.objectContaining({
          outcome: 'rejected',
          statusCode: 404,
          requestId: response.headers['x-request-id'],
        }) as unknown,
      }),
    ]);
    expect(output.join('')).not.toMatch(/private-|507f1f77/);
  });

  it('keeps HTTP storage failures generic and avoids the default raw exception dump', async () => {
    exec.mockRejectedValue(new Error('private-error-canary'));
    await save().expect(500, {
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(
      entries().filter((entry) => entry.message.event === 'page_content_saved')
    ).toHaveLength(1);
    expect(
      entries().filter((entry) => entry.message.event === 'http_request')
    ).toHaveLength(1);
    expect(output.join('')).not.toMatch(/private-|507f1f77|ExceptionsHandler/);
  });

  it('does not retain request context for subsequent standalone operations or log health polls', async () => {
    await save().expect(201);
    output.length = 0;
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).head('/health').expect(200);
    expect(output).toHaveLength(0);
    await service.updateWorkshopHtml(firstId, html);
    expect(entries()).toHaveLength(1);
    expect(entries()[0].message).not.toHaveProperty('requestId');
  });
});
