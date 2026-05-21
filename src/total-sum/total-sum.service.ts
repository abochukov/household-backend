import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

export type MonthColumn =
  | 'january'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'june'
  | 'july'
  | 'august'
  | 'september'
  | 'october'
  | 'november'
  | 'december';

export interface SaveMonthRow {
  property_id: number;
  property_number: string;
  amount: number;
}

export interface SaveMonthlySumsPayload {
  address_id: number;
  year: number;
  month: MonthColumn;
  rows: SaveMonthRow[];
}

export interface YearlyTotalRow {
  property_id: number;
  property_number: string;
  january: number | null;
  february: number | null;
  march: number | null;
  april: number | null;
  may: number | null;
  june: number | null;
  july: number | null;
  august: number | null;
  september: number | null;
  october: number | null;
  november: number | null;
  december: number | null;
  month_amount: number | null;
  total_sum: number | null;
}

@Injectable()
export class TotalSumService {
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

  async saveMonthlySums(username: string, payload: SaveMonthlySumsPayload): Promise<{ success: boolean }> {
    const { address_id, year, month, rows } = payload;

    if (!rows || rows.length === 0) {
      return { success: true };
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const row of rows) {
        await this.verifyPropertyOwnership(client, row.property_id, address_id, username);
        await this.upsertMonthValue(client, row.property_id, row.property_number, year, month, Number(row.amount || 0));
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getYearlySums(username: string, addressId: number, year: number): Promise<YearlyTotalRow[]> {
    const result = await this.pool.query(
      `SELECT
        p.property_id,
        p.property_number,
        ts.january,
        ts.february,
        ts.march,
        ts.april,
        ts.may,
        ts.june,
        ts.july,
        ts.august,
        ts.september,
        ts.october,
        ts.november,
        ts.december,
        ts.month_amount,
        ts.total_sum
      FROM household.property p
      LEFT JOIN household.total_sum ts
        ON ts.property_id = p.property_id
       AND ts.year = $3
      WHERE p.created_by = $1
        AND p.address_id = $2
      ORDER BY p.property_number ASC`,
      [username, addressId, year],
    );

    return result.rows;
  }

  private async verifyPropertyOwnership(
    client: PoolClient,
    propertyId: number,
    addressId: number,
    username: string,
  ): Promise<void> {
    const check = await client.query(
      `SELECT property_id
       FROM household.property
       WHERE property_id = $1
         AND address_id = $2
         AND created_by = $3`,
      [propertyId, addressId, username],
    );

    if (check.rows.length === 0) {
      throw new Error('Property not found or access denied');
    }
  }

  private async upsertMonthValue(
    client: PoolClient,
    propertyId: number,
    propertyNumber: string,
    year: number,
    month: MonthColumn,
    amount: number,
  ): Promise<void> {
    const existing = await client.query(
      `SELECT id
       FROM household.total_sum
       WHERE property_id = $1
         AND year = $2
       LIMIT 1`,
      [propertyId, year],
    );

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await client.query(
        `UPDATE household.total_sum
         SET ${month} = $1,
             property_number = $2
         WHERE id = $3`,
        [amount, propertyNumber, id],
      );

      await client.query(
        `UPDATE household.total_sum
         SET month_amount =
              (CASE WHEN january IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN february IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN march IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN april IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN may IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN june IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN july IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN august IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN september IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN october IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN november IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN december IS NOT NULL THEN 1 ELSE 0 END),
             total_sum =
              COALESCE(january, 0) +
              COALESCE(february, 0) +
              COALESCE(march, 0) +
              COALESCE(april, 0) +
              COALESCE(may, 0) +
              COALESCE(june, 0) +
              COALESCE(july, 0) +
              COALESCE(august, 0) +
              COALESCE(september, 0) +
              COALESCE(october, 0) +
              COALESCE(november, 0) +
              COALESCE(december, 0)
         WHERE id = $1`,
        [id],
      );

      return;
    }

    await client.query(
      `INSERT INTO household.total_sum (property_id, property_number, year, ${month})
       VALUES ($1, $2, $3, $4)`,
      [propertyId, propertyNumber, year, amount],
    );

    await client.query(
      `UPDATE household.total_sum
       SET month_amount =
            (CASE WHEN january IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN february IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN march IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN april IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN may IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN june IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN july IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN august IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN september IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN october IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN november IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN december IS NOT NULL THEN 1 ELSE 0 END),
           total_sum =
            COALESCE(january, 0) +
            COALESCE(february, 0) +
            COALESCE(march, 0) +
            COALESCE(april, 0) +
            COALESCE(may, 0) +
            COALESCE(june, 0) +
            COALESCE(july, 0) +
            COALESCE(august, 0) +
            COALESCE(september, 0) +
            COALESCE(october, 0) +
            COALESCE(november, 0) +
            COALESCE(december, 0)
       WHERE property_id = $1
         AND year = $2`,
      [propertyId, year],
    );
  }
}
