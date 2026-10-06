import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Auth, Role, Roles } from '@tmdjr/ngx-auth-client';
import { AuthType } from '@tmdjr/ngx-auth-client/enums/auth-type.enum';
import {
  CreateWorkshopPageDto,
  EditPageNameUpdateWorkshopDto,
  WorkshopPageIdentifierDto,
} from 'src/workshop-page/dto/create.dto';
import {
  CreateSectionDto,
  CreateWorkshopDto,
  DeletePageParamsDto,
  DeleteResultDto,
  SectionDto,
  SectionParamsDto,
  SectionsMapDto,
  WorkshopDto,
} from './dto/create.dto';
import { UpdateSectionDto, UpdateWorkshopDto } from './dto/update.dto';
import { NavigationService } from './navigation.service';
import {
  AddWorkshopReferenceDto,
  AssessmentTestIdentifierDto,
  CodingLabIdentifierDto,
  WorkshopJourneyItem,
  journeyItemSchema,
} from './dto/journey.dto';

@ApiExtraModels(
  SectionDto,
  WorkshopPageIdentifierDto,
  AssessmentTestIdentifierDto,
  CodingLabIdentifierDto
)
@Controller('navigation')
export class NavigationController {
  constructor(private navigationService: NavigationService) {}

  @Get('sections')
  @Auth(AuthType.None)
  @ApiOkResponse({ type: SectionsMapDto })
  sections() {
    return this.navigationService.findAllSections();
  }

  @Post('section/create-section')
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: SectionDto })
  createSection(@Body() section: CreateSectionDto): Promise<SectionDto> {
    return this.navigationService.createSection(section);
  }

  @Get('section/:id')
  @Auth(AuthType.None)
  @ApiOkResponse({ type: SectionDto })
  @ApiBadRequestResponse({ description: 'Invalid section key' })
  @ApiNotFoundResponse({ description: 'Section not found' })
  section(@Param() params: SectionParamsDto): Promise<SectionDto> {
    return this.navigationService.findSection(params.id);
  }

  @Patch('section/:id')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: SectionDto })
  @ApiBadRequestResponse({ description: 'Invalid section key or update' })
  @ApiNotFoundResponse({ description: 'Section not found' })
  updateSection(
    @Param() params: SectionParamsDto,
    @Body() section: UpdateSectionDto
  ): Promise<SectionDto> {
    return this.navigationService.updateSection(params.id, section);
  }

  @Delete('section/:id')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: DeleteResultDto })
  @ApiBadRequestResponse({ description: 'Invalid section key' })
  @ApiNotFoundResponse({ description: 'Section not found' })
  @ApiConflictResponse({ description: 'Section contains workshops' })
  deleteSection(@Param() params: SectionParamsDto): Promise<DeleteResultDto> {
    return this.navigationService.deleteSection(params.id);
  }

  @Get('workshops')
  @Auth(AuthType.None)
  @ApiOkResponse({ type: WorkshopDto, isArray: true })
  workshops(@Query('section') section: string) {
    return this.navigationService.findAllWorkshopsInSection(section);
  }

  @Roles(Role.Admin)
  @Post('workshop/create-workshop')
  @ApiCreatedResponse({ type: WorkshopDto })
  async createWorkshop(@Body() workshop: CreateWorkshopDto) {
    return await this.navigationService.createWorkshop(workshop);
  }

  @Roles(Role.Admin)
  @Post('workshop/edit-workshop-name-and-summary')
  @ApiCreatedResponse({ type: WorkshopDto })
  async editWorkshopNameAndSummary(@Body() workshop: UpdateWorkshopDto) {
    return await this.navigationService.editWorkshopNameAndSummary(workshop);
  }

  @Post('workshop/delete-workshop-and-workshop-documents')
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: DeleteResultDto })
  async deleteWorkshopAndWorkshops(@Body() body: { _id: string }) {
    return this.navigationService.deleteWorkshopAndWorkshopDocuments(body._id);
  }

  @Post('workshop/sort-workshops')
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: WorkshopDto, isArray: true })
  async sortWorkshops(@Body() workshops: UpdateWorkshopDto[]) {
    return await this.navigationService.sortWorkshops(workshops);
  }

  @Post('page/create-page')
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: WorkshopDto })
  async createPage(
    @Body()
    page: CreateWorkshopPageDto
  ) {
    return await this.navigationService.createPage(page);
  }

  @Post('page/add-reference')
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: WorkshopDto })
  @ApiBadRequestResponse({ description: 'Invalid reference' })
  @ApiNotFoundResponse({ description: 'Workshop not found' })
  addReference(@Body() reference: AddWorkshopReferenceDto) {
    return this.navigationService.addReference(reference);
  }

  @Post('page/delete-page-and-update-workshop')
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: DeleteResultDto })
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
  @ApiCreatedResponse({ type: WorkshopDto })
  async editPageNameUpdateWorkshop(
    @Body() page: EditPageNameUpdateWorkshopDto
  ) {
    return await this.navigationService.editPageNameUpdateWorkshop(page);
  }

  @Roles(Role.Admin)
  @Post('page/sort-pages')
  @ApiCreatedResponse({ type: WorkshopDto })
  @ApiBadRequestResponse({ description: 'Invalid journey permutation' })
  @ApiNotFoundResponse({ description: 'Workshop not found' })
  @ApiConflictResponse({ description: 'Journey changed during reorder' })
  @ApiBody({ schema: { type: 'array', items: journeyItemSchema } })
  async sortPages(
    @Body(new ParseArrayPipe({ items: Object, optional: false }))
    pages: WorkshopJourneyItem[],
    @Query('workshopId') workshopId: string
  ) {
    return await this.navigationService.sortPages(pages, workshopId);
  }
}
