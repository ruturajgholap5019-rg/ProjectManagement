import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { AuthPayload } from '../../middlewares/auth.middleware.js';

export class AuthService {
  static generateTokens(user: { id: string; email: string; role: any; mustChangePassword: boolean }) {
    const payload: AuthPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRATION as any,
    });

    const refreshToken = jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRATION as any,
    });

    return { accessToken, refreshToken };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact an Administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        memberType: user.memberType,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        bio: user.bio,
        instagramUrl: user.instagramUrl,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        youtubeUrl: user.youtubeUrl,
        facebookUrl: user.facebookUrl,
        rawPassword: user.role === 'ADMIN' ? user.rawPassword : undefined,
        mustChangePassword: user.mustChangePassword,
      },
      ...tokens,
    };
  }

  static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token or inactive account', 401);
      }

      const tokens = this.generateTokens(user);
      return tokens;
    } catch (error) {
      // Re-throw application errors so they aren't masked
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const newHash = await bcrypt.hash(newPass, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        rawPassword: newPass,
        mustChangePassword: false,
      },
    });

    return { message: 'Password changed successfully' };
  }
}
