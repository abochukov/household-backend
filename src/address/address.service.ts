import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export interface Address {
  address_id: number;
  city: string;
  neighbourhood?: string;
  address: string;
  entrance: string;
  floors?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

@Injectable()
export class AddressService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'household',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      options: '-c search_path=household,public',
    });
  }

  async createAddress(data: {
    city: string;
    neighbourhood?: string;
    address: string;
    entranceId: string;
    floors?: number;
    created_by: string;
  }): Promise<Address> {
    const { city, neighbourhood, address, entranceId, floors, created_by } = data;

    // Check if address already exists
    const checkQuery = 'SELECT * FROM household.address WHERE city = $1 AND address = $2 AND entrance = $3';
    const existing = await this.pool.query(checkQuery, [city, address, entranceId]);

    if (existing.rows.length > 0) {
      throw new Error('This address already exists');
    }

    // Insert new address
    const insertQuery = `
      INSERT INTO household.address (city, neighbourhood, address, entrance, floors, created_at, updated_at, created_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
      RETURNING address_id, city, neighbourhood, address, entrance, floors, created_at, updated_at, created_by
    `;

    const result = await this.pool.query(insertQuery, [city, neighbourhood, address, entranceId, floors, created_by]);
    return result.rows[0];
  }

  async getAddressesForUser(username: string): Promise<Address[]> {
    const query = `
      SELECT address_id, city, neighbourhood, address, entrance, floors, created_at 
      FROM household.address 
      WHERE created_by = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [username]);
    return result.rows;
  }

  async updateAddress(id: number, data: {
    city: string;
    neighbourhood?: string;
    address: string;
    entranceId: string;
    floors?: number;
  }): Promise<Address> {
    const { city, neighbourhood, address, entranceId, floors } = data;

    const query = `
      UPDATE household.address
      SET city = $1, neighbourhood = $2, address = $3, entrance = $4, floors = $5, updated_at = NOW()
      WHERE address_id = $6
      RETURNING *
    `;

    const result = await this.pool.query(query, [city, neighbourhood, address, entranceId, floors, id]);
    
    if (result.rows.length === 0) {
      throw new Error('Address not found');
    }

    return result.rows[0];
  }

  async deleteAddress(id: number): Promise<Address> {
    const query = 'DELETE FROM household.address WHERE address_id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Address not found');
    }

    return result.rows[0];
  }
}
