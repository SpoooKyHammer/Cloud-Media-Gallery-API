import mongoose, { Document, Schema } from 'mongoose';

export interface IErrorLog extends Document {
  message: string;
  stack?: string;
  statusCode: number;
  name: string;
  path?: string;
  method?: string;
  userId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const errorLogSchema = new Schema<IErrorLog>(
  {
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    path: {
      type: String,
    },
    method: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for querying by date and status code
errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ statusCode: 1 });
errorLogSchema.index({ name: 1 });

const ErrorLog = mongoose.model<IErrorLog>('ErrorLog', errorLogSchema);

export default ErrorLog;
