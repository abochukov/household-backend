import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';

@Controller('me')
@UseGuards(SessionAuthGuard)
export class MeController {

  @Get()
  getMe(@Req() req: any) {
    return req.session.user;
  }
}
