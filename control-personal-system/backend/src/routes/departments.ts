import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(departments.map(d => ({
      ...d,
      employeeCount: d._count.employees,
      managerName: d.manager ? `${d.manager.lastName} ${d.manager.firstName}` : null,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении отделов' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        employees: {
          include: { position: true },
          orderBy: { lastName: 'asc' },
        },
        positions: { include: { position: true } },
      },
    });

    if (!department) {
      return res.status(404).json({ error: 'Отдел не найден' });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении отдела' });
  }
});

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  [body('name').notEmpty().withMessage('Укажите название отдела')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const department = await prisma.department.create({
        data: {
          name: req.body.name,
          description: req.body.description || null,
          managerId: req.body.managerId ? Number(req.body.managerId) : null,
        },
      });
      res.status(201).json(department);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Отдел с таким названием уже существует' });
      }
      res.status(500).json({ error: 'Ошибка при создании отдела' });
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  async (req: Request, res: Response) => {
    try {
      const department = await prisma.department.update({
        where: { id: Number(req.params.id) },
        data: {
          name: req.body.name,
          description: req.body.description,
          managerId: req.body.managerId !== undefined ? (req.body.managerId ? Number(req.body.managerId) : null) : undefined,
        },
      });
      res.json(department);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Отдел с таким названием уже существует' });
      }
      res.status(500).json({ error: 'Ошибка при обновлении отдела' });
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const empCount = await prisma.employee.count({ where: { departmentId: Number(req.params.id) } });
      if (empCount > 0) {
        return res.status(400).json({ error: 'Невозможно удалить отдел с сотрудниками' });
      }
      await prisma.department.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Отдел удален' });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при удалении отдела' });
    }
  }
);

export default router;
