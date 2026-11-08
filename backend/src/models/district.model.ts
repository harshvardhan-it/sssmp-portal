import { HydratedDocument, Schema, model } from 'mongoose';

export interface District {
  nameHi: string;
  nameEn: string;
  code: string;
  isActive: boolean;
  source?: string;
  sourceUrl?: string;
  sourceRetrievedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DistrictDocument = HydratedDocument<District>;

const districtSchema = new Schema<District>(
  {
    nameHi: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    nameEn: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 20,
      match: /^[A-Z0-9_-]+$/,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    sourceUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    sourceRetrievedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

districtSchema.index({ nameEn: 1 });

export const District = model<District>('District', districtSchema);
