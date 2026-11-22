import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import {
  TWorkshopPageDocument,
  WorkshopPage,
} from './schemas/workshop-page.schema';
import { observeDomainOperation } from '../observability/observability';

@Injectable()
export class WorkshopDocumentService {
  private readonly logger = new Logger(WorkshopDocumentService.name);
  constructor(
    @InjectModel(WorkshopPage.name)
    private workshopDocumentModel: Model<TWorkshopPageDocument>
  ) {}

  private ensureValidObjectId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid ObjectId: "${id}"`);
    }
  }

  async getWorkshop(id: string): Promise<WorkshopPage> {
    this.ensureValidObjectId(id);
    const WorkshopDocument = await this.workshopDocumentModel
      .findById(id)
      .exec();
    if (!WorkshopDocument) {
      throw new NotFoundException(`WorkshopDocument with ID "${id}" not found`);
    }
    return WorkshopDocument;
  }

  async getWorkshopDocumentsByWorkshopGroupId(
    workshopGroupId: string
  ): Promise<WorkshopPage[]> {
    this.ensureValidObjectId(workshopGroupId);
    return this.workshopDocumentModel.find({ workshopGroupId }).exec();
  }

  async updateWorkshopDocumentsByWorkshopGroupId(
    workshopGroupId: string,
    newWorkshopGroupId: string
  ): Promise<{ acknowledged: boolean }> {
    this.ensureValidObjectId(workshopGroupId);
    this.ensureValidObjectId(newWorkshopGroupId);
    return this.workshopDocumentModel
      .updateMany({ workshopGroupId }, { workshopGroupId: newWorkshopGroupId })
      .exec();
  }

  async createWorkshopDocument(
    workshop: Partial<WorkshopPage>
  ): Promise<TWorkshopPageDocument> {
    if (!workshop.workshopGroupId) {
      throw new BadRequestException('workshopGroupId is required');
    }
    this.ensureValidObjectId(workshop.workshopGroupId.toString());
    return this.workshopDocumentModel.create(workshop);
  }

  async findAll(): Promise<WorkshopPage[]> {
    return this.workshopDocumentModel.find().exec();
  }

  async deleteMany(
    workshopDocuments: readonly { _id: string | Types.ObjectId }[]
  ) {
    return await this.workshopDocumentModel.deleteMany({
      _id: { $in: workshopDocuments.map((document) => document._id) },
    });
  }

  async deleteOne(_id: string) {
    this.ensureValidObjectId(_id);
    return await this.workshopDocumentModel.deleteOne({ _id });
  }

  async updateWorkshopName(id: string, name: string): Promise<WorkshopPage> {
    return this.updatePage(id, { name }, 'before');
  }

  async updateWorkshopHtml(id: string, html: string): Promise<WorkshopPage> {
    return observeDomainOperation(this.logger, 'page_content_saved', () =>
      this.updatePage(id, { html }, 'after')
    );
  }

  private async updatePage(
    id: string,
    changes: Pick<WorkshopPage, 'name'> | Pick<WorkshopPage, 'html'>,
    returnDocument: 'before' | 'after'
  ): Promise<WorkshopPage> {
    this.ensureValidObjectId(id);
    try {
      const updateWorkshopDocument = await this.workshopDocumentModel
        .findByIdAndUpdate(id, changes, { returnDocument })
        .exec();

      if (!updateWorkshopDocument) {
        throw new NotFoundException(
          `WorkshopDocument with ID "${id}" not found`
        );
      }

      return updateWorkshopDocument;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          'WorkshopDocument with this name already exists'
        );
      }
      throw error;
    }
  }
}
