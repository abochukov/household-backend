// auth.controller.ts
import { Controller, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  private readonly devUsers: Array<{ email: string; password: string }> = [
    { email: 'test@test.com', password: '123456' },
    { email: 'admin@household.local', password: 'admin123' },
  ];

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: any,
  ) {
    const { email, password } = body;
    console.log('🔐 Login attempt:', email);

    const isValidUser = this.devUsers.some(
      (u) => u.email === email && u.password === password,
    );

    if (!isValidUser) {
      console.log('❌ Invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    // 👇 Записваме user-а в session
    req.session['user'] = {
      email,
    };
    console.log('✅ Session created:', req.session);
    console.log('Session ID:', req.sessionID);

    return { success: true };
  }

  @Post('logout')
  logout(@Req() req: any) {
    req.session.destroy(() => {});
    return { success: true };
  }
}
