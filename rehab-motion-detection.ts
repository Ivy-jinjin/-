import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import dbConnect from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const registerUser = async (username: string, password: string, email: string) => {
  await dbConnect();
  
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new Error('用户名或邮箱已存在');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    password: hashedPassword,
    email
  });

  const token = sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  return { user, token };
};

export const loginUser = async (username: string, password: string) => {
  await dbConnect();
  
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error('用户不存在');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('密码错误');
  }

  const token = sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  return { user, token };
}; 