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

export interface MonthCharges {
  cleaner: number;
  elevatorSubscription: number;
  elevatorElectricity: number;
  stairsElectricity: number;
  majorRepair: number;
}

export interface SaveMonthlySumsPayload {
  address_id: number;
  year: number;
  month: MonthColumn;
  rows: SaveMonthRow[];
  charges: MonthCharges;
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
  paid_january: boolean;
  paid_february: boolean;
  paid_march: boolean;
  paid_april: boolean;
  paid_may: boolean;
  paid_june: boolean;
  paid_july: boolean;
  paid_august: boolean;
  paid_september: boolean;
  paid_october: boolean;
  paid_november: boolean;
  paid_december: boolean;
  paid_months: number;
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
    const { address_id, year, month, rows, charges } = payload;

    if (!rows || rows.length === 0) {
      return { success: true };
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await this.verifyAddressOwnership(client, address_id, username);
      await this.upsertMonthCharges(client, address_id, year, month, charges);

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

  async getMonthCharges(
    username: string,
    addressId: number,
    year: number,
    month: MonthColumn,
  ): Promise<MonthCharges> {
    const result = await this.pool.query(
      `SELECT
         cleaner,
         elevator_subscription,
         elevator_electricity,
         stairs_electricity,
         major_repair
       FROM household.total_sum_monthly_charge
       WHERE address_id = $1
         AND year = $2
         AND month = $3
       LIMIT 1`,
      [addressId, year, month],
    );

    if (result.rows.length === 0) {
      return {
        cleaner: 0,
        elevatorSubscription: 0,
        elevatorElectricity: 0,
        stairsElectricity: 0,
        majorRepair: 0,
      };
    }

    const row = result.rows[0];
    return {
      cleaner: Number(row.cleaner || 0),
      elevatorSubscription: Number(row.elevator_subscription || 0),
      elevatorElectricity: Number(row.elevator_electricity || 0),
      stairsElectricity: Number(row.stairs_electricity || 0),
      majorRepair: Number(row.major_repair || 0),
    };
  }

  async getYearlySums(username: string, addressId: number, year: number): Promise<YearlyTotalRow[]> {
    const result = await this.pool.query(
      `WITH payment_agg AS (
        SELECT
          tsp.property_id,
          tsp.year,
          COUNT(*) FILTER (WHERE tsp.month = 'january') AS paid_january_count,
          COUNT(*) FILTER (WHERE tsp.month = 'february') AS paid_february_count,
          COUNT(*) FILTER (WHERE tsp.month = 'march') AS paid_march_count,
          COUNT(*) FILTER (WHERE tsp.month = 'april') AS paid_april_count,
          COUNT(*) FILTER (WHERE tsp.month = 'may') AS paid_may_count,
          COUNT(*) FILTER (WHERE tsp.month = 'june') AS paid_june_count,
          COUNT(*) FILTER (WHERE tsp.month = 'july') AS paid_july_count,
          COUNT(*) FILTER (WHERE tsp.month = 'august') AS paid_august_count,
          COUNT(*) FILTER (WHERE tsp.month = 'september') AS paid_september_count,
          COUNT(*) FILTER (WHERE tsp.month = 'october') AS paid_october_count,
          COUNT(*) FILTER (WHERE tsp.month = 'november') AS paid_november_count,
          COUNT(*) FILTER (WHERE tsp.month = 'december') AS paid_december_count,
          COUNT(*) AS paid_months
        FROM household.total_sum_payment tsp
        WHERE tsp.year = $3
        GROUP BY tsp.property_id, tsp.year
      )
      SELECT
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
        (COALESCE(pa.paid_january_count, 0) > 0) AS paid_january,
        (COALESCE(pa.paid_february_count, 0) > 0) AS paid_february,
        (COALESCE(pa.paid_march_count, 0) > 0) AS paid_march,
        (COALESCE(pa.paid_april_count, 0) > 0) AS paid_april,
        (COALESCE(pa.paid_may_count, 0) > 0) AS paid_may,
        (COALESCE(pa.paid_june_count, 0) > 0) AS paid_june,
        (COALESCE(pa.paid_july_count, 0) > 0) AS paid_july,
        (COALESCE(pa.paid_august_count, 0) > 0) AS paid_august,
        (COALESCE(pa.paid_september_count, 0) > 0) AS paid_september,
        (COALESCE(pa.paid_october_count, 0) > 0) AS paid_october,
        (COALESCE(pa.paid_november_count, 0) > 0) AS paid_november,
        (COALESCE(pa.paid_december_count, 0) > 0) AS paid_december,
        COALESCE(pa.paid_months, 0) AS paid_months,
        ts.month_amount,
        ts.total_sum
      FROM household.property p
      LEFT JOIN household.total_sum ts
        ON ts.property_id = p.property_id
       AND ts.year = $3
      LEFT JOIN payment_agg pa
        ON pa.property_id = p.property_id
       AND pa.year = $3
      WHERE p.created_by = $1
        AND p.address_id = $2
      ORDER BY p.property_number ASC`,
      [username, addressId, year],
    );

    return result.rows;
  }

  async payMonthForProperty(params: {
    username: string;
    address_id: number;
    property_id: number;
    year: number;
    month: MonthColumn;
    paid_by?: string;
    note?: string;
  }): Promise<{ success: boolean; paid_amount: number; already_paid: boolean }> {
    const { username, address_id, property_id, year, month, paid_by, note } = params;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await this.verifyPropertyOwnership(client, property_id, address_id, username);

      const chargeResult = await client.query(
        `SELECT property_number, ${month} AS month_value
         FROM household.total_sum
         WHERE property_id = $1
           AND year = $2
         LIMIT 1`,
        [property_id, year],
      );

      if (chargeResult.rows.length === 0 || chargeResult.rows[0].month_value == null) {
        throw new Error('No saved monthly charge found');
      }

      const propertyNumber = String(chargeResult.rows[0].property_number);
      const monthCharge = Number(chargeResult.rows[0].month_value || 0);

      const existingPayment = await client.query(
        `SELECT id
         FROM household.total_sum_payment
         WHERE property_id = $1
           AND year = $2
           AND month = $3
         LIMIT 1`,
        [property_id, year, month],
      );

      if (existingPayment.rows.length > 0) {
        await client.query('COMMIT');
        return { success: true, paid_amount: 0, already_paid: true };
      }

      await client.query(
        `INSERT INTO household.total_sum_payment
          (property_id, property_number, year, month, amount_paid, paid_by, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [property_id, propertyNumber, year, month, monthCharge, paid_by || username, note || null],
      );

      await client.query('COMMIT');

      return {
        success: true,
        paid_amount: monthCharge,
        already_paid: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  private async verifyAddressOwnership(
    client: PoolClient,
    addressId: number,
    username: string,
  ): Promise<void> {
    const check = await client.query(
      `SELECT address_id
       FROM household.address
       WHERE address_id = $1
         AND created_by = $2`,
      [addressId, username],
    );

    if (check.rows.length === 0) {
      throw new Error('Address not found or access denied');
    }
  }

  private async upsertMonthCharges(
    client: PoolClient,
    addressId: number,
    year: number,
    month: MonthColumn,
    charges: MonthCharges,
  ): Promise<void> {
    await client.query(
      `INSERT INTO household.total_sum_monthly_charge
         (address_id, year, month, cleaner, elevator_subscription, elevator_electricity, stairs_electricity, major_repair)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (address_id, year, month)
       DO UPDATE SET
         cleaner = EXCLUDED.cleaner,
         elevator_subscription = EXCLUDED.elevator_subscription,
         elevator_electricity = EXCLUDED.elevator_electricity,
         stairs_electricity = EXCLUDED.stairs_electricity,
         major_repair = EXCLUDED.major_repair`,
      [
        addressId,
        year,
        month,
        Number(charges.cleaner || 0),
        Number(charges.elevatorSubscription || 0),
        Number(charges.elevatorElectricity || 0),
        Number(charges.stairsElectricity || 0),
        Number(charges.majorRepair || 0),
      ],
    );
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
