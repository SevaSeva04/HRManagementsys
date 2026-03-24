import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Dashboard stats
router.get('/dashboard', authenticate, authorize(Role.ADMIN, Role.HR_MANAGER), async (_req: Request, res: Response) => {
  try {
    const [
      totalEmployees,
      activeEmployees,
      terminatedEmployees,
      onLeaveEmployees,
      departmentStats,
      positionStats,
      pendingLeaves,
      recentHires,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.employee.count({ where: { status: 'TERMINATED' } }),
      prisma.employee.count({ where: { status: 'ON_LEAVE' } }),
      prisma.employee.groupBy({
        by: ['departmentId'],
        _count: true,
        where: { status: 'ACTIVE', departmentId: { not: null } },
      }),
      prisma.employee.groupBy({
        by: ['positionId'],
        _count: true,
        where: { status: 'ACTIVE', positionId: { not: null } },
      }),
      prisma.leaveRequest.count({ where: { status: { in: ['PENDING', 'APPROVED_BY_MANAGER'] } } }),
      prisma.employee.count({
        where: {
          hireDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    // Get department names
    const departments = await prisma.department.findMany({ select: { id: true, name: true } });
    const departmentMap = Object.fromEntries(departments.map(d => [d.id, d.name]));

    const positions = await prisma.position.findMany({ select: { id: true, title: true } });
    const positionMap = Object.fromEntries(positions.map(p => [p.id, p.title]));

    // Monthly hires for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyHires = await prisma.employee.findMany({
      where: { hireDate: { gte: twelveMonthsAgo } },
      select: { hireDate: true },
    });

    const hiresByMonth: Record<string, number> = {};
    monthlyHires.forEach(e => {
      const key = `${e.hireDate.getFullYear()}-${String(e.hireDate.getMonth() + 1).padStart(2, '0')}`;
      hiresByMonth[key] = (hiresByMonth[key] || 0) + 1;
    });

    // Monthly terminations for turnover
    const monthlyTerminations = await prisma.employee.findMany({
      where: { terminationDate: { gte: twelveMonthsAgo }, status: 'TERMINATED' },
      select: { terminationDate: true },
    });

    const termsByMonth: Record<string, number> = {};
    monthlyTerminations.forEach(e => {
      if (e.terminationDate) {
        const key = `${e.terminationDate.getFullYear()}-${String(e.terminationDate.getMonth() + 1).padStart(2, '0')}`;
        termsByMonth[key] = (termsByMonth[key] || 0) + 1;
      }
    });

    res.json({
      summary: {
        totalEmployees,
        activeEmployees,
        terminatedEmployees,
        onLeaveEmployees,
        pendingLeaves,
        recentHires,
      },
      byDepartment: departmentStats.map(d => ({
        department: departmentMap[d.departmentId!] || 'Без отдела',
        count: d._count,
      })),
      byPosition: positionStats.map(p => ({
        position: positionMap[p.positionId!] || 'Без должности',
        count: p._count,
      })),
      hiresByMonth: Object.entries(hiresByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      turnoverByMonth: Object.entries(termsByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении аналитики' });
  }
});

// Reports: employees by department
router.get('/reports/by-department', authenticate, authorize(Role.ADMIN, Role.HR_MANAGER), async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          where: { status: 'ACTIVE' },
          include: { position: true },
          orderBy: { lastName: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при формировании отчета' });
  }
});

// Reports: employees on leave for period
router.get('/reports/on-leave', authenticate, authorize(Role.ADMIN, Role.HR_MANAGER), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { status: 'APPROVED' };

    if (startDate) where.startDate = { gte: new Date(String(startDate)) };
    if (endDate) where.endDate = { ...(where.endDate || {}), lte: new Date(String(endDate)) };

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { firstName: true, lastName: true, department: { select: { name: true } }, position: { select: { title: true } } },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json(leaves.map(l => ({
      employeeName: `${l.employee.lastName} ${l.employee.firstName}`,
      department: l.employee.department?.name,
      position: l.employee.position?.title,
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
      days: Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при формировании отчета' });
  }
});

// CSV export: employees
router.get('/export/employees', authenticate, authorize(Role.ADMIN, Role.HR_MANAGER), async (_req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { department: true, position: true },
      orderBy: { lastName: 'asc' },
    });

    const header = 'Табельный номер;Фамилия;Имя;Отчество;Email;Телефон;Отдел;Должность;Оклад;Статус;Дата приема\n';
    const rows = employees.map(e =>
      `${e.employeeNumber};${e.lastName};${e.firstName};${e.middleName || ''};${e.email};${e.phone || ''};${e.department?.name || ''};${e.position?.title || ''};${e.salary};${e.status};${e.hireDate.toISOString().split('T')[0]}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=employees.csv');
    res.send('\ufeff' + header + rows); // BOM for Excel
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при экспорте' });
  }
});

export default router;
