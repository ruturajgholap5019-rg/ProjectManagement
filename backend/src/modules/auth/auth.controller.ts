import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { User } from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      // Set httpOnly cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies.refreshToken;
      if (!token) {
        throw new AppError('Refresh token cookie missing', 401);
      }

      const result = await AuthService.refreshToken(token);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, { accessToken: result.accessToken }, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('refreshToken');
    sendSuccess(res, null, 'Logged out successfully');
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await User.findById(req.user.id).lean();

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const safeUser: any = {
        id: (user as any)._id,
        email: (user as any).email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        role: (user as any).role,
        memberType: (user as any).memberType,
        avatarUrl: (user as any).avatarUrl,
        phone: (user as any).phone,
        bio: (user as any).bio,
        instagramUrl: (user as any).instagramUrl,
        linkedinUrl: (user as any).linkedinUrl,
        githubUrl: (user as any).githubUrl,
        youtubeUrl: (user as any).youtubeUrl,
        facebookUrl: (user as any).facebookUrl,
        isActive: (user as any).isActive,
        mustChangePassword: (user as any).mustChangePassword,
        lastLoginAt: (user as any).lastLoginAt,
        createdAt: (user as any).createdAt,
      };

      if (req.user.role === 'ADMIN') {
        safeUser.rawPassword = (user as any).rawPassword;
      }

      sendSuccess(res, safeUser, 'Current user profile fetched');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { UserService } = await import('../users/user.service.js');
      const updated = await UserService.updateMyProfile(req.user.id, req.body);
      sendSuccess(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);

      sendSuccess(res, result, 'Password updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
