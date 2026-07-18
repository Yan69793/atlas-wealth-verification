import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Fail-closed: sem segredo no ambiente, o servidor não sobe. O fallback público
// anterior ('your-secret-key-change-in-production') estava versionado no repo —
// qualquer um assinava um token válido com ele e passava pelo authenticateToken,
// contornando o login por completo. Agora a ausência do segredo é erro de boot.
const _JWT_SECRET = process.env.JWT_SECRET;
const _JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!_JWT_SECRET || !_JWT_REFRESH_SECRET) {
  throw new Error(
    'JWT_SECRET e JWT_REFRESH_SECRET são obrigatórios. Defina-os no ambiente ' +
    '(audit-engine/.env) antes de iniciar o servidor — nenhum fallback é usado.'
  );
}
const JWT_SECRET: string = _JWT_SECRET;
const JWT_REFRESH_SECRET: string = _JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = '15m'; // Access token expires in 15 minutes
const JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token expires in 7 days

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'auditor' | 'viewer';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static refreshTokens(refreshToken: string): AuthTokens {
    const payload = this.verifyRefreshToken(refreshToken);
    return this.generateTokens(payload);
  }
}
