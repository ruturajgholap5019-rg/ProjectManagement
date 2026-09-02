import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IMemberSkill {
  _id: string;
  id: string;
  userId: string;
  skillName: string;
  proficiency: string;
  notes?: string | null;
  createdAt: Date;
}

const MemberSkillSchema = new Schema<IMemberSkill>(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    skillName: { type: String, required: true, trim: true },
    proficiency: { type: String, default: 'INTERMEDIATE' },
    notes: { type: String, default: null },
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

MemberSkillSchema.virtual('id').get(function (this: any) {
  return this._id;
});

MemberSkillSchema.index({ userId: 1, skillName: 1 }, { unique: true });

export const MemberSkill =
  mongoose.models.MemberSkill || mongoose.model<IMemberSkill>('MemberSkill', MemberSkillSchema, 'member_skills');
