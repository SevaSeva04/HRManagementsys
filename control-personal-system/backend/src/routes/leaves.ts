import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { createNotification } from '../utils/notifications';
import { Role, LeaveStatus } from '@prisma/client';

const router = Router();

// Get leave requests
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, employeeId, startDate, endDate, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (req.user!.role === Role.EMPLOYEE) {
      where.employeeId = req.user!.employeeId;
    } else if (req.user!.role === Role.MANAGER && req.user!.employeeId) {
      const emp = await prisma.employee.findUnique({ where: { id: req.user!.employeeId } });
      if (emp?.departmentId) {
        where.employee = { departmentId: emp.departmentId };
      }
    }

    if (status) where.status = status;
    if (employeeId) where.employeeId = Number(employeeId);
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(String(startDate));
      if (endDate) where.startDate.lte = new Date(String(endDate));
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, department: true },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    res.json({
      data: requests.map(r => ({
        ...r,
        employeeName: `${r.employee.lastName} ${r.employee.firstName}`,
        departmentName: r.employee.department?.name,
        days: Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении заявок' });
  }
});

// Create leave request
router.post(
  '/',
  authenticate,
  [
    body('type').notEmpty().withMessage('Укажите тип отпуска'),
    body('startDate').notEmpty().withMessage('Укажите дату начала'),
    body('endDate').notEmpty().withMessage('Укажите дату окончания'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { type, startDate, endDate, reason } = req.body;
      const employeeId = req.body.employeeId || req.user!.employeeId;

      if (!employeeId) {
        return res.status(400).json({ error: 'Сотрудник не найден' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        return res.status(400).json({ error: 'Дата окончания должна быть позже даты начала' });
      }

      // Check for overlapping leaves
      const overlap = await prisma.leaveRequest.findFirst({
        where: {
          employeeId: Number(employeeId),
          status: { notIn: [LeaveStatus.REJECTED, LeaveStatus.DRAFT] },
          OR: [
            { startDate: { lte: end }, endDate: { gte: start } },
          ],
        },
      });

      if (overlap) {
        return res.status(400).json({ error: 'Даты пересекаются с существующей заявкой на отпуск' });
      }

      // Check leave balance
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const balance = await prisma.leaveBalance.findUnique({ where: { employeeId: Number(employeeId) } });

      if (balance && type === 'ANNUAL') {
        const remaining = balance.annualTotal - balance.annualUsed;
        if (days > remaining) {
          return res.status(400).json({ error: `Недостаточно дней отпуска. Остаток: ${remaining} дн.` });
        }
      }

      const request = await prisma.leaveRequest.create({
        data: {
          employeeId: Number(employeeId),
          type,
          startDate: start,
          endDate: end,
          reason: reason || null,
          status: req.body.status === 'DRAFT' ? LeaveStatus.DRAFT : LeaveStatus.PENDING,
        },
        include: { employee: { select: { firstName: true, lastName: true, managerId: true, manager: { select: { userId: true } } } } },
      });

      // Notify manager
      if (request.status === LeaveStatus.PENDING && request.employee.manager?.userId) {
        await createNotification(
          request.employee.manager.userId,
          'Новая заявка на отпуск',
          `${request.employee.lastName} ${request.employee.firstName} подал(а) заявку на отпуск`,
          `/leaves`
        );
      }

      res.status(201).json(request);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка при создании заявки' });
    }
  }
);

// Approve/reject leave by manager
router.post(
  '/:id/review',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER, Role.MANAGER),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { action, comment } = req.body; // action: 'approve' | 'reject'

      const request = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { employee: { select: { userId: true, firstName: true, lastName: true } } },
      });

      if (!request) {
        return res.status(404).json({ error: 'Заявка не найдена' });
      }

      let newStatus: LeaveStatus;

      if (action === 'reject') {
        newStatus = LeaveStatus.REJECTED;
      } else if (req.user!.role === Role.MANAGER) {
        newStatus = LeaveStatus.APPROVED_BY_MANAGER;
      } else {
        newStatus = LeaveStatus.APPROVED;
      }

      const updated = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: newStatus,
          managerComment: req.user!.role === Role.MANAGER ? comment : undefined,
          hrComment: (req.user!.role === Role.ADMIN || req.user!.role === Role.HR_MANAGER) ? comment : undefined,
        },
      });

      // Update leave balance if approved
      if (newStatus === LeaveStatus.APPROVED && request.type === 'ANNUAL') {
        const days = Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        await prisma.leaveBalance.update({
          where: { employeeId: request.employeeId },
          data: { annualUsed: { increment: days } },
        });
      }

      // Notify employee
      if (request.employee.userId) {
        const statusText = newStatus === LeaveStatus.REJECTED ? 'отклонена' :
          newStatus === LeaveStatus.APPROVED ? 'одобрена' : 'одобрена руководителем';
        await createNotification(
          request.employee.userId,
          'Статус заявки на отпуск',
          `Ваша заявка на отпуск ${statusText}${comment ? '. Комментарий: ' + comment : ''}`,
          `/leaves`
        );
      }

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка при обработке заявки' });
    }
  }
);

// Get leave balance
router.get('/balance/:employeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const employeeId = Number(req.params.employeeId);
    let balance = await prisma.leaveBalance.findUnique({ where: { employeeId } });

    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: { employeeId, year: new Date().getFullYear(), annualTotal: 28, sickTotal: 10 },
      });
    }

    res.json({
      ...balance,
      annualRemaining: balance.annualTotal - balance.annualUsed,
      sickRemaining: balance.sickTotal - balance.sickUsed,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении баланса отпусков' });
  }
});

export default router;
