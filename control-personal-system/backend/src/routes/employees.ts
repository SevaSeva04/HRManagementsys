import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification, notifyByRole } from '../utils/notifications';
import { EmploymentStatus, Role } from '@prisma/client';

const router = Router();

// List employees with search & filter
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { search, departmentId, positionId, status, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Role-based filtering: managers see only their department
    if (req.user!.role === Role.MANAGER && req.user!.employeeId) {
      const emp = await prisma.employee.findUnique({ where: { id: req.user!.employeeId } });
      if (emp?.departmentId) {
        where.departmentId = emp.departmentId;
      }
    } else if (req.user!.role === Role.EMPLOYEE) {
      where.id = req.user!.employeeId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { employeeNumber: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (departmentId) where.departmentId = Number(departmentId);
    if (positionId) where.positionId = Number(positionId);
    if (status) where.status = status;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: { department: true, position: true, manager: true },
        skip,
        take: Number(limit),
        orderBy: { lastName: 'asc' },
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      data: employees.map(e => ({
        ...e,
        fullName: `${e.lastName} ${e.firstName}${e.middleName ? ' ' + e.middleName : ''}`,
        departmentName: e.department?.name,
        positionTitle: e.position?.title,
        managerName: e.manager ? `${e.manager.lastName} ${e.manager.firstName}` : null,
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении списка сотрудников' });
  }
});

// Get single employee
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        position: true,
        manager: true,
        subordinates: { select: { id: true, firstName: true, lastName: true } },
        leaveBalance: true,
        user: { select: { id: true, username: true, role: true } },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }

    // Employees can only view their own profile
    if (req.user!.role === Role.EMPLOYEE && employee.id !== req.user!.employeeId) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    res.json({
      ...employee,
      fullName: `${employee.lastName} ${employee.firstName}${employee.middleName ? ' ' + employee.middleName : ''}`,
      departmentName: employee.department?.name,
      positionTitle: employee.position?.title,
      managerName: employee.manager
        ? `${employee.manager.lastName} ${employee.manager.firstName}`
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении сотрудника' });
  }
});

// Create employee
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  [
    body('firstName').notEmpty().withMessage('Укажите имя'),
    body('lastName').notEmpty().withMessage('Укажите фамилию'),
    body('email').isEmail().withMessage('Некорректный email'),
    body('dateOfBirth').notEmpty().withMessage('Укажите дату рождения'),
    body('gender').isIn(['MALE', 'FEMALE']).withMessage('Укажите пол'),
    body('hireDate').notEmpty().withMessage('Укажите дату приема'),
    body('salary').isFloat({ min: 0 }).withMessage('Укажите корректный оклад'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const data = req.body;

      // Generate employee number
      const lastEmployee = await prisma.employee.findFirst({
        orderBy: { id: 'desc' },
        select: { employeeNumber: true },
      });
      const nextNum = lastEmployee
        ? String(Number(lastEmployee.employeeNumber.replace('EMP-', '')) + 1).padStart(4, '0')
        : '0001';
      const employeeNumber = `EMP-${nextNum}`;

      const employee = await prisma.employee.create({
        data: {
          employeeNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || null,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          phone: data.phone || null,
          email: data.email,
          address: data.address || null,
          hireDate: new Date(data.hireDate),
          salary: Number(data.salary),
          departmentId: data.departmentId ? Number(data.departmentId) : null,
          positionId: data.positionId ? Number(data.positionId) : null,
          managerId: data.managerId ? Number(data.managerId) : null,
          notes: data.notes || null,
          status: EmploymentStatus.ACTIVE,
        },
        include: { department: true, position: true },
      });

      // Create leave balance for current year
      await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          year: new Date().getFullYear(),
          annualTotal: 28,
          sickTotal: 10,
        },
      });

      // Create employment history entry
      await prisma.employmentHistory.create({
        data: {
          employeeId: employee.id,
          eventType: 'HIRED',
          description: `Принят на работу на должность ${employee.position?.title || 'не указана'} в отдел ${employee.department?.name || 'не указан'}`,
          newValue: JSON.stringify({
            department: employee.department?.name,
            position: employee.position?.title,
            salary: employee.salary,
          }),
        },
      });

      // Create user account if requested
      if (data.createAccount) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(data.password || 'password123', 10);
        await prisma.user.create({
          data: {
            username: data.username || data.email,
            password: hashedPassword,
            role: data.userRole || Role.EMPLOYEE,
            employee: { connect: { id: employee.id } },
          },
        });
      }

      await notifyByRole('HR_MANAGER', 'Новый сотрудник', `Принят сотрудник: ${employee.lastName} ${employee.firstName}`, `/employees/${employee.id}`);

      res.status(201).json(employee);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Сотрудник с таким email уже существует' });
      }
      console.error(error);
      res.status(500).json({ error: 'Ошибка при создании сотрудника' });
    }
  }
);

