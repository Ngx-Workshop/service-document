import {
  ConsoleLogger,
  HttpException,
  INestApplication,
  Logger,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

const requests = new AsyncLocalStorage<{ requestId: string }>();

type DomainEvent =
  | 'page_content_saved'
  | 'navigation_page_created'
  | 'navigation_reference_added'
  | 'navigation_journey_reordered';

export async function observeDomainOperation<T>(
  logger: Pick<Logger, 'log' | 'warn' | 'error'>,
  event: DomainEvent,
  operation: () => Promise<T>
): Promise<T> {
  const operationId = randomUUID();
  const requestId = requests.getStore()?.requestId;
  const started = process.hrtime.bigint();
  const entry = () => ({
    event,
    operationId,
    ...(requestId ? { requestId } : {}),
    durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
  });
  try {
    const result = await operation();
    logger.log({ ...entry(), outcome: 'succeeded' });
    return result;
  } catch (error: unknown) {
    const statusCode = error instanceof HttpException ? error.getStatus() : 500;
    const payload = {
      ...entry(),
      outcome: statusCode < 500 ? 'rejected' : 'failed',
      statusCode,
    };
    if (statusCode < 500) logger.warn(payload);
    else logger.error(payload);
    throw error;
  }
}

export function createServiceLogger(): ConsoleLogger {
  return new ConsoleLogger({
    json: true,
    colors: false,
    logLevels: ['log', 'warn', 'error', 'fatal'],
  });
}

export function httpLoggingMiddleware(
  logger: Pick<Logger, 'log' | 'warn' | 'error'> = new Logger('HTTP')
) {
  return (request: Request, response: Response, next: NextFunction): void => {
    // Heartbeats are represented by probe metrics, not repetitive access logs.
    if (
      request.path === '/health' &&
      ['GET', 'HEAD'].includes(request.method)
    ) {
      next();
      return;
    }
    const requestId = randomUUID();
    const started = process.hrtime.bigint();
    response.setHeader('X-Request-ID', requestId);
    response.once('finish', () => {
      const route = request.route as { path?: unknown } | undefined;
      const entry = {
        event: 'http_request',
        requestId,
        method: request.method,
        // Never export concrete paths, queries, bodies, cookies or auth headers.
        route: typeof route?.path === 'string' ? route.path : '/unmatched',
        statusCode: response.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
      };
      if (entry.statusCode >= 500) logger.error(entry);
      else if (entry.statusCode >= 400) logger.warn(entry);
      else logger.log(entry);
    });
    requests.run({ requestId }, next);
  };
}

export function configureObservability(app: INestApplication): void {
  app.use(httpLoggingMiddleware());
  app.enableShutdownHooks();
}
