import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IActivityLog {
  _id: string;
  id: string;
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  action: string;
  details?: string | null;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    _id: { type: String, default: () => randomUUID() },
    projectId: { type: String, default: null, index: true },
    taskId: { type: String, default: null, index: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    details: { type: String, default: null },
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

ActivityLogSchema.virtual('id').get(function (this: any) {
  return this._id;
});

ActivityLogSchema.index({ projectId: 1, createdAt: -1 });
ActivityLogSchema.index({ taskId: 1, createdAt: -1 });

export const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema, 'activity_logs');
