import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { WorkshopPageIdentifierDto } from './dto/create.dto';
import {
  TWorkshopPageDocument,
  WorkshopPage,
} from './schemas/workshop-page.schema';

@Injectable()
export class WorkshopDocumentService {
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
  ): Promise<WorkshopPage> {
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
    workshopDocuments: WorkshopPage[] | WorkshopPageIdentifierDto[]
  ) {
    return await this.workshopDocumentModel.deleteMany({
      _id: workshopDocuments,
    });
  }

  async deleteOne(_id: string) {
    this.ensureValidObjectId(_id);
    return await this.workshopDocumentModel.deleteOne({ _id });
  }

  async updateWorkshopName(id: string, name: string): Promise<WorkshopPage> {
    this.ensureValidObjectId(id);
    try {
      const updateWorkshopDocument = await this.workshopDocumentModel
        .findByIdAndUpdate(id, { name }, { returnDocument: 'before' })
        .exec();

      if (!updateWorkshopDocument) {
        throw new NotFoundException(
          `WorkshopDocument with ID "${id}" not found`
        );
      }

      return updateWorkshopDocument;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'WorkshopDocument with this name already exists'
        );
      }
      throw error;
    }
  }

  async updateWorkshopHtml(id: any, html: string): Promise<WorkshopPage> {
    this.ensureValidObjectId(id);
    try {
      const updateWorkshopDocument = await this.workshopDocumentModel
        .findByIdAndUpdate(id, { html }, { returnDocument: 'after' })
        .exec();

      if (!updateWorkshopDocument) {
        throw new NotFoundException(
          `WorkshopDocument with ID "${id}" not found`
        );
      }

      return updateWorkshopDocument;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'WorkshopDocument with this name already exists'
        );
      }
      throw error;
    }
  }
}
