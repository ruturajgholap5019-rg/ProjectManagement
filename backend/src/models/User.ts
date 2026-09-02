import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IUser {
  _id: string;
  id: string;
  email: string;
  passwordHash: string;
  rawPassword?: string | null;
  firstName: string;
  lastName: string;
  role: string;
  memberType?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  youtubeUrl?: string | null;
  facebookUrl?: string | null;
  bio?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => randomUUID() },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    rawPassword: { type: String, default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, required: true, default: 'TEAM_MEMBER', index: true },
    memberType: { type: String, default: 'STUDENT' },
    avatarUrl: { type: String, default: null },
    phone: { type: String, default: null },
    instagramUrl: { type: String, default: null },
    linkedinUrl: { type: String, default: null },
    githubUrl: { type: String, default: null },
    youtubeUrl: { type: String, default: null },
    facebookUrl: { type: String, default: null },
    bio: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
    mustChangePassword: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

UserSchema.virtual('id').get(function (this: any) {
  return this._id;
});

UserSchema.index({ role: 1, isActive: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema, 'users');
