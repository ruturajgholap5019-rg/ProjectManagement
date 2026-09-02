import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface ITaskDependency {
  _id: string;
  id: string;
  taskId: string;
  dependsOnId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskDependencySchema = new Schema<ITaskDependency>(
  {
    _id: { type: String, default: () => randomUUID() },
    taskId: { type: String, required: true, index: true },
    dependsOnId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
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

TaskDependencySchema.virtual('id').get(function (this: any) {
  return this._id;
});

// A task pair can only have one directed dependency edge.
TaskDependencySchema.index({ taskId: 1, dependsOnId: 1 }, { unique: true });

export const TaskDependency = mongoose.models.TaskDependency || mongoose.model<ITaskDependency>('TaskDependency', TaskDependencySchema, 'taskDependencies');
