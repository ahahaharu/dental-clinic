import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  user_id: { type: Number, index: true },
  username: String,
  action_type: { type: String, index: true },
  table_name: String,
  details: mongoose.Schema.Types.Mixed,
});

logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const Log = mongoose.model('Log', logSchema);

export const connectMongo = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/dental_logs'
    );
    console.log('Connected to MongoDB for logging');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

export default Log;
