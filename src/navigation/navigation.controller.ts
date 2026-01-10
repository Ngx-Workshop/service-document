import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse } from '@nestjs/swagger';
import { Auth, Role, Roles } from '@tmdjr/ngx-auth-client';
import { AuthType } from '@tmdjr/ngx-auth-client/enums/auth-type.enum';
import {
  WorkshopDocumentDto,
  WorkshopDocumentIdentifierDto,
} from 'src/workshop-document/dto/create.dto';
import {
  CreateWorkshopDto,
  DeleteResultDto,
  PageParamsDto,
  SectionDto,
  SectionsMapDto,
  WorkshopDto,
} from './dto/create.dto';
import { UpdateWorkshopDto } from './dto/update.dto';
import { NavigationService } from './navigation.service';
import { WorkshopDoc } from './schemas/workshop.schema';

@ApiExtraModels(SectionDto)
@Controller('navigation')
export class NavigationController {
  constructor(private navigationService: NavigationService) {}

  @Get('sections')
  @Auth(AuthType.None)
  @ApiOkResponse({ type: SectionsMapDto, isArray: true })
  sections() {
    return this.navigationService.findAllSections();
  }

  @Get('workshops')
  @Auth(AuthType.None)
  @ApiOkResponse({ type: WorkshopDoc, isArray: true })
  workshops(@Query('section') section: string) {
    return this.navigationService.findAllWorkshopsInSection(section);
  }

  @Roles(Role.Admin)
  @Post('workshop/create-workshop')
  @ApiOkResponse({ type: WorkshopDoc })
  async createWorkshop(@Body() workshop: CreateWorkshopDto) {
    return await this.navigationService.createWorkshop(workshop);
  }

  @Roles(Role.Admin)
  @Post('workshop/edit-workshop-name-and-summary')
  @ApiOkResponse({ type: WorkshopDoc })
  async editWorkshopNameAndSummary(@Body() workshop: UpdateWorkshopDto) {
    return await this.navigationService.editWorkshopNameAndSummary(workshop);
  }

  @Post('workshop/delete-workshop-and-workshop-documents')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: DeleteResultDto })
  async deleteWorkshopAndWorkshops(@Body() body: { _id: string }) {
    return this.navigationService.deleteWorkshopAndWorkshopDocuments(body._id);
  }

  @Post('workshop/sort-workshops')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: WorkshopDoc, isArray: true })
  async sortWorkshops(@Body() workshops: UpdateWorkshopDto[]) {
    return await this.navigationService.sortWorkshops(workshops);
  }

  @Post('page/create-page')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: WorkshopDoc })
  async createPage(
    @Body()
    { page, workshopId }: PageParamsDto
  ) {
    return await this.navigationService.createPage(page, workshopId);
  }

  @Post('page/delete-page-and-update-workshop')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: DeleteResultDto })
  async deletePageAndUpdateWorkshop(
    @Body()
    { page, workshopId }: PageParamsDto
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return await this.navigationService.deletePageAndUpdateWorkshop(
      page._id,
      workshopId
    );
  }

  @Post('page/edit-page-name-update-workshop')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: WorkshopDto })
  async editPageNameUpdateWorkshop(@Body() page: WorkshopDocumentDto) {
    return await this.navigationService.editPageNameUpdateWorkshop(page);
  }

  @Roles(Role.Admin)
  @Post('page/sort-pages')
  @ApiOkResponse({ type: WorkshopDto })
  async sortPages(
    @Body() pages: WorkshopDocumentIdentifierDto[],
    @Query('workshopId') workshopId: string
  ) {
    return await this.navigationService.sortPages(pages, workshopId);
  }
}
