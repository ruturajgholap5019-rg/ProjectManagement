import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IProjectMember {
  _id: string;
  id: string;
  projectId: string;
  userId: string;
  joinedAt: Date;
}

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    _id: { type: String, default: () => randomUUID() },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    joinedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: false,
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

ProjectMemberSchema.virtual('id').get(function (this: any) {
  return this._id;
});

ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectMember =
  mongoose.models.ProjectMember || mongoose.model<IProjectMember>('ProjectMember', ProjectMemberSchema, 'project_members');
