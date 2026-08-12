import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { RequestOtpDto, JoinQueueDto } from './dto/token.dto';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @UseGuards(ThrottlerGuard)
  @Post('request-otp')
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.tokenService.requestOtp(body.phone, body.queueId);
  }

  @UseGuards(ThrottlerGuard)
  @Post('join')
  async joinQueue(
    @Body()
    body: {
      queueId: string;
      customerName: string;
      phone?: string;
      otp?: string;
      formResponses?: any;
      language?: string;
      scheduledFor?: string;
    },
  ) {
    return this.tokenService.joinQueue(
      body.queueId,
      body.customerName,
      body.phone,
      body.otp,
      body.formResponses,
      body.language,
      body.scheduledFor,
    );
  }

  @Get(':id/status')
  async getTokenStatus(@Param('id') id: string) {
    return this.tokenService.getTokenStatus(id);
  }

  @Post(':id/cancel')
  @UseGuards(ThrottlerGuard)
  async cancelToken(@Param('id') id: string) {
    return this.tokenService.cancelToken(id);
  }

  @Post(':id/checkin')
  @UseGuards(ThrottlerGuard, AuthGuard('jwt'), WorkspaceGuard)
  async checkInToken(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.tokenService.checkIn(id, req.user.tenantId);
  }

  // Public endpoint for customer to check in themselves
  @Post(':id/customer-checkin')
  @UseGuards(ThrottlerGuard)
  async customerCheckInToken(@Param('id') id: string) {
    return this.tokenService.checkIn(id);
  }

  @UseGuards(ThrottlerGuard, AuthGuard('jwt'), WorkspaceGuard)
  @Post(':id/complete')
  async completeToken(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.tokenService.completeToken(id, req.user.tenantId);
  }

  @UseGuards(ThrottlerGuard, AuthGuard('jwt'), WorkspaceGuard)
  @Post('advance/:queueId')
  async advanceQueue(
    @Req() req: AuthenticatedRequest,
    @Param('queueId') queueId: string,
  ) {
    return this.tokenService.advanceQueue(queueId, req.user.tenantId);
  }

  @UseGuards(ThrottlerGuard, AuthGuard('jwt'), WorkspaceGuard)
  @Post('validate')
  async validateToken(
    @Req() req: AuthenticatedRequest,
    @Body() body: { tokenId: string },
  ) {
    return this.tokenService.validateToken(body.tokenId, req.user.tenantId);
  }

  @UseGuards(ThrottlerGuard, AuthGuard('jwt'), WorkspaceGuard)
  @Post(':id/transfer')
  async transferToken(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { nextQueueId: string },
  ) {
    return this.tokenService.transferToken(
      id,
      body.nextQueueId,
      req.user.tenantId,
    );
  }
}
