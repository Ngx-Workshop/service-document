import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WorkshopPage } from './schemas/workshop-page.schema';
import { WorkshopDocumentService } from './workshop-page.service';

describe('Page persistence boundary', () => {
  let service: WorkshopDocumentService;
  const id = new Types.ObjectId().toString();
  const html = '[{"name":"Header","dataClean":"private-content-canary"}]';
  const exec = jest.fn();
  const model = { findByIdAndUpdate: jest.fn(() => ({ exec })) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkshopDocumentService,
        { provide: getModelToken(WorkshopPage.name), useValue: model },
      ],
    }).compile();
    service = module.get(WorkshopDocumentService);
  });
  beforeEach(() => {
    exec.mockReset();
    model.findByIdAndUpdate.mockClear();
  });

  it('round-trips serialized blocks unchanged and returns the updated record', async () => {
    const saved = { _id: id, html, lastUpdated: new Date(0) };
    exec.mockResolvedValue(saved);
    expect(await service.updateWorkshopHtml(id, html)).toBe(saved);
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { html },
      { returnDocument: 'after' }
    );
  });

  it('retains rename before-image semantics without writing content or timestamps', async () => {
    const previous = { name: 'Previous' };
    exec.mockResolvedValue(previous);
    expect(await service.updateWorkshopName(id, 'Next')).toBe(previous);
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { name: 'Next' },
      { returnDocument: 'before' }
    );
  });

  it('rejects invalid IDs before persistence', async () => {
    await expect(
      service.updateWorkshopHtml('invalid', html)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('preserves missing-record errors', async () => {
    exec.mockResolvedValue(null);
    await expect(service.updateWorkshopHtml(id, html)).rejects.toEqual(
      new NotFoundException(`WorkshopDocument with ID "${id}" not found`)
    );
  });

  it.each(['updateWorkshopName', 'updateWorkshopHtml'] as const)(
    'preserves duplicate-key conflicts for %s',
    async (method) => {
      exec.mockRejectedValue({ code: 11000 });
      await expect(service[method](id, html)).rejects.toEqual(
        new ConflictException('WorkshopDocument with this name already exists')
      );
    }
  );

  it('rethrows storage failures without changing their identity', async () => {
    const failure = new Error('private-storage-canary');
    exec.mockRejectedValue(failure);
    await expect(service.updateWorkshopHtml(id, html)).rejects.toBe(failure);
  });
});
