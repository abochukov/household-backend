import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';

@Controller('me')
@UseGuards(SessionAuthGuard)
export class MeController {

  @Get()
  getMe(@Req() req: any) {
    console.log('👤 /me called, session:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('User from session:', req.session.user);
    return req.session.user;
  }
}
