import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { WorkshopPage } from '../workshop-page/schemas/workshop-page.schema';
import { WorkshopDocumentService } from '../workshop-page/workshop-page.service';

import {
  CreateWorkshopPageDto,
  EditPageNameUpdateWorkshopDto,
} from 'src/workshop-page/dto/create.dto';
import {
  CreateSectionDto,
  CreateWorkshopDto,
  DeleteResultDto,
  SectionDto,
  SectionsMapDto,
  WorkshopDto,
} from './dto/create.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WorkshopPageIdentifierDto } from '../workshop-page/dto/create.dto';
import {
  AddWorkshopReferenceDto,
  AssessmentTestIdentifierDto,
  CodingLabIdentifierDto,
  WorkshopJourneyItem,
} from './dto/journey.dto';
import { UpdateSectionDto, UpdateWorkshopDto } from './dto/update.dto';
import { Section, SectionDocumentDoc } from './schemas/section.schema';
import {
  TWorkshopDocument,
  Workshop,
  toSpinalCase,
} from './schemas/workshop.schema';

@Injectable()
export class NavigationService {
  private logger = new Logger();

  constructor(
    @InjectModel(Section.name) private sectionModel: Model<SectionDocumentDoc>,
    @InjectModel(Workshop.name)
    private workshopModel: Model<TWorkshopDocument>,
    private workshopDocumentService: WorkshopDocumentService
  ) {}

  async createSection(input: CreateSectionDto): Promise<SectionDto> {
    const section = await this.sectionModel.create({
      sectionTitle: input.sectionTitle,
      sectionDescription: input.sectionDescription,
    });
    return this.toSectionDto(section);
  }

  async findSection(id: string): Promise<SectionDto> {
    const section = await this.sectionModel
      .findOne(this.sectionFilter(id))
      .exec();
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return this.toSectionDto(section);
  }

  async updateSection(
    id: string,
    input: UpdateSectionDto
  ): Promise<SectionDto> {
    const changes = Object.fromEntries(
      Object.entries({
        sectionTitle: input.sectionTitle,
        sectionDescription: input.sectionDescription,
        summary: input.summary,
        menuSvgPath: input.menuSvgPath,
        headerSvgPath: input.headerSvgPath,
      }).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('At least one section field is required');
    }
    const section = await this.sectionModel
      .findOneAndUpdate(
        this.sectionFilter(id),
        {
          $set: { ...changes, categoriesLastUpdated: new Date().toISOString() },
        },
        { returnDocument: 'after', runValidators: true }
      )
      .exec();
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return this.toSectionDto(section);
  }

  async deleteSection(id: string): Promise<DeleteResultDto> {
    const section = await this.sectionModel
      .findOne(this.sectionFilter(id))
      .exec();
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    const sectionId = section._id.toString();
    if (await this.workshopModel.exists({ sectionId }).exec()) {
      throw new ConflictException('Section contains workshops');
    }
    const result = await this.sectionModel
      .deleteOne({ _id: section._id })
      .exec();
    if (!result.acknowledged) {
      throw new InternalServerErrorException(
        'Section deletion was not acknowledged'
      );
    }
    if (result.deletedCount === 0) {
      throw new NotFoundException('Section not found');
    }
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
  }

  private sectionFilter(id: string) {
    // Mixed IDs preserve legacy keys without casting them to ObjectIds.
    const keys: (string | Types.ObjectId)[] = [id];
    if (Types.ObjectId.isValid(id)) {
      keys.push(new Types.ObjectId(id));
    }
    return { _id: { $in: keys } };
  }

  private toSectionDto(section: Section): SectionDto {
    return {
      _id: section._id.toString(),
      sectionTitle: section.sectionTitle,
      sectionDescription: section.sectionDescription ?? '',
      summary: section.summary,
      menuSvgPath: section.menuSvgPath,
      headerSvgPath: section.headerSvgPath,
      categoriesLastUpdated: section.categoriesLastUpdated,
    };
  }

  async findAllSections(): Promise<SectionsMapDto> {
    const sections = await this.sectionModel.find().lean().exec();
    const sectionsMap = sections.reduce<Record<string, SectionDto>>(
      (acc, cur) => {
        const section: SectionDto = {
          ...cur,
          _id: cur._id.toString(),
          sectionDescription: cur.sectionDescription ?? '',
        };
        return { ...acc, [section._id]: section };
      },
      {}
    );

    return { sections: sectionsMap };
  }

  async findAllWorkshopsInSection(section: string): Promise<WorkshopDto[]> {
    const workshops = await this.workshopModel
      .find({ sectionId: section })
      .sort({ sortId: 1 })
      .exec();

    return workshops.map((workshop) => this.toWorkshopDto(workshop));
  }

