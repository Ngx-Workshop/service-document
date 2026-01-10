import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Auth, RemoteAuthGuard, Role, Roles } from '@tmdjr/ngx-auth-client';
import { AuthType } from '@tmdjr/ngx-auth-client/enums/auth-type.enum';
import { WorkshopDocumentDto } from './dto/create.dto';
import { WorkshopDocumentService } from './workshop-document.service';

@Controller('workshop')
export class WorkshopController {
  constructor(private workshopService: WorkshopDocumentService) {}

  @Get('health')
  health() {
    return { status: 'All good Maybe....?' };
  }

  @Get('workshops')
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: WorkshopDocumentDto, isArray: true })
  workshops() {
    return this.workshopService.findAll();
  }

  @Auth(AuthType.None)
  @Get(':objectId')
  @ApiOkResponse({ type: WorkshopDocumentDto })
  workshop(@Param('objectId') objectId) {
    return this.workshopService.getWorkshop(objectId);
  }

  @Roles(Role.Admin)
  @Post('update-workshop-html')
  @ApiOkResponse({ type: WorkshopDocumentDto })
  async updateWorkshopHtml(
    @Body() { html, _id }: { html: string; _id: string }
  ) {
    return await this.workshopService.updateWorkshopHtml(_id, html);
  }
}
