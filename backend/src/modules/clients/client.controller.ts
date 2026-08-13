import { Request, Response, NextFunction } from 'express';
import { ClientService } from './client.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class ClientController {
  static async getAllClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await ClientService.getAllClients();
      sendSuccess(res, clients, 'Clients retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getClientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.getClientById(req.params.id);
      sendSuccess(res, client, 'Client retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.createClient(req.body);
      sendSuccess(res, client, 'Client registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.updateClient(req.params.id, req.body);
      sendSuccess(res, client, 'Client updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ClientService.deleteClient(req.params.id);
      sendSuccess(res, result, 'Client deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
