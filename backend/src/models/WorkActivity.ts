import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IWorkActivity {
  _id: string;
  id: string;
  serialNo: number;
  userId: string;
  projectId: string;
  workDescription: string;
  hoursSpent: number;
  assignedById?: string | null;
  dateTime: Date;
  createdAt: Date;
}

const WorkActivitySchema = new Schema<IWorkActivity>(
  {
    _id: { type: String, default: () => randomUUID() },
    serialNo: { type: Number, default: 0 },
    userId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    workDescription: { type: String, required: true },
    hoursSpent: { type: Number, default: 1.0 },
    assignedById: { type: String, default: null },
    dateTime: { type: Date, default: () => new Date() },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
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

WorkActivitySchema.virtual('id').get(function (this: any) {
  return this._id;
});

WorkActivitySchema.index({ userId: 1, dateTime: 1 });
WorkActivitySchema.index({ projectId: 1, dateTime: 1 });

export const WorkActivity =
  mongoose.models.WorkActivity || mongoose.model<IWorkActivity>('WorkActivity', WorkActivitySchema, 'work_activities');
