import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export interface Property {
  property_id?: number;
  address_id: number;
  property_number: string;
  floor: number;
  area: number;
  member_amount: number;
  pets?: boolean;
  rent?: boolean;
  elevator: boolean;
  created_at?: string;
  created_by?: string;
  // Address fields (from join)
  city?: string;
  neighbourhood?: string;
  address?: string;
  entrance?: string;
}

@Injectable()
export class PropertyService {
  private pool: Pool;

  constructor() {
    console.log('🏠 PropertyService initialized');
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'household',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      options: '-c search_path=household,public',
    });
  }

  async createProperty(data: {
    address_id: number;
    property_number: string;
    floor: number;
    area: number;
    member_amount: number;
    elevator: boolean;
    pets?: boolean;
    rent?: boolean;
    username?: string;
    created_by: string;
  }): Promise<Property> {
    const {
      address_id,
      property_number,
      floor,
      area,
      member_amount,
      elevator,
      pets = false,
      rent = false,
      username,
      created_by,
    } = data;

    const resolvedUsername = username || created_by;

    const addressResult = await this.pool.query(
      `SELECT entrance FROM household.address WHERE address_id = $1`,
      [address_id]
    );

    if (addressResult.rows.length === 0) {
      throw new Error('Address not found');
    }

    const entranceId = addressResult.rows[0].entrance;

    // Check if property already exists
    const existingProperty = await this.pool.query(
      `SELECT * FROM household.property 
       WHERE address_id = $1 AND property_number = $2`,
      [address_id, property_number]
    );

    if (existingProperty.rows.length > 0) {
      throw new Error('This property already exists at this address');
    }

    const result = await this.pool.query(
      `INSERT INTO household.property (address_id, entrance_id, property_number, floor, area, member_amount, pets, rent, elevator, username, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [
        address_id,
        entranceId,
        property_number,
        floor,
        area,
        member_amount,
        pets,
        rent,
        elevator,
        resolvedUsername,
        created_by,
      ]
    );

    return result.rows[0];
  }

  async getPropertiesForUser(username: string): Promise<Property[]> {
    const result = await this.pool.query(
      `SELECT 
        p.property_id,
        p.address_id,
        p.property_number,
        p.floor,
        p.area,
        p.member_amount,
        p.pets,
        p.rent,
        p.elevator,
        p.created_at,
        p.created_by,
        a.city,
        a.neighbourhood,
        a.address,
        a.entrance
      FROM household.property p
      JOIN household.address a ON p.address_id = a.address_id
       WHERE p.created_by = $1
       ORDER BY p.created_at DESC`,
      [username]
    );

    return result.rows;
  }

  async getPropertyById(id: number): Promise<Property> {
    const result = await this.pool.query(
      `SELECT 
        p.property_id,
        p.address_id,
        p.property_number,
        p.floor,
        p.area,
        p.member_amount,
        p.pets,
        p.rent,
        p.elevator,
        p.created_at,
        p.created_by,
        a.city,
        a.neighbourhood,
        a.address,
        a.entrance
      FROM household.property p
      JOIN household.address a ON p.address_id = a.address_id
       WHERE p.property_id = $1`,
      [id]
    );

    return result.rows[0];
  }

  async updateProperty(propertyId: number, propertyData: Partial<Property>): Promise<Property> {
    const { property_number, floor, area, member_amount, pets, rent, elevator } = propertyData;

    const result = await this.pool.query(
        `UPDATE household.property
       SET property_number = COALESCE($1, property_number),
           floor = COALESCE($2, floor),
           area = COALESCE($3, area),
           member_amount = COALESCE($4, member_amount),
           pets = COALESCE($5, pets),
           rent = COALESCE($6, rent),
           elevator = COALESCE($7, elevator)
       WHERE property_id = $8
       RETURNING *`,
      [property_number, floor, area, member_amount, pets, rent, elevator, propertyId]
    );

    return result.rows[0];
  }

  async deleteProperty(id: number): Promise<void> {
    await this.pool.query(
      `DELETE FROM household.property WHERE property_id = $1`,
      [id]
    );
  }
}
