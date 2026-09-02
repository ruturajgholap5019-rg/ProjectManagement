import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IMilestone {
  _id: string;
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  startDate?: Date | null;
  dueDate?: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
  {
    _id: { type: String, default: () => randomUUID() },
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    status: { type: String, default: 'PENDING' },
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

MilestoneSchema.virtual('id').get(function (this: any) {
  return this._id;
});

MilestoneSchema.index({ projectId: 1, sortOrder: 1 });

export const Milestone =
  mongoose.models.Milestone || mongoose.model<IMilestone>('Milestone', MilestoneSchema, 'milestones');
