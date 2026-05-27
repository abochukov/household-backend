import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export interface UserProfile {
  username: string | null;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  created_at: string | null;
}

@Injectable()
export class MeService {
  private pool: Pool;

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

  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const query = `
      SELECT
        username,
        email,
        firstname,
        lastname,
        phone,
        created_at
      FROM household.users
      WHERE email = $1
      LIMIT 1
    `;

    const result = await this.pool.query(query, [email]);
    if (result.rows.length === 0) return null;

    return result.rows[0] as UserProfile;
  }
}
