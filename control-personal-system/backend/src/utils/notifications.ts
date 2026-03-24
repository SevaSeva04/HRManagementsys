import { prisma } from '../index';

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: { userId, title, message, link },
  });
}

export async function notifyByRole(role: string, title: string, message: string, link?: string) {
  const users = await prisma.user.findMany({ where: { role: role as any, isActive: true } });
  await prisma.notification.createMany({
    data: users.map(u => ({ userId: u.id, title, message, link })),
  });
}
