import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IProjectCategory {
  _id: string;
  id: string;
  code: string;
  name: string;
  icon: string;
  description?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectCategorySchema = new Schema<IProjectCategory>(
  {
    _id: { type: String, default: () => randomUUID() },
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '📁' },
    description: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
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

ProjectCategorySchema.virtual('id').get(function (this: any) {
  return this._id;
});

export const ProjectCategory =
  mongoose.models.ProjectCategory ||
  mongoose.model<IProjectCategory>('ProjectCategory', ProjectCategorySchema, 'project_categories');
