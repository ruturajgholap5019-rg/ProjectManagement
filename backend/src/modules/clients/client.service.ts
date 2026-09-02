import { Client, Project } from '../../models/index.js';
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
    const clients = await Client.find().sort({ createdAt: -1 }).lean();
    const clientIds = clients.map((c: any) => c._id);

    const projects = await Project.find(
      { clientId: { $in: clientIds } },
      'name status projectType clientId _id'
    ).lean();

    return clients.map((c: any) => ({
      ...c,
      id: c._id,
      projects: projects
        .filter((p: any) => p.clientId === c._id)
        .map((p: any) => ({ id: p._id, name: p.name, status: p.status, projectType: p.projectType })),
    }));
  }

  static async getClientById(id: string) {
    const client = await Client.findById(id).lean();
    if (!client) throw new AppError('Client not found', 404);

    const projects = await Project.find(
      { clientId: id },
      'name status projectType _id'
    ).lean();

    return {
      ...(client as any),
      id: (client as any)._id,
      projects: projects.map((p: any) => ({ id: p._id, name: p.name, status: p.status, projectType: p.projectType })),
    };
  }

  static async createClient(data: CreateClientDTO) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Client name is required', 400);
    }

    const client = await Client.create({
      name: data.name.trim(),
      address: data.address?.trim() || null,
      referencePerson: data.referencePerson?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
    });

    if (data.projectId) {
      await Project.findByIdAndUpdate(data.projectId, {
        clientId: client._id,
        ...(data.referencePerson ? { referencePerson: data.referencePerson.trim() } : {}),
      });
    }

    return this.getClientById(client._id);
  }

  static async updateClient(id: string, data: UpdateClientDTO) {
    const client = await Client.findById(id);
    if (!client) throw new AppError('Client not found', 404);

    if (data.name !== undefined) client.name = data.name.trim();
    if (data.address !== undefined) client.address = data.address?.trim() || null;
    if (data.referencePerson !== undefined) client.referencePerson = data.referencePerson?.trim() || null;
    if (data.phone !== undefined) client.phone = data.phone?.trim() || null;
    if (data.email !== undefined) client.email = data.email?.trim() || null;

    await client.save();

    if (data.projectId) {
      await Project.findByIdAndUpdate(data.projectId, {
        clientId: id,
        ...(data.referencePerson ? { referencePerson: data.referencePerson.trim() } : {}),
      });
    }

    return this.getClientById(id);
  }

  static async deleteClient(id: string) {
    const client = await Client.findById(id);
    if (!client) throw new AppError('Client not found', 404);

    await Project.updateMany({ clientId: id }, { clientId: null });
    await Client.findByIdAndDelete(id);

    return { success: true, message: 'Client deleted successfully' };
  }
}
