import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { WorkshopPage } from '../workshop-page/schemas/workshop-page.schema';
import { WorkshopDocumentService } from '../workshop-page/workshop-page.service';

import {
  CreateWorkshopPageDto,
  EditPageNameUpdateWorkshopDto,
  WorkshopPageIdentifierDto,
} from 'src/workshop-page/dto/create.dto';
import {
  CreateWorkshopDto,
  SectionDto,
  SectionsMapDto,
  WorkshopDto,
} from './dto/create.dto';
import { UpdateWorkshopDto } from './dto/update.dto';
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

  async findAllSections(): Promise<SectionsMapDto> {
    const sections = await this.sectionModel.find().lean().exec();
    const sectionsMap = sections.reduce<Record<string, SectionDto>>(
      (acc, cur) => {
        const section: SectionDto = {
          ...cur,
          _id: cur._id.toString(),
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
            _id: workshopDocumentId,
            name: workshopDocument.name,
            sortId: workshop.sortId ?? 0,
          },
        ],
        workshopDocumentsLastUpdated: new Date(),
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
        workshopToDelete.workshopDocuments
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
    const workshop = await this.workshopDocumentService.createWorkshopDocument({
      ...rest,
      workshopGroupId: new Types.ObjectId(workshopId),
      lastUpdated: lastUpdated ? new Date(lastUpdated) : undefined,
    });
    const workshopDocumentId = this.toWorkshopDocumentId(workshop);
    const updatedWorkshop = await this.workshopModel.findByIdAndUpdate(
      workshopId,
      {
        $push: {
          workshopDocuments: {
            _id: workshopDocumentId,
            name: workshop.name,
            sortId: workshop.sortId,
          },
        },
        workshopDocumentsLastUpdated: new Date(),
      },
      { returnDocument: 'after' }
    );

    if (!updatedWorkshop) {
      throw new NotFoundException('Workshop not found when adding page');
    }

    return this.toWorkshopDto(updatedWorkshop);
  }

  async deletePageAndUpdateWorkshop(
    _id: string,
    workshopIdToUpdate: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const workshop = await this.workshopModel.findByIdAndUpdate(
      workshopIdToUpdate,
      {
        $pull: {
          workshopDocuments: {
            _id,
          },
        },
        workshopDocumentsLastUpdated: new Date(),
      },
      { returnDocument: 'after' }
    );

    if (!workshop) {
      throw new NotFoundException('Workshop not found when deleting page');
    }

    return this.workshopDocumentService.deleteOne(_id);
  }

  async editPageNameUpdateWorkshop({
    _id,
    name,
    workshopId,
  }: EditPageNameUpdateWorkshopDto): Promise<WorkshopDto> {
    const updatedWorkshop = await this.workshopModel.findOneAndUpdate(
      { _id: workshopId, 'workshopDocuments._id': _id },
      {
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

  async sortPages(
    pages: WorkshopPageIdentifierDto[],
    workshopId: string
  ): Promise<WorkshopDto> {
    const updatedWorkshop = await this.workshopModel.findByIdAndUpdate(
      workshopId,
      {
        workshopDocuments: pages,
        workshopDocumentsLastUpdated: new Date(),
      },
      { returnDocument: 'after' }
    );

    if (!updatedWorkshop) {
      throw new NotFoundException('Workshop not found when sorting pages');
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
        workshop.workshopDocuments?.map((doc) => ({
          _id: (doc as WorkshopPageIdentifierDto)._id.toString(),
          name: doc.name,
          sortId: doc.sortId,
        })) ?? [],
      workshopDocumentsLastUpdated: workshop.workshopDocumentsLastUpdated,
    };
  }

  private toWorkshopDocumentId(
    workshopDocument: WorkshopPage | TWorkshopDocument
  ): string {
    return (workshopDocument as TWorkshopDocument)._id.toString();
  }
}
