import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { employeeId, eventType, startDate, endDate, page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (req.user!.role === Role.EMPLOYEE) {
      where.employeeId = req.user!.employeeId;
    }

    if (employeeId) where.employeeId = Number(employeeId);
    if (eventType) where.eventType = eventType;
    if (startDate || endDate) {
      where.eventDate = {};
      if (startDate) where.eventDate.gte = new Date(String(startDate));
      if (endDate) where.eventDate.lte = new Date(String(endDate));
    }

    const [records, total] = await Promise.all([
      prisma.employmentHistory.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { eventDate: 'desc' },
      }),
      prisma.employmentHistory.count({ where }),
    ]);

    res.json({
      data: records.map(r => ({
        ...r,
        employeeName: `${r.employee.lastName} ${r.employee.firstName}`,
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении истории' });
  }
});

// Get history for specific employee
router.get('/employee/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const employeeId = Number(req.params.id);

    if (req.user!.role === Role.EMPLOYEE && req.user!.employeeId !== employeeId) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const records = await prisma.employmentHistory.findMany({
      where: { employeeId },
      orderBy: { eventDate: 'desc' },
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении истории сотрудника' });
  }
});

export default router;
