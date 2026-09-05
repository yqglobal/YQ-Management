import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/types/auth.types';
import { SendMessageDto } from './dto/message.dto';

@Controller('messages')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TENANT_ADMIN, Role.OPERATOR)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('token/:tokenId')
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('tokenId') tokenId: string,
  ) {
    return this.messagesService.getMessages(tokenId, req.user.tenantId);
  }

  @Post('token/:tokenId')
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('tokenId') tokenId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messagesService.sendMessageFromOperator(
      tokenId,
      body.text,
      req.user.tenantId,
    );
  }
  @Get('inbox')
  async getInbox(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
  ) {
    return this.messagesService.getInbox(req.user.tenantId, locationId);
  }

  @Get('inbox/:phone')
  async getInboxMessages(
    @Req() req: AuthenticatedRequest,
    @Param('phone') phone: string,
  ) {
    return this.messagesService.getInboxMessages(req.user.tenantId, phone);
  }

  @Post('inbox/:phone')
  async sendInboxMessage(
    @Req() req: AuthenticatedRequest,
    @Param('phone') phone: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messagesService.sendInboxMessage(
      req.user.tenantId,
      phone,
      body.text,
    );
  }

  @Delete('inbox/:id')
  async deleteMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') messageId: string,
  ) {
    return this.messagesService.deleteMessage(req.user.tenantId, messageId);
  }
}
