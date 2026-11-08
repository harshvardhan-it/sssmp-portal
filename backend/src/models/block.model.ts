import { HydratedDocument, Schema, Types, model } from 'mongoose';

export interface Block {
  nameHi: string;
  nameEn: string;
  code: string;
  districtId: Types.ObjectId;
  isActive: boolean;
  source?: string;
  sourceUrl?: string;
  sourceDocument?: string;
  sourceBlockCode?: string;
  datasetVersion?: string;
  verificationStatus: 'VERIFIED' | 'PROVISIONAL';
  createdAt: Date;
  updatedAt: Date;
}

export type BlockDocument = HydratedDocument<Block>;

const blockSchema = new Schema<Block>(
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
    districtId: {
      type: Schema.Types.ObjectId,
      ref: 'District',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    source: { type: String, trim: true, maxlength: 200 },
    sourceUrl: { type: String, trim: true, maxlength: 500 },
    sourceDocument: { type: String, trim: true, maxlength: 300 },
    sourceBlockCode: { type: String, trim: true, maxlength: 50 },
    datasetVersion: { type: String, trim: true, maxlength: 30 },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PROVISIONAL'],
      default: 'VERIFIED',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

blockSchema.index({ districtId: 1, nameEn: 1 });
blockSchema.index({ sourceBlockCode: 1 }, { unique: true, sparse: true });

export const Block = model<Block>('Block', blockSchema);
