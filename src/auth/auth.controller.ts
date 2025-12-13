// auth.controller.ts
import { Controller, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Controller('auth')
export class AuthController {

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: { session?: any },
  ) {
    const { email, password } = body;

    // TODO: проверка в база
    if (email !== 'test@test.com' || password !== '123456') {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 👇 Записваме user-а в session
    req.session['user'] = {
      email,
    };

    return { success: true };
  }

  @Post('logout')
  logout(@Req() req: any) {
    req.session.destroy(() => {});
    return { success: true };
  }
}