  async createWorkshop(workshop: CreateWorkshopDto): Promise<WorkshopDto> {
    const newWorkshop = await this.workshopModel.create(workshop);
    const workshopDocument =
      await this.workshopDocumentService.createWorkshopDocument({
        workshopGroupId: newWorkshop._id,
      });
    const workshopDocumentId = this.toWorkshopDocumentId(workshopDocument);

    const updatedWorkshop = await this.workshopModel.findByIdAndUpdate(
      newWorkshop._id,
      {
        workshopDocuments: [
          {
            kind: 'PAGE',
            _id: workshopDocumentId,
            name: workshopDocument.name,
            sortId: 0,
          },
        ],
        workshopDocumentsLastUpdated: new Date(),
        $inc: { __v: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!updatedWorkshop) {
      throw new NotFoundException('Workshop was not created correctly');
    }

    return this.toWorkshopDto(updatedWorkshop);
  }

  async editWorkshopNameAndSummary(
    workshop: UpdateWorkshopDto
  ): Promise<WorkshopDto> {
    const existingWorkshop = await this.workshopModel.findById(workshop._id);
    if (!existingWorkshop) {
      throw new NotFoundException('Workshop not found');
    }

    const updatedWorkshop = await this.workshopModel.findByIdAndUpdate(
      workshop._id,
      {
        name: workshop.name ?? existingWorkshop.name,
        summary: workshop.summary ?? existingWorkshop.summary,
        thumbnail: workshop.thumbnail ?? existingWorkshop.thumbnail,
        workshopDocumentGroupId: toSpinalCase(
          workshop.name ?? existingWorkshop.name
        ),
      },
      { returnDocument: 'after' }
    );

    if (!updatedWorkshop) {
      throw new NotFoundException('Workshop update failed');
    }

    return this.toWorkshopDto(updatedWorkshop);
  }

  async deleteWorkshopAndWorkshopDocuments(
    _id: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const workshopToDelete = await this.workshopModel.findById(_id);
    if (!workshopToDelete) {
      throw new NotFoundException('Workshop not found');
    }

    if (workshopToDelete.workshopDocuments?.length) {
      await this.workshopDocumentService.deleteMany(
        workshopToDelete.workshopDocuments.filter(
          (item) => item.kind === 'PAGE'
        )
      );
    }

    return this.workshopModel.deleteOne({ _id });
  }

  async sortWorkshops(workshops: UpdateWorkshopDto[]): Promise<WorkshopDto[]> {
    const newWorkshops: WorkshopDto[] = [];
    await Promise.all(
      workshops.map(async (workshop) => {
        const newWorkshop = await this.workshopModel.findByIdAndUpdate(
          workshop._id,
          { sortId: workshop.sortId },
          { returnDocument: 'after' }
        );
        if (newWorkshop) {
          newWorkshops.push(this.toWorkshopDto(newWorkshop));
        }
      })
    );
    return newWorkshops;
  }

  async createPage(page: CreateWorkshopPageDto): Promise<WorkshopDto> {
    const { lastUpdated, workshopId, ...rest } = page;
    const parent = await this.workshopModel.findById(workshopId);
    if (!parent) throw new NotFoundException('Workshop not found');
    const workshop = await this.workshopDocumentService.createWorkshopDocument({
      ...rest,
      workshopGroupId: new Types.ObjectId(workshopId),
      lastUpdated: lastUpdated ? new Date(lastUpdated) : undefined,
    });
    const workshopDocumentId = this.toWorkshopDocumentId(workshop);
    let updatedWorkshop: TWorkshopDocument | null;
    try {
      updatedWorkshop = await this.appendJourneyItem(workshopId, {
        _id: workshopDocumentId,
        kind: 'PAGE',
        name: workshop.name,
        sortId: 0,
      });
    } catch (error) {
      await this.workshopDocumentService.deleteOne(workshopDocumentId);
      throw error;
    }
    if (!updatedWorkshop) {
      await this.workshopDocumentService.deleteOne(workshopDocumentId);
      throw new NotFoundException('Workshop not found when adding page');
    }

    return this.toWorkshopDto(updatedWorkshop);
  }

  async deletePageAndUpdateWorkshop(
    _id: string,
    workshopIdToUpdate: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const parent = await this.workshopModel.findById(workshopIdToUpdate);
    const item = parent?.workshopDocuments.find((item) => item._id === _id);
    if (!item) throw new NotFoundException('Workshop entry not found');
    const workshop = await this.workshopModel.findOneAndUpdate(
      {
        _id: workshopIdToUpdate,
        workshopDocuments: { $elemMatch: { _id, kind: item.kind } },
      },
      {
        $pull: {
          workshopDocuments: {
            _id,
          },
        },
        workshopDocumentsLastUpdated: new Date(),
        $inc: { __v: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!workshop) {
      throw new NotFoundException('Workshop not found when deleting page');
    }

    if (item.kind === 'PAGE')
      return this.workshopDocumentService.deleteOne(_id);
    return { acknowledged: true, deletedCount: 1 };
  }

  async editPageNameUpdateWorkshop({
    _id,
    name,
    workshopId,
  }: EditPageNameUpdateWorkshopDto): Promise<WorkshopDto> {
    const updatedWorkshop = await this.workshopModel.findOneAndUpdate(
      { _id: workshopId, 'workshopDocuments._id': _id },
      {
        $inc: { __v: 1 },
        $set: {
          'workshopDocuments.$.name': name,
          workshopDocumentsLastUpdated: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedWorkshop) {
      throw new NotFoundException('Workshop not found when renaming page');
    }

    return this.toWorkshopDto(updatedWorkshop);
  }

  async addReference(input: AddWorkshopReferenceDto): Promise<WorkshopDto> {
    const updated = await this.appendJourneyItem(input.workshopId, {
      _id: new Types.ObjectId().toString(),
      kind: input.kind,
      name: input.name,
      resourceId: input.resourceId,
      sortId: 0,
    });
    if (!updated) throw new NotFoundException('Workshop not found');
    return this.toWorkshopDto(updated);
  }

  private appendJourneyItem(workshopId: string, item: WorkshopJourneyItem) {
    // Pipeline append assigns the next position atomically, including concurrent appends.
    const fields = Object.fromEntries(
      Object.entries(item).map(([key, value]: [string, unknown]) => [
        key,
        { $literal: value },
      ])
    );
    return this.workshopModel.findByIdAndUpdate(
      workshopId,
      [
        {
          $set: {
            workshopDocuments: {
              $concatArrays: [
                { $ifNull: ['$workshopDocuments', []] },
                [
                  {
                    ...fields,
                    sortId: {
                      $add: [
                        {
                          $ifNull: [{ $max: '$workshopDocuments.sortId' }, -1],
                        },
                        1,
                      ],
                    },
                  },
                ],
              ],
            },
            workshopDocumentsLastUpdated: '$$NOW',
            __v: { $add: [{ $ifNull: ['$__v', 0] }, 1] },
          },
        },
      ],
      { returnDocument: 'after' }
    );
  }

  async sortPages(
    pages: WorkshopJourneyItem[],
    workshopId: string
  ): Promise<WorkshopDto> {
    if (!Types.ObjectId.isValid(workshopId))
      throw new BadRequestException('Invalid workshop ID');
    if (!Array.isArray(pages))
      throw new BadRequestException('Expected an array of journey entries');
    for (const item of pages) {
      if (!item || typeof item !== 'object')
        throw new BadRequestException('Invalid journey entry');
      const dto =
        item.kind === 'PAGE'
          ? plainToInstance(WorkshopPageIdentifierDto, item)
          : item.kind === 'ASSESSMENT_TEST'
            ? plainToInstance(AssessmentTestIdentifierDto, item)
            : item.kind === 'CODING_LAB'
              ? plainToInstance(CodingLabIdentifierDto, item)
              : null;
      if (
        !dto ||
        (await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
          .length
      ) {
        throw new BadRequestException('Invalid journey entry');
      }
    }
    const existing = await this.workshopModel.findById(workshopId);
    if (!existing) throw new NotFoundException('Workshop not found');
    const byId = new Map(
      existing.workshopDocuments.map((item) => [item._id, item])
    );
    if (
      pages.length !== byId.size ||
      new Set(pages.map((item) => item?._id)).size !== byId.size ||
      pages.some((item) => !item || !byId.has(item._id))
    ) {
      throw new BadRequestException(
        'Reorder must contain every existing entry exactly once'
      );
    }
    const ordered = pages.map((item, sortId) => ({
      ...this.toJourneyItem(byId.get(item._id)!),
      sortId,
    }));
    const updatedWorkshop = await this.workshopModel.findOneAndUpdate(
      {
        _id: workshopId,
        __v: existing.__v,
      },
      {
        workshopDocuments: ordered,
        workshopDocumentsLastUpdated: new Date(),
        $inc: { __v: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!updatedWorkshop) {
      throw new ConflictException(
        'Workshop journey changed; reload before reordering'
      );
    }

    return this.toWorkshopDto(updatedWorkshop);
  }

  private toWorkshopDto(workshop: TWorkshopDocument): WorkshopDto {
    return {
      _id: workshop._id.toString(),
      workshopDocumentGroupId: workshop.workshopDocumentGroupId,
      sectionId: workshop.sectionId,
      sortId: workshop.sortId,
      name: workshop.name,
      summary: workshop.summary,
      thumbnail: workshop.thumbnail,
      workshopDocuments:
        workshop.workshopDocuments?.map((doc) => this.toJourneyItem(doc)) ?? [],
      workshopDocumentsLastUpdated: workshop.workshopDocumentsLastUpdated,
    };
  }

  private toJourneyItem(item: WorkshopJourneyItem): WorkshopJourneyItem {
    const base = {
      _id: item._id.toString(),
      kind: item.kind,
      name: item.name,
      sortId: item.sortId,
    };
    if (item.kind === 'PAGE') return { ...base, kind: 'PAGE' };
    if (item.kind === 'ASSESSMENT_TEST')
      return { ...base, kind: 'ASSESSMENT_TEST', resourceId: item.resourceId };
    return { ...base, kind: 'CODING_LAB', resourceId: item.resourceId };
  }

  private toWorkshopDocumentId(
    workshopDocument: WorkshopPage | TWorkshopDocument
  ): string {
    return (workshopDocument as TWorkshopDocument)._id.toString();
  }
}
