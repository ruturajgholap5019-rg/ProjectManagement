import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IClient {
  _id: string;
  id: string;
  name: string;
  address?: string | null;
  referencePerson?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: null },
    referencePerson: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null, trim: true, lowercase: true },
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

ClientSchema.virtual('id').get(function (this: any) {
  return this._id;
});

export const Client = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema, 'clients');
