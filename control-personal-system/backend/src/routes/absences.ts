import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { employeeId, type, startDate, endDate } = req.query;
    const where: any = {};

    if (req.user!.role === Role.EMPLOYEE) {
      where.employeeId = req.user!.employeeId;
    }

    if (employeeId) where.employeeId = Number(employeeId);
    if (type) where.type = type;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(String(startDate));
      if (endDate) where.startDate.lte = new Date(String(endDate));
    }

    const absences = await prisma.absence.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(absences.map(a => ({
      ...a,
      employeeName: `${a.employee.lastName} ${a.employee.firstName}`,
      departmentName: a.employee.department?.name,
      days: Math.ceil((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении отсутствий' });
  }
});

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER, Role.MANAGER),
  [
    body('employeeId').notEmpty().withMessage('Укажите сотрудника'),
    body('type').notEmpty().withMessage('Укажите тип отсутствия'),
    body('startDate').notEmpty().withMessage('Укажите дату начала'),
    body('endDate').notEmpty().withMessage('Укажите дату окончания'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const absence = await prisma.absence.create({
        data: {
          employeeId: Number(req.body.employeeId),
          type: req.body.type,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
          reason: req.body.reason || null,
        },
        include: { employee: true },
      });

      res.status(201).json(absence);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при создании записи об отсутствии' });
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  async (req: Request, res: Response) => {
    try {
      await prisma.absence.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Запись удалена' });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при удалении записи' });
    }
  }
);

export default router;
