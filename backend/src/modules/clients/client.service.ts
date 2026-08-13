import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';

export interface CreateClientDTO {
  name: string;
  address?: string;
  referencePerson?: string;
  phone?: string;
  email?: string;
  projectId?: string;
}

export interface UpdateClientDTO {
  name?: string;
  address?: string;
  referencePerson?: string;
  phone?: string;
  email?: string;
  projectId?: string;
}

export class ClientService {
  static async getAllClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            projectType: true,
          },
        },
      },
    });
  }

  static async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            projectType: true,
          },
        },
      },
    });
    if (!client) throw new AppError('Client not found', 404);
    return client;
  }

  static async createClient(data: CreateClientDTO) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Client name is required', 400);
    }

    const client = await prisma.client.create({
      data: {
        name: data.name.trim(),
        address: data.address?.trim() || null,
        referencePerson: data.referencePerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
      },
    });

    if (data.projectId) {
      await prisma.project.update({
        where: { id: data.projectId },
        data: {
          clientId: client.id,
          ...(data.referencePerson ? { referencePerson: data.referencePerson.trim() } : {}),
        },
      });
    }

    return this.getClientById(client.id);
  }

  static async updateClient(id: string, data: UpdateClientDTO) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError('Client not found', 404);

    await prisma.client.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.referencePerson !== undefined && { referencePerson: data.referencePerson?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
      },
    });

    if (data.projectId) {
      await prisma.project.update({
        where: { id: data.projectId },
        data: {
          clientId: id,
          ...(data.referencePerson ? { referencePerson: data.referencePerson.trim() } : {}),
        },
      });
    }

    return this.getClientById(id);
  }

  static async deleteClient(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError('Client not found', 404);

    // Unlink projects using this client
    await prisma.project.updateMany({
      where: { clientId: id },
      data: { clientId: null },
    });

    await prisma.client.delete({ where: { id } });
    return { success: true, message: 'Client deleted successfully' };
  }
}
