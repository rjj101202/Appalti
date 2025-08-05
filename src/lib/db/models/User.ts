import { ObjectId } from 'mongodb';

// User document interface voor MongoDB
export interface User {
  _id?: ObjectId;
  auth0Id: string;           // Unieke identifier van Auth0
  email: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  emailVerified: boolean;
  metadata?: {
    source?: string;         // bijv. 'auth0', 'manual', 'import'
    originalAuth0Data?: any; // Voor debugging
  };
}

// Input voor het aanmaken van een nieuwe user
export interface CreateUserInput {
  auth0Id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified?: boolean;
  metadata?: User['metadata'];
}

// Input voor het updaten van een user
export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  phoneNumber?: string;
  lastLogin?: Date;
  emailVerified?: boolean;
  metadata?: User['metadata'];
}