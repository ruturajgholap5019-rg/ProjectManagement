import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IProject {
  _id: string;
  id: string;
  name: string;
  description?: string | null;
  scope?: string | null;
  projectType: string;
  leadId?: string | null;
  previousLeadId?: string | null;
  status: string;
  statusReason?: string | null;
  priority: string;
  startDate?: Date | null;
  targetEndDate?: Date | null;
  actualEndDate?: Date | null;
  handedOverAt?: Date | null;
  maintenanceRequired: boolean;
  maintenanceNotes?: string | null;
  clientId?: string | null;
  referencePerson?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    scope: { type: String, default: null },
    projectType: { type: String, required: true, default: 'WEBSITE_WEBAPP' },
    leadId: { type: String, default: null, index: true },
    previousLeadId: { type: String, default: null },
    status: { type: String, required: true, default: 'ONGOING', index: true },
    statusReason: { type: String, default: null },
    priority: { type: String, required: true, default: 'MEDIUM' },
    startDate: { type: Date, default: null },
    targetEndDate: { type: Date, default: null },
    actualEndDate: { type: Date, default: null },
    handedOverAt: { type: Date, default: null },
    maintenanceRequired: { type: Boolean, default: false },
    maintenanceNotes: { type: String, default: null },
    clientId: { type: String, default: null, index: true },
    referencePerson: { type: String, default: null },
    createdBy: { type: String, required: true, index: true },
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

ProjectSchema.virtual('id').get(function (this: any) {
  return this._id;
});

export const Project = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema, 'projects');
