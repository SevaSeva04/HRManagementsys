import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, JwtPayload } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hr-system-jwt-secret-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'hr-system-jwt-refresh-secret-2024';

function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Введите имя пользователя'),
    body('password').notEmpty().withMessage('Введите пароль'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { username },
        include: { employee: true },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
      }

      const payload: JwtPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employee?.id,
      };

      const tokens = generateTokens(payload);

      res.json({
        ...tokens,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          employeeId: user.employee?.id,
          employeeName: user.employee
            ? `${user.employee.lastName} ${user.employee.firstName}`
            : user.username,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Токен обновления не предоставлен' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
    const payload: JwtPayload = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      employeeId: decoded.employeeId,
    };
    const tokens = generateTokens(payload);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Недействительный токен обновления' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        employee: {
          include: { department: true, position: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeNumber: user.employee.employeeNumber,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            middleName: user.employee.middleName,
            email: user.employee.email,
            department: user.employee.department?.name,
            position: user.employee.position?.title,
            photoUrl: user.employee.photoUrl,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
