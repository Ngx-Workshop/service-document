import { Body, Controller, Get, Param, Post, UseFilters } from '@nestjs/common';
import { DomainExceptionFilter } from '../observability/domain-exception.filter';
import { ApiOkResponse } from '@nestjs/swagger';
import { Auth, Role, Roles } from '@tmdjr/ngx-auth-client';
import { AuthType } from '@tmdjr/ngx-auth-client/enums/auth-type.enum';
import { WorkshopPageDto } from './dto/create.dto';
import { WorkshopDocumentService } from './workshop-page.service';

@Controller('workshop')
export class WorkshopController {
  constructor(private workshopService: WorkshopDocumentService) {}

  @Get('health')
  health() {
    return { status: 'All good Maybe....?' };
  }

  @Get('workshops')
  @ApiOkResponse({ type: WorkshopPageDto, isArray: true })
  workshops() {
    return this.workshopService.findAll();
  }

  @Auth(AuthType.None)
  @Get(':objectId')
  @ApiOkResponse({ type: WorkshopPageDto })
  workshop(@Param() { objectId }: { objectId: string }) {
    return this.workshopService.getWorkshop(objectId);
  }

  @Roles(Role.Admin)
  @Post('update-workshop-html')
  @UseFilters(DomainExceptionFilter)
  @ApiOkResponse({ type: WorkshopPageDto })
  async updateWorkshopHtml(
    @Body() { html, _id }: { html: string; _id: string }
  ) {
    return await this.workshopService.updateWorkshopHtml(_id, html);
  }
}
