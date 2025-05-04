import mongoose from 'mongoose';
import { connectDB } from '../../config/database';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('Database Connection', () => {
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should connect successfully to MongoDB', async () => {
    (mongoose.connect as jest.Mock).mockResolvedValue(undefined);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(expect.stringContaining('mongodb://'));
    expect(mockConsoleLog).toHaveBeenCalledWith('MongoDB connected successfully');
    expect(mockProcessExit).not.toHaveBeenCalled();
  });

  it('should handle connection errors', async () => {
    const error = new Error('Connection failed');
    (mongoose.connect as jest.Mock).mockRejectedValue(error);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(expect.stringContaining('mongodb://'));
    expect(mockConsoleError).toHaveBeenCalledWith('MongoDB connection error:', error);
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
}); 