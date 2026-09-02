import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IComment {
  _id: string;
  id: string;
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    _id: { type: String, default: () => randomUUID() },
    projectId: { type: String, default: null, index: true },
    taskId: { type: String, default: null, index: true },
    userId: { type: String, required: true, index: true },
    content: { type: String, required: true },
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

CommentSchema.virtual('id').get(function (this: any) {
  return this._id;
});

CommentSchema.index({ projectId: 1, createdAt: -1 });
CommentSchema.index({ taskId: 1, createdAt: -1 });

export const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema, 'comments');
