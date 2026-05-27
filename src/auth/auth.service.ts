import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

export interface DbUser {
  id: number;
  username: string;
  password: string;
  role: string | null;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  created_at: string | null;
  is_verified: boolean;
  verification_token: string | null;
}

@Injectable()
export class AuthService {
  private pool: Pool;
  private readonly saltRounds = 10;
  private readonly verifyTokenPrefix = 'verify_';
  private readonly resetTokenPrefix = 'reset_';

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'household',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      options: '-c search_path=household,public',
    });
  }

  async findByEmail(email: string): Promise<DbUser | null> {
    const result = await this.pool.query(
      `SELECT id, username, password, role, email, firstname, lastname, phone, created_at, is_verified, verification_token
       FROM household.users
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async findByUsername(username: string): Promise<DbUser | null> {
    const result = await this.pool.query(
      `SELECT id, username, password, role, email, firstname, lastname, phone, created_at, is_verified, verification_token
       FROM household.users
       WHERE lower(username) = lower($1)
       LIMIT 1`,
      [username],
    );

    return result.rows[0] ?? null;
  }

  async findByVerificationToken(token: string): Promise<DbUser | null> {
    const result = await this.pool.query(
      `SELECT id, username, password, role, email, firstname, lastname, phone, created_at, is_verified, verification_token
       FROM household.users
       WHERE verification_token = $1
       LIMIT 1`,
      [token],
    );

    return result.rows[0] ?? null;
  }

  async createUser(data: {
    username: string;
    password: string;
    email: string;
    firstname: string;
    lastname: string;
    phone?: string;
  }): Promise<DbUser> {
    const passwordHash = await this.hashPassword(data.password);
    const verificationToken = this.generateVerificationToken();

    const result = await this.pool.query(
      `INSERT INTO household.users (
        username,
        password,
        role,
        email,
        firstname,
        lastname,
        phone,
        is_verified,
        verification_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
      RETURNING id, username, password, role, email, firstname, lastname, phone, created_at, is_verified, verification_token`,
      [
        data.username,
        passwordHash,
        'user',
        data.email,
        data.firstname,
        data.lastname,
        data.phone || null,
        verificationToken,
      ],
    );

    return result.rows[0];
  }

  async markUserVerified(userId: number): Promise<void> {
    await this.pool.query(
      `UPDATE household.users
       SET is_verified = true,
           verification_token = null
       WHERE id = $1`,
      [userId],
    );
  }

  async setResetPasswordToken(userId: number, token: string): Promise<void> {
    await this.pool.query(
      `UPDATE household.users
       SET verification_token = $1
       WHERE id = $2`,
      [token, userId],
    );
  }

  async resetPasswordByUserId(userId: number, newPlainPassword: string): Promise<void> {
    const passwordHash = await this.hashPassword(newPlainPassword);

    await this.pool.query(
      `UPDATE household.users
       SET password = $1,
           verification_token = null
       WHERE id = $2`,
      [passwordHash, userId],
    );
  }

  async verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, storedHash);
  }

  buildVerificationUrl(token: string): string {
    const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    return `${backendBaseUrl}/auth/verify-email?token=${token}`;
  }

  buildResetPasswordUrl(token: string): string {
    const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return `${appBaseUrl}/reset-password?token=${token}`;
  }

  generateVerificationToken(): string {
    return `${this.verifyTokenPrefix}${randomBytes(32).toString('hex')}`;
  }

  generateResetPasswordToken(): string {
    return `${this.resetTokenPrefix}${randomBytes(32).toString('hex')}`;
  }

  isVerificationToken(token: string): boolean {
    return token.startsWith(this.verifyTokenPrefix);
  }

  isResetToken(token: string): boolean {
    return token.startsWith(this.resetTokenPrefix);
  }

  async sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
    // Placeholder until AWS SES is approved/configured.
    console.log('Email verification is not enabled yet.');
    console.log(`Send verification email to: ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
  }

  async sendResetPasswordEmail(email: string, resetUrl: string): Promise<void> {
    // Placeholder until AWS SES is approved/configured.
    console.log('Password reset email is not enabled yet.');
    console.log(`Send password reset email to: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }
}