// Update employee
router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const data = req.body;

      const existing = await prisma.employee.findUnique({
        where: { id },
        include: { department: true, position: true },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Сотрудник не найден' });
      }

      // Track changes for history
      const changes: any[] = [];

      if (data.departmentId !== undefined && data.departmentId !== existing.departmentId) {
        const newDept = data.departmentId ? await prisma.department.findUnique({ where: { id: Number(data.departmentId) } }) : null;
        changes.push({
          eventType: 'DEPARTMENT_CHANGE' as const,
          description: `Переведен из отдела "${existing.department?.name || 'не указан'}" в отдел "${newDept?.name || 'не указан'}"`,
          oldValue: existing.department?.name || null,
          newValue: newDept?.name || null,
        });
      }

      if (data.positionId !== undefined && data.positionId !== existing.positionId) {
        const newPos = data.positionId ? await prisma.position.findUnique({ where: { id: Number(data.positionId) } }) : null;
        changes.push({
          eventType: 'POSITION_CHANGE' as const,
          description: `Изменена должность с "${existing.position?.title || 'не указана'}" на "${newPos?.title || 'не указана'}"`,
          oldValue: existing.position?.title || null,
          newValue: newPos?.title || null,
        });
      }

      if (data.salary !== undefined && Number(data.salary) !== existing.salary) {
        changes.push({
          eventType: 'SALARY_CHANGE' as const,
          description: `Изменен оклад с ${existing.salary} на ${data.salary}`,
          oldValue: String(existing.salary),
          newValue: String(data.salary),
        });
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          address: data.address,
          salary: data.salary !== undefined ? Number(data.salary) : undefined,
          departmentId: data.departmentId !== undefined ? (data.departmentId ? Number(data.departmentId) : null) : undefined,
          positionId: data.positionId !== undefined ? (data.positionId ? Number(data.positionId) : null) : undefined,
          managerId: data.managerId !== undefined ? (data.managerId ? Number(data.managerId) : null) : undefined,
          notes: data.notes,
        },
        include: { department: true, position: true },
      });

      // Save history
      for (const change of changes) {
        await prisma.employmentHistory.create({
          data: { employeeId: id, ...change },
        });
      }

      if (changes.length > 0 && existing.userId) {
        await createNotification(
          existing.userId,
          'Кадровое изменение',
          changes.map(c => c.description).join('; '),
          `/employees/${id}`
        );
      }

      res.json(updated);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Сотрудник с таким email уже существует' });
      }
      console.error(error);
      res.status(500).json({ error: 'Ошибка при обновлении сотрудника' });
    }
  }
);

// Terminate employee
router.post(
  '/:id/terminate',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { reason, terminationDate } = req.body;

      const employee = await prisma.employee.update({
        where: { id },
        data: {
          status: EmploymentStatus.TERMINATED,
          terminationDate: terminationDate ? new Date(terminationDate) : new Date(),
        },
      });

      await prisma.employmentHistory.create({
        data: {
          employeeId: id,
          eventType: 'TERMINATED',
          description: `Уволен. Причина: ${reason || 'не указана'}`,
          eventDate: terminationDate ? new Date(terminationDate) : new Date(),
        },
      });

      // Deactivate user account
      if (employee.userId) {
        await prisma.user.update({
          where: { id: employee.userId },
          data: { isActive: false },
        });
      }

      res.json({ message: 'Сотрудник уволен', employee });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка при увольнении сотрудника' });
    }
  }
);

// Reinstate employee
router.post(
  '/:id/reinstate',
  authenticate,
  authorize(Role.ADMIN, Role.HR_MANAGER),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      const employee = await prisma.employee.update({
        where: { id },
        data: { status: EmploymentStatus.ACTIVE, terminationDate: null },
      });

      await prisma.employmentHistory.create({
        data: {
          employeeId: id,
          eventType: 'REINSTATED',
          description: 'Восстановлен на работе',
        },
      });

      if (employee.userId) {
        await prisma.user.update({
          where: { id: employee.userId },
          data: { isActive: true },
        });
      }

      res.json({ message: 'Сотрудник восстановлен', employee });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при восстановлении сотрудника' });
    }
  }
);

export default router;
