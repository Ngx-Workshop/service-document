import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { WorkshopDocumentIdentifierDto } from './dto/create.dto';
import {
  TWorkshopDocument,
  WorkshopDocument,
} from './schemas/workshop-document.schema';

@Injectable()
export class WorkshopDocumentService {
  constructor(
    @InjectModel(WorkshopDocument.name)
    private workshopDocumentModel: Model<TWorkshopDocument>
  ) {}

  private ensureValidObjectId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid ObjectId: "${id}"`);
    }
  }

  async getWorkshop(id: string): Promise<WorkshopDocument> {
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
  ): Promise<WorkshopDocument[]> {
    return this.workshopDocumentModel.find({ workshopGroupId }).exec();
  }

  async updateWorkshopDocumentsByWorkshopGroupId(
    workshopGroupId: string,
    newWorkshopGroupId: string
  ): Promise<{ acknowledged: boolean }> {
    return this.workshopDocumentModel
      .updateMany({ workshopGroupId }, { workshopGroupId: newWorkshopGroupId })
      .exec();
  }

  async createWorkshopDocument(
    workshop: Partial<WorkshopDocument>
  ): Promise<WorkshopDocument> {
    return this.workshopDocumentModel.create(workshop);
  }

  async findAll(): Promise<WorkshopDocument[]> {
    return this.workshopDocumentModel.find().exec();
  }

  async deleteMany(
    workshopDocuments: WorkshopDocument[] | WorkshopDocumentIdentifierDto[]
  ) {
    return await this.workshopDocumentModel.deleteMany({
      _id: workshopDocuments,
    });
  }

  async deleteOne(_id: string) {
    this.ensureValidObjectId(_id);
    return await this.workshopDocumentModel.deleteOne({ _id });
  }

  async updateWorkshopName(
    id: string,
    name: string
  ): Promise<WorkshopDocument> {
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

  async updateWorkshopHtml(id: any, html: string): Promise<WorkshopDocument> {
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
