import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service.js';

export class ReportController {
  static async exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = await ReportService.generateProjectsExcelReport(req.user!);
      const filename = 'VSS_Tracker_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
