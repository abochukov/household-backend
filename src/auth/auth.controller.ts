// auth.controller.ts
import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Body,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(
    @Body()
    body: {
      username?: string;
      email?: string;
      firstname?: string;
      lastname?: string;
      password?: string;
      phone?: string;
    },
  ) {
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const firstname = body.firstname?.trim();
    const lastname = body.lastname?.trim();
    const password = body.password;
    const phone = body.phone?.trim();

    if (!username || !email || !firstname || !lastname || !password) {
      throw new BadRequestException('Username, email, firstname, lastname and password are required');
    }

    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const existingByEmail = await this.authService.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingByUsername = await this.authService.findByUsername(username);
    if (existingByUsername) {
      throw new ConflictException('Username is already taken');
    }

    let createdUser;
    try {
      createdUser = await this.authService.createUser({
        username,
        email,
        firstname,
        lastname,
        password,
        phone,
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Username is already taken');
      }

      throw new InternalServerErrorException('Failed to create account');
    }

    const verificationUrl = this.authService.buildVerificationUrl(createdUser.verification_token || '');
    await this.authService.sendVerificationEmail(email, verificationUrl);

    return {
      success: true,
      message: 'Account created. If email delivery is enabled, a verification email has been sent.',
      email,
      verification_preview_url: verificationUrl,
    };
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: any,
  ) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    console.log('🔐 Login attempt:', email);

    const user = await this.authService.findByEmail(email);
    if (!user) {
      console.log('❌ Invalid credentials: user not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await this.authService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid credentials: wrong password');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException('Account is not verified');
    }

    // Save authenticated user in the session.
    req.session['user'] = {
      email,
      username: user.username,
      role: user.role,
    };
    console.log('✅ Session created:', req.session);
    console.log('Session ID:', req.sessionID);

    return { success: true };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token?: string, @Res() res: Response) {
    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      throw new BadRequestException('Verification token is required');
    }

    if (!this.authService.isVerificationToken(normalizedToken)) {
      throw new BadRequestException('Invalid verification token type');
    }

    const user = await this.authService.findByVerificationToken(normalizedToken);
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.authService.markUserVerified(user.id);

    const loginUrl = this.authService.buildLoginUrl({ verified: '1' });
    return res.redirect(loginUrl);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email?: string }) {
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.authService.findByEmail(email);

    // Return generic success to avoid account enumeration.
    if (!user) {
      return {
        success: true,
        message: 'If an account with this email exists, reset instructions have been prepared.',
      };
    }

    const resetToken = this.authService.generateResetPasswordToken();
    await this.authService.setResetPasswordToken(user.id, resetToken);

    const resetUrl = this.authService.buildResetPasswordUrl(resetToken);
    await this.authService.sendResetPasswordEmail(email, resetUrl);

    return {
      success: true,
      message: 'If an account with this email exists, reset instructions have been prepared.',
      reset_preview_url: resetUrl,
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token?: string; newPassword?: string }) {
    const token = body.token?.trim();
    const newPassword = body.newPassword || '';

    if (!token) {
      throw new BadRequestException('Reset token is required');
    }

    if (!this.authService.isResetToken(token)) {
      throw new BadRequestException('Invalid reset token type');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const user = await this.authService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.authService.resetPasswordByUserId(user.id, newPassword);

    return {
      success: true,
      message: 'Password was updated successfully. You can now sign in.',
    };
  }

  @Post('logout')
  logout(@Req() req: any) {
    req.session.destroy(() => {});
    return { success: true };
  }
}
