import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { model } from 'mongoose';
import { CreateWorkshopDto } from './dto/create.dto';
import { UpdateWorkshopDto } from './dto/update.dto';
import { WorkshopSchema } from './schemas/workshop.schema';
import { NavigationService } from './navigation.service';

const WorkshopModel = model('WorkshopLevelTest', WorkshopSchema);
const metadata = { sectionId: 'section', name: 'Workshop', summary: 'Summary' };

describe('Workshop level', () => {
  it('defaults persisted workshop metadata to level 1', () => {
    const workshop = new WorkshopModel(metadata);
    expect(workshop.level).toBe(1);
    expect(workshop.validateSync()).toBeUndefined();
  });

  it.each([1, 20])(
    'accepts boundary level %s in persistence and DTOs',
    async (level) => {
      expect(
        new WorkshopModel({ ...metadata, level }).validateSync()
      ).toBeUndefined();
      expect(
        await validate(
          plainToInstance(CreateWorkshopDto, { ...metadata, level })
        )
      ).toHaveLength(0);
      expect(
        await validate(plainToInstance(UpdateWorkshopDto, { level }))
      ).toHaveLength(0);
    }
  );

  it.each([0, 21, -1, 1.5, null, '2'])(
    'rejects invalid request level %s',
    async (level) => {
      const errors = await validate(
        plainToInstance(CreateWorkshopDto, { ...metadata, level })
      );
      expect(errors.some((error) => error.property === 'level')).toBe(true);
    }
  );

  it.each([0, 21])('rejects out-of-range persisted level %s', (level) => {
    expect(
      new WorkshopModel({ ...metadata, level }).validateSync()?.errors.level
    ).toBeDefined();
  });

  it('keeps omitted level compatible with existing create and update callers', async () => {
    expect(
      await validate(plainToInstance(CreateWorkshopDto, metadata))
    ).toHaveLength(0);
    expect(
      await validate(plainToInstance(UpdateWorkshopDto, { name: 'Renamed' }))
    ).toHaveLength(0);
  });

  it('persists edited levels and returns them with workshop metadata', async () => {
    const workshop = new WorkshopModel({ ...metadata, level: 3 });
    const findByIdAndUpdate = jest
      .fn()
      .mockImplementation((_id, changes: { level: number }) => {
        workshop.level = changes.level;
        return Promise.resolve(workshop);
      });
    const service = new NavigationService(
      {} as never,
      {
        findById: jest.fn().mockResolvedValue(workshop),
        findByIdAndUpdate,
      } as never,
      {} as never
    );
    expect(
      (
        await service.editWorkshopNameAndSummary({
          _id: workshop.id,
          level: 20,
        })
      ).level
    ).toBe(20);
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      workshop.id,
      expect.objectContaining({ level: 20 }),
      { returnDocument: 'after', runValidators: true }
    );
    expect(
      (
        await service.editWorkshopNameAndSummary({
          _id: workshop.id,
          name: 'Renamed',
        })
      ).level
    ).toBe(20);
  });
});
