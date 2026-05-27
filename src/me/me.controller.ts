import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { MeService } from './me.service';

@Controller('me')
@UseGuards(SessionAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  async getMe(@Req() req: any) {
    console.log('👤 /me called, session:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('User from session:', req.session.user);

    const sessionUser = req.session?.user;
    const email = sessionUser?.email || null;

    if (!email) {
      return {
        username: null,
        email: null,
        firstname: null,
        lastname: null,
        phone: null,
        created_at: null,
      };
    }

    try {
      const profile = await this.meService.getProfileByEmail(email);
      if (profile) return profile;
    } catch (error) {
      console.warn('Failed to load profile from household.users, using session fallback:', error);
    }

    return {
      username: sessionUser.username || email,
      email,
      firstname: null,
      lastname: null,
      phone: null,
      created_at: null,
    };
  }
}
