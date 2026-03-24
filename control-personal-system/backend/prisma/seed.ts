import { PrismaClient, Role, Gender, EmploymentStatus, LeaveType, LeaveStatus, AbsenceType, HistoryEventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);

  // Create departments
  const departments = await Promise.all([
    prisma.department.create({ data: { name: 'Администрация', description: 'Руководство предприятия' } }),
    prisma.department.create({ data: { name: 'Отдел разработки', description: 'Разработка программного обеспечения' } }),
    prisma.department.create({ data: { name: 'Отдел продаж', description: 'Работа с клиентами и продажи' } }),
    prisma.department.create({ data: { name: 'Отдел кадров', description: 'Управление персоналом' } }),
    prisma.department.create({ data: { name: 'Бухгалтерия', description: 'Финансовый учет' } }),
    prisma.department.create({ data: { name: 'Отдел маркетинга', description: 'Маркетинг и реклама' } }),
  ]);

  // Create positions
  const positions = await Promise.all([
    prisma.position.create({ data: { title: 'Генеральный директор', description: 'Руководитель предприятия', minSalary: 200000, maxSalary: 500000 } }),
    prisma.position.create({ data: { title: 'Руководитель отдела', description: 'Руководитель структурного подразделения', minSalary: 120000, maxSalary: 250000 } }),
    prisma.position.create({ data: { title: 'Старший разработчик', description: 'Senior Developer', minSalary: 150000, maxSalary: 300000 } }),
    prisma.position.create({ data: { title: 'Разработчик', description: 'Middle Developer', minSalary: 80000, maxSalary: 180000 } }),
    prisma.position.create({ data: { title: 'Младший разработчик', description: 'Junior Developer', minSalary: 40000, maxSalary: 90000 } }),
    prisma.position.create({ data: { title: 'Менеджер по продажам', description: 'Sales Manager', minSalary: 60000, maxSalary: 150000 } }),
    prisma.position.create({ data: { title: 'HR-менеджер', description: 'Специалист по управлению персоналом', minSalary: 70000, maxSalary: 140000 } }),
    prisma.position.create({ data: { title: 'Бухгалтер', description: 'Специалист по бухгалтерскому учету', minSalary: 60000, maxSalary: 120000 } }),
    prisma.position.create({ data: { title: 'Маркетолог', description: 'Специалист по маркетингу', minSalary: 60000, maxSalary: 130000 } }),
    prisma.position.create({ data: { title: 'Стажер', description: 'Стажер', minSalary: 20000, maxSalary: 40000 } }),
  ]);

  // Link positions to departments
  await prisma.departmentPosition.createMany({
    data: [
      { departmentId: departments[0].id, positionId: positions[0].id },
      { departmentId: departments[1].id, positionId: positions[1].id },
      { departmentId: departments[1].id, positionId: positions[2].id },
      { departmentId: departments[1].id, positionId: positions[3].id },
      { departmentId: departments[1].id, positionId: positions[4].id },
      { departmentId: departments[2].id, positionId: positions[1].id },
      { departmentId: departments[2].id, positionId: positions[5].id },
      { departmentId: departments[3].id, positionId: positions[6].id },
      { departmentId: departments[4].id, positionId: positions[7].id },
      { departmentId: departments[5].id, positionId: positions[8].id },
    ],
  });

  // Create employees and users
  // 1. Admin / Director
  const adminUser = await prisma.user.create({
    data: { username: 'admin', password: hash('admin123'), role: Role.ADMIN },
  });
  const adminEmp = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP-0001',
      firstName: 'Александр',
      lastName: 'Петров',
      middleName: 'Иванович',
      dateOfBirth: new Date('1975-03-15'),
      gender: Gender.MALE,
      phone: '+7 (495) 123-45-67',
      email: 'petrov@company.ru',
      address: 'г. Москва, ул. Центральная, д. 1',
      hireDate: new Date('2015-01-10'),
      salary: 350000,
      departmentId: departments[0].id,
      positionId: positions[0].id,
      userId: adminUser.id,
    },
  });

  // 2. HR Manager
  const hrUser = await prisma.user.create({
    data: { username: 'hr', password: hash('hr123'), role: Role.HR_MANAGER },
  });
  const hrEmp = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP-0002',
      firstName: 'Елена',
      lastName: 'Сидорова',
      middleName: 'Павловна',
      dateOfBirth: new Date('1985-07-22'),
      gender: Gender.FEMALE,
      phone: '+7 (495) 234-56-78',
      email: 'sidorova@company.ru',
      address: 'г. Москва, ул. Кадровая, д. 5',
      hireDate: new Date('2018-03-01'),
      salary: 120000,
      departmentId: departments[3].id,
      positionId: positions[6].id,
      userId: hrUser.id,
    },
  });

  // 3. Manager (head of dev department)
  const managerUser = await prisma.user.create({
    data: { username: 'manager', password: hash('manager123'), role: Role.MANAGER },
  });
  const managerEmp = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP-0003',
      firstName: 'Дмитрий',
      lastName: 'Козлов',
      middleName: 'Сергеевич',
      dateOfBirth: new Date('1982-11-05'),
      gender: Gender.MALE,
      phone: '+7 (495) 345-67-89',
      email: 'kozlov@company.ru',
      address: 'г. Москва, пр. Технологический, д. 10',
      hireDate: new Date('2017-06-15'),
      salary: 200000,
      departmentId: departments[1].id,
      positionId: positions[1].id,
      userId: managerUser.id,
    },
  });

  // Set department manager
  await prisma.department.update({
    where: { id: departments[1].id },
    data: { managerId: managerEmp.id },
  });

  // 4. Employee
  const empUser = await prisma.user.create({
    data: { username: 'employee', password: hash('employee123'), role: Role.EMPLOYEE },
  });
  const regularEmp = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP-0004',
      firstName: 'Анна',
      lastName: 'Иванова',
      middleName: 'Дмитриевна',
      dateOfBirth: new Date('1992-04-18'),
      gender: Gender.FEMALE,
      phone: '+7 (495) 456-78-90',
      email: 'ivanova@company.ru',
      address: 'г. Москва, ул. Программистов, д. 15',
      hireDate: new Date('2021-09-01'),
      salary: 150000,
      departmentId: departments[1].id,
      positionId: positions[2].id,
      managerId: managerEmp.id,
      userId: empUser.id,
    },
  });

  // More employees for realistic data
  const moreEmployees = [
    { fn: 'Михаил', ln: 'Федоров', mn: 'Алексеевич', dob: '1990-02-28', g: Gender.MALE, email: 'fedorov@company.ru', dept: 1, pos: 3, hire: '2020-03-15', salary: 120000 },
    { fn: 'Ольга', ln: 'Кузнецова', mn: 'Владимировна', dob: '1995-08-10', g: Gender.FEMALE, email: 'kuznecova@company.ru', dept: 1, pos: 4, hire: '2022-01-20', salary: 70000 },
    { fn: 'Сергей', ln: 'Новиков', mn: 'Петрович', dob: '1988-12-03', g: Gender.MALE, email: 'novikov@company.ru', dept: 2, pos: 1, hire: '2019-05-10', salary: 180000 },
    { fn: 'Наталья', ln: 'Морозова', mn: 'Игоревна', dob: '1993-06-25', g: Gender.FEMALE, email: 'morozova@company.ru', dept: 2, pos: 5, hire: '2023-02-01', salary: 90000 },
    { fn: 'Андрей', ln: 'Волков', mn: 'Николаевич', dob: '1987-09-14', g: Gender.MALE, email: 'volkov@company.ru', dept: 4, pos: 7, hire: '2020-08-01', salary: 95000 },
    { fn: 'Мария', ln: 'Лебедева', mn: 'Андреевна', dob: '1991-01-07', g: Gender.FEMALE, email: 'lebedeva@company.ru', dept: 5, pos: 8, hire: '2021-04-15', salary: 85000 },
    { fn: 'Павел', ln: 'Соколов', mn: 'Дмитриевич', dob: '1994-05-30', g: Gender.MALE, email: 'sokolov@company.ru', dept: 1, pos: 4, hire: '2023-06-01', salary: 60000 },
    { fn: 'Екатерина', ln: 'Попова', mn: 'Сергеевна', dob: '1996-10-12', g: Gender.FEMALE, email: 'popova@company.ru', dept: 2, pos: 5, hire: '2023-09-01', salary: 80000 },
    { fn: 'Виктор', ln: 'Смирнов', mn: 'Олегович', dob: '1983-04-20', g: Gender.MALE, email: 'smirnov@company.ru', dept: 0, pos: 1, hire: '2016-02-01', salary: 250000, status: EmploymentStatus.ACTIVE },
    { fn: 'Татьяна', ln: 'Белова', mn: 'Юрьевна', dob: '1989-07-08', g: Gender.FEMALE, email: 'belova@company.ru', dept: 3, pos: 6, hire: '2019-11-01', salary: 110000 },
    { fn: 'Игорь', ln: 'Орлов', mn: 'Васильевич', dob: '1991-03-17', g: Gender.MALE, email: 'orlov@company.ru', dept: 1, pos: 9, hire: '2024-01-15', salary: 35000 },
  ];

  let empNum = 5;
  const createdEmployees = [];
  for (const e of moreEmployees) {
    const emp = await prisma.employee.create({
      data: {
        employeeNumber: `EMP-${String(empNum).padStart(4, '0')}`,
        firstName: e.fn,
        lastName: e.ln,
        middleName: e.mn,
        dateOfBirth: new Date(e.dob),
        gender: e.g,
        email: e.email,
        hireDate: new Date(e.hire),
        salary: e.salary,
        departmentId: departments[e.dept].id,
        positionId: positions[e.pos].id,
        managerId: e.dept === 1 ? managerEmp.id : undefined,
        status: e.status || EmploymentStatus.ACTIVE,
      },
    });
    createdEmployees.push(emp);
    empNum++;
  }

  // Set department managers
  await prisma.department.update({ where: { id: departments[2].id }, data: { managerId: createdEmployees[2].id } }); // Новиков -> Отдел продаж
  await prisma.department.update({ where: { id: departments[0].id }, data: { managerId: createdEmployees[8].id } }); // Смирнов -> Администрация

  // Create a terminated employee
  await prisma.employee.create({
    data: {
      employeeNumber: 'EMP-0016',
      firstName: 'Алексей',
      lastName: 'Григорьев',
      middleName: 'Романович',
      dateOfBirth: new Date('1990-06-15'),
      gender: Gender.MALE,
      email: 'grigoriev@company.ru',
      hireDate: new Date('2020-01-15'),
      terminationDate: new Date('2024-06-30'),
      salary: 100000,
      departmentId: departments[1].id,
      positionId: positions[3].id,
      status: EmploymentStatus.TERMINATED,
    },
  });

  // Create leave balances
  const allEmployees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });
  for (const emp of allEmployees) {
    await prisma.leaveBalance.create({
      data: {
        employeeId: emp.id,
        year: new Date().getFullYear(),
        annualTotal: 28,
        annualUsed: Math.floor(Math.random() * 10),
        sickTotal: 10,
        sickUsed: Math.floor(Math.random() * 3),
      },
    });
  }

  // Create leave requests
  await prisma.leaveRequest.createMany({
    data: [
      {
        employeeId: regularEmp.id,
        type: LeaveType.ANNUAL,
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-14'),
        status: LeaveStatus.APPROVED,
        reason: 'Семейный отпуск',
      },
      {
        employeeId: regularEmp.id,
        type: LeaveType.ANNUAL,
        startDate: new Date('2026-04-10'),
        endDate: new Date('2026-04-20'),
        status: LeaveStatus.PENDING,
        reason: 'Плановый отпуск',
      },
      {
        employeeId: createdEmployees[0].id,
        type: LeaveType.SICK,
        startDate: new Date('2025-11-05'),
        endDate: new Date('2025-11-08'),
        status: LeaveStatus.APPROVED,
        reason: 'Болезнь',
      },
      {
        employeeId: createdEmployees[3].id,
        type: LeaveType.ANNUAL,
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-15'),
        status: LeaveStatus.APPROVED_BY_MANAGER,
        reason: 'Поездка',
      },
      {
        employeeId: createdEmployees[5].id,
        type: LeaveType.ANNUAL,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-10'),
        status: LeaveStatus.DRAFT,
        reason: 'Черновик',
      },
    ],
  });

  // Create absences
  await prisma.absence.createMany({
    data: [
      { employeeId: regularEmp.id, type: AbsenceType.SICK_LEAVE, startDate: new Date('2025-10-01'), endDate: new Date('2025-10-03'), reason: 'ОРВИ' },
      { employeeId: createdEmployees[2].id, type: AbsenceType.BUSINESS_TRIP, startDate: new Date('2025-09-15'), endDate: new Date('2025-09-18'), reason: 'Конференция в СПб' },
      { employeeId: createdEmployees[1].id, type: AbsenceType.DAY_OFF, startDate: new Date('2025-12-31'), endDate: new Date('2025-12-31'), reason: 'Личные дела' },
    ],
  });

  // Create employment history
  const historyEntries = [
    { empId: regularEmp.id, type: HistoryEventType.HIRED, desc: 'Принята на должность Старший разработчик в Отдел разработки', date: '2021-09-01' },
    { empId: regularEmp.id, type: HistoryEventType.SALARY_CHANGE, desc: 'Изменен оклад с 100000 на 130000', date: '2022-09-01', old: '100000', nw: '130000' },
    { empId: regularEmp.id, type: HistoryEventType.SALARY_CHANGE, desc: 'Изменен оклад с 130000 на 150000', date: '2023-09-01', old: '130000', nw: '150000' },
    { empId: managerEmp.id, type: HistoryEventType.HIRED, desc: 'Принят на должность Разработчик в Отдел разработки', date: '2017-06-15' },
    { empId: managerEmp.id, type: HistoryEventType.POSITION_CHANGE, desc: 'Назначен на должность Руководитель отдела', date: '2019-01-01', old: 'Разработчик', nw: 'Руководитель отдела' },
    { empId: managerEmp.id, type: HistoryEventType.SALARY_CHANGE, desc: 'Изменен оклад с 150000 на 200000', date: '2019-01-01', old: '150000', nw: '200000' },
  ];

  for (const h of historyEntries) {
    await prisma.employmentHistory.create({
      data: {
        employeeId: h.empId,
        eventType: h.type,
        description: h.desc,
        eventDate: new Date(h.date),
        oldValue: h.old || null,
        newValue: h.nw || null,
      },
    });
  }

  // Create notifications
  await prisma.notification.createMany({
    data: [
      { userId: hrUser.id, title: 'Новая заявка на отпуск', message: 'Иванова А.Д. подала заявку на отпуск с 10.04.2026 по 20.04.2026', link: '/leaves' },
      { userId: managerUser.id, title: 'Согласование отпуска', message: 'Требуется согласование отпуска Иванова А.Д.', link: '/leaves' },
      { userId: empUser.id, title: 'Добро пожаловать!', message: 'Добро пожаловать в систему управления персоналом', isRead: true },
    ],
  });

  console.log('Seed completed successfully!');
  console.log('\nTest accounts:');
  console.log('  admin / admin123 (Администратор)');
  console.log('  hr / hr123 (HR-менеджер)');
  console.log('  manager / manager123 (Руководитель)');
  console.log('  employee / employee123 (Сотрудник)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
