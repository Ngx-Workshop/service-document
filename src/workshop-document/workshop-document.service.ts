import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkshopDocumentIdentifierDto } from './dto/create.dto';
import {
  TWorkshopDocument,
  WorkshopDocumentDoc,
} from './schemas/workshop-document.schema';

@Injectable()
export class WorkshopDocumentService {
  constructor(
    @InjectModel(WorkshopDocumentDoc.name)
    private workshopDocumentModel: Model<TWorkshopDocument>
  ) {}

  async getWorkshop(id: string): Promise<WorkshopDocumentDoc> {
    const workshopDocumentDoc = await this.workshopDocumentModel
      .findById(id)
      .exec();
    if (!workshopDocumentDoc) {
      throw new NotFoundException(
        `WorkshopDocumentDoc with ID "${id}" not found`
      );
    }
    return workshopDocumentDoc;
  }

  async getWorkshopDocumentsByWorkshopGroupId(
    workshopGroupId: string
  ): Promise<WorkshopDocumentDoc[]> {
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
    workshop: Partial<WorkshopDocumentDoc>
  ): Promise<WorkshopDocumentDoc> {
    return this.workshopDocumentModel.create(workshop);
  }

  async findAll(): Promise<WorkshopDocumentDoc[]> {
    return this.workshopDocumentModel.find().exec();
  }

  async deleteMany(
    workshopDocuments: WorkshopDocumentDoc[] | WorkshopDocumentIdentifierDto[]
  ) {
    return await this.workshopDocumentModel.deleteMany({
      _id: workshopDocuments,
    });
  }

  async deleteOne(_id: string) {
    return await this.workshopDocumentModel.deleteOne({ _id });
  }

  async updateWorkshopName(
    id: string,
    name: string
  ): Promise<WorkshopDocumentDoc> {
    try {
      const updateWorkshopDocumentDoc = await this.workshopDocumentModel
        .findByIdAndUpdate(id, { name }, { returnDocument: 'before' })
        .exec();

      if (!updateWorkshopDocumentDoc) {
        throw new NotFoundException(
          `WorkshopDocumentDoc with ID "${id}" not found`
        );
      }

      return updateWorkshopDocumentDoc;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'WorkshopDocumentDoc with this name already exists'
        );
      }
      throw error;
    }
  }

  async updateWorkshopHtml(
    id: any,
    html: string
  ): Promise<WorkshopDocumentDoc> {
    try {
      const updateWorkshopDocumentDoc = await this.workshopDocumentModel
        .findByIdAndUpdate(id, { html }, { returnDocument: 'after' })
        .exec();

      if (!updateWorkshopDocumentDoc) {
        throw new NotFoundException(
          `WorkshopDocumentDoc with ID "${id}" not found`
        );
      }

      return updateWorkshopDocumentDoc;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'WorkshopDocumentDoc with this name already exists'
        );
      }
      throw error;
    }
  }
}
