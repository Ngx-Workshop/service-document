import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse } from '@nestjs/swagger';
import { Auth, Role, Roles } from '@tmdjr/ngx-auth-client';
import { AuthType } from '@tmdjr/ngx-auth-client/enums/auth-type.enum';
import {
  CreateWorkshopPageDto,
  EditPageNameUpdateWorkshopDto,
  WorkshopPageIdentifierDto,
} from 'src/workshop-page/dto/create.dto';
import {
  CreateWorkshopDto,
  DeletePageParamsDto,
  DeleteResultDto,
  SectionDto,
  SectionsMapDto,
  WorkshopDto,
} from './dto/create.dto';
import { UpdateWorkshopDto } from './dto/update.dto';
import { NavigationService } from './navigation.service';
import { Workshop } from './schemas/workshop.schema';

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
  @ApiOkResponse({ type: Workshop, isArray: true })
  workshops(@Query('section') section: string) {
    return this.navigationService.findAllWorkshopsInSection(section);
  }

  @Roles(Role.Admin)
  @Post('workshop/create-workshop')
  @ApiOkResponse({ type: Workshop })
  async createWorkshop(@Body() workshop: CreateWorkshopDto) {
    return await this.navigationService.createWorkshop(workshop);
  }

  @Roles(Role.Admin)
  @Post('workshop/edit-workshop-name-and-summary')
  @ApiOkResponse({ type: Workshop })
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
  @ApiOkResponse({ type: Workshop, isArray: true })
  async sortWorkshops(@Body() workshops: UpdateWorkshopDto[]) {
    return await this.navigationService.sortWorkshops(workshops);
  }

  @Post('page/create-page')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: Workshop })
  async createPage(
    @Body()
    page: CreateWorkshopPageDto
  ) {
    return await this.navigationService.createPage(page);
  }

  @Post('page/delete-page-and-update-workshop')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: DeleteResultDto })
  async deletePageAndUpdateWorkshop(
    @Body()
    page: DeletePageParamsDto
  ): Promise<DeleteResultDto> {
    return await this.navigationService.deletePageAndUpdateWorkshop(
      page._id,
      page.workshopId
    );
  }

  @Post('page/edit-page-name-update-workshop')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: WorkshopDto })
  async editPageNameUpdateWorkshop(
    @Body() page: EditPageNameUpdateWorkshopDto
  ) {
    return await this.navigationService.editPageNameUpdateWorkshop(page);
  }

  @Roles(Role.Admin)
  @Post('page/sort-pages')
  @ApiOkResponse({ type: WorkshopDto })
  async sortPages(
    @Body() pages: WorkshopPageIdentifierDto[],
    @Query('workshopId') workshopId: string
  ) {
    return await this.navigationService.sortPages(pages, workshopId);
  }
}
