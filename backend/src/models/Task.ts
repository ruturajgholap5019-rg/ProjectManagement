import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface ITask {
  _id: string;
  id: string;
  projectId: string;
  milestoneId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  coAssigneeId?: string | null;
  assignedBy?: string | null;
  assignedAt?: Date | null;
  status: string;
  priority: string;
  startDate?: Date | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  isBlocked: boolean;
  blockedReason?: string | null;
  completionNotes?: string | null;
  sortOrder: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    _id: { type: String, default: () => randomUUID() },
    projectId: { type: String, required: true, index: true },
    milestoneId: { type: String, default: null, index: true },
    parentTaskId: { type: String, default: null, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    assigneeId: { type: String, default: null, index: true },
    coAssigneeId: { type: String, default: null },
    assignedBy: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    status: { type: String, required: true, default: 'TODO', index: true },
    priority: { type: String, required: true, default: 'MEDIUM' },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false, index: true },
    blockedReason: { type: String, default: null },
    completionNotes: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    createdById: { type: String, required: true },
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

TaskSchema.virtual('id').get(function (this: any) {
  return this._id;
});

TaskSchema.index({ projectId: 1, status: 1 });

export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema, 'tasks');
