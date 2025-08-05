import { Collection, Db, ObjectId } from 'mongodb';
import { User, CreateUserInput, UpdateUserInput } from '../models/User';
import { getDatabase } from '@/lib/mongodb';

export class UserRepository {
  private collection: Collection<User>;

  constructor(db: Db) {
    this.collection = db.collection<User>('users');
    
    // Create indexes
    this.collection.createIndex({ auth0Id: 1 }, { unique: true });
    this.collection.createIndex({ email: 1 }, { unique: true });
    this.collection.createIndex({ createdAt: -1 });
  }

  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const now = new Date();
    const user: User = {
      ...input,
      emailVerified: input.emailVerified ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  /**
   * Find user by MongoDB ID
   */
  async findById(id: string): Promise<User | null> {
    return await this.collection.findOne({ 
      _id: new ObjectId(id) 
    });
  }

  /**
   * Find user by Auth0 ID
   */
  async findByAuth0Id(auth0Id: string): Promise<User | null> {
    return await this.collection.findOne({ auth0Id });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.collection.findOne({ 
      email: email.toLowerCase() 
    });
  }

  /**
   * Update user
   */
  async update(
    id: string,
    updates: UpdateUserInput
  ): Promise<User | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Update user by Auth0 ID
   */
  async updateByAuth0Id(
    auth0Id: string,
    updates: UpdateUserInput
  ): Promise<User | null> {
    const result = await this.collection.findOneAndUpdate(
      { auth0Id },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Update last login time
   */
  async updateLastLogin(auth0Id: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { auth0Id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Find or create user (voor Auth0 login flow)
   */
  async findOrCreate(input: CreateUserInput): Promise<{ user: User; isNew: boolean }> {
    // Probeer eerst te vinden op auth0Id
    let user = await this.findByAuth0Id(input.auth0Id);
    
    if (user) {
      // Update last login
      await this.updateLastLogin(input.auth0Id);
      return { user, isNew: false };
    }

    // Check of email al bestaat (edge case)
    const existingByEmail = await this.findByEmail(input.email);
    if (existingByEmail) {
      // Update auth0Id als het anders is
      if (existingByEmail.auth0Id !== input.auth0Id) {
        user = await this.update(
          existingByEmail._id!.toString(),
          { ...input }
        );
        return { user: user!, isNew: false };
      }
      return { user: existingByEmail, isNew: false };
    }

    // Create new user
    user = await this.create(input);
    return { user, isNew: true };
  }

  /**
   * Delete user (soft delete aanbevolen in productie)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: new ObjectId(id)
    });
    return result.deletedCount > 0;
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    return await this.collection.countDocuments();
  }
}

// Singleton instance
let userRepository: UserRepository | null = null;

export async function getUserRepository(): Promise<UserRepository> {
  if (!userRepository) {
    const db = await getDatabase();
    userRepository = new UserRepository(db);
  }
  return userRepository;
}