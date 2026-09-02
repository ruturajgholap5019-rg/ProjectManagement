import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IAttachment {
  _id: string;
  id: string;
  projectId?: string | null;
  taskId?: string | null;
  uploadedBy: string;
  fileName: string;
  storedName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    _id: { type: String, default: () => randomUUID() },
    projectId: { type: String, default: null, index: true },
    taskId: { type: String, default: null, index: true },
    uploadedBy: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    storedName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
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

AttachmentSchema.virtual('id').get(function (this: any) {
  return this._id;
});

export const Attachment =
  mongoose.models.Attachment || mongoose.model<IAttachment>('Attachment', AttachmentSchema, 'attachments');
