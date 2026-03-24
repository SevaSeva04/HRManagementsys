import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const positions = await prisma.position.findMany({
      include: {
        _count: { select: { employees: true } },
        departments: { include: { department: true } },
      },
      orderBy: { title: 'asc' },
    });

    res.json(positions.map(p => ({
      ...p,
      employeeCount: p._count.employees,
      departmentNames: p.departments.map(d => d.department.name),
    })));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении должностей' });
  }
});

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  [body('title').notEmpty().withMessage('Укажите название должности')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const position = await prisma.position.create({
        data: {
          title: req.body.title,
          description: req.body.description || null,
          minSalary: req.body.minSalary ? Number(req.body.minSalary) : null,
          maxSalary: req.body.maxSalary ? Number(req.body.maxSalary) : null,
        },
      });

      // Link to departments
      if (req.body.departmentIds?.length) {
        await prisma.departmentPosition.createMany({
          data: req.body.departmentIds.map((dId: number) => ({
            departmentId: dId,
            positionId: position.id,
          })),
        });
      }

      res.status(201).json(position);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Должность с таким названием уже существует' });
      }
      res.status(500).json({ error: 'Ошибка при создании должности' });
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  async (req: Request, res: Response) => {
    try {
      const position = await prisma.position.update({
        where: { id: Number(req.params.id) },
        data: {
          title: req.body.title,
          description: req.body.description,
          minSalary: req.body.minSalary !== undefined ? Number(req.body.minSalary) : undefined,
          maxSalary: req.body.maxSalary !== undefined ? Number(req.body.maxSalary) : undefined,
        },
      });
      res.json(position);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Должность с таким названием уже существует' });
      }
      res.status(500).json({ error: 'Ошибка при обновлении должности' });
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const empCount = await prisma.employee.count({ where: { positionId: Number(req.params.id) } });
      if (empCount > 0) {
        return res.status(400).json({ error: 'Невозможно удалить должность, назначенную сотрудникам' });
      }
      await prisma.position.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Должность удалена' });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при удалении должности' });
    }
  }
);

export default router;
