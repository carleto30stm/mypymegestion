import mongoose from 'mongoose';

export interface ICounter extends mongoose.Document {
  _id: string;
  seq: number;
}

const counterSchema = new mongoose.Schema<ICounter>({
  _id: { type: String },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model<ICounter>('Counter', counterSchema);

export default Counter;
