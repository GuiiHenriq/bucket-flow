import mongoose, { Document, Schema } from 'mongoose';

export interface ITokenBucket extends Document {
  userId: string;
  tokens: number;
  lastRefill: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const TokenBucketSchema = new Schema<ITokenBucket>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokens: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    lastRefill: {
      type: Date,
      required: true,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

TokenBucketSchema.pre('save', function (next) {
  this.version++;
  next();
});

export const TokenBucket = mongoose.model<ITokenBucket>('TokenBucket', TokenBucketSchema); 