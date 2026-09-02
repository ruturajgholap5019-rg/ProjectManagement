// @ts-nocheck
import ExcelJS from 'exceljs';
import { Project, Task, WorkActivity, User, ProjectMember, Milestone } from '../../models/index.js';

const COLORS = {
  header: '4472C4',
  headerFont: 'FFFFFF',
  subHeader: 'D9E1F2',
  accent: '2E75B6',
  sectionTitle: '1F3864',
  altRow: 'EBF3FB',
  good: '70AD47',
  completed: 'E2EFDA',
  atRisk: 'FFE7E7',
  border: 'BFBFBF',
  neutral: '595959',
};

function headerCell(ws, ref, value, bgColor = COLORS.header, fontColor = COLORS.headerFont) {
  const cell = ws.getCell(ref);
  cell.value = value;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
  cell.font = { bold: true, color: { argb: 'FF' + fontColor }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
}

function dataCell(ws, ref, value, bgColor, bold = false, align = 'left', wrapText = false) {
  const cell = ws.getCell(ref);
  cell.value = value;
  if (bgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
  cell.font = { bold, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  };
  return cell;
}

function statusBg(status) {
  if (status === 'COMPLETED') return COLORS.completed;
  if (status === 'AT_RISK') return COLORS.atRisk;
  if (status === 'DELAYED') return 'FFF4CE';
  if (status === 'ON_HOLD') return 'F2F2F2';
  return undefined;
}

function formatType(t) {
  const map = { WEBSITE_WEBAPP: 'Website / Web App', MOBILE_APP: 'Mobile App', BMS: 'BMS / Enterprise', UNIVERSITY_NEP: 'University / NEP', DESIGN_SOCIAL_MEDIA: 'Design & Social Media', PODCAST_MEDIA: 'Podcast & Media', RESEARCH: 'Digital Research', OTHER: 'Other' };
  return map[t] || (t ? t.replace(/_/g, ' ') : '—');
}

function fmtStatus(s) { return s ? s.replace(/_/g, ' ') : '—'; }
function col(i) { return String.fromCharCode(65 + i); }

async function buildDashboard(wb, projects, tasks) {
  const ws = wb.addWorksheet('Dashboard', { properties: { tabColor: { argb: 'FF2E75B6' } } });
  ws.views = [{ showGridLines: false }];

  ws.mergeCells('A1:F1');
  const t = ws.getCell('A1');
  t.value = 'VSS TRACKER — PROJECT DASHBOARD';
  t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  t.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 38;

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = 'Report Generated: ' + new Date().toLocaleString('en-IN');
  ws.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF595959' } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells('A4:B4');
  const sec = ws.getCell('A4');
  sec.value = 'By Status';
  sec.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  sec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
  sec.alignment = { horizontal: 'center' };

  headerCell(ws, 'A5', 'Status');
  headerCell(ws, 'B5', 'Count');

  const statusLabels = [['PLANNING','Not Started'],['ONGOING','In Progress'],['ON_HOLD','On Hold'],['DELAYED','Delayed'],['AT_RISK','At Risk'],['COMPLETED','Completed'],['CANCELLED','Cancelled']];
  let r = 6;
  statusLabels.forEach(([k, l]) => {
    dataCell(ws, 'A' + r, l, undefined, false, 'left');
    dataCell(ws, 'B' + r, projects.filter(p => p.status === k).length, undefined, true, 'center');
    ws.getRow(r).height = 22;
    r++;
  });
  dataCell(ws, 'A' + r, 'Total', COLORS.subHeader, true, 'left');
  dataCell(ws, 'B' + r, projects.length, COLORS.subHeader, true, 'center');
  ws.getRow(r).height = 24;

  ws.mergeCells('D4:F4');
  const sec2 = ws.getCell('D4');
  sec2.value = 'Key Metrics';
  sec2.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  sec2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
  sec2.alignment = { horizontal: 'center' };

  const completedP = projects.filter(p => p.status === 'COMPLETED').length;
  const overdue = projects.filter(p => p.targetEndDate && new Date(p.targetEndDate) < new Date() && !['COMPLETED','CANCELLED'].includes(p.status)).length;
  const completedT = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalT = tasks.length;
  const avgPct = projects.length > 0 ? Math.round(projects.reduce((acc, p) => { const pt = tasks.filter(t => t.projectId === p.id); const pc = pt.filter(t => t.status === 'COMPLETED').length; return acc + (pt.length > 0 ? pc / pt.length : 0); }, 0) / projects.length * 100) : 0;

  [['Total Projects', projects.length],['Completed Projects', completedP],['Overdue Projects', overdue],['Total Tasks', totalT],['Completed Tasks', completedT],['Avg. % Complete', avgPct + '%']].forEach(([l, v], i) => {
    const rowNum = 5 + i;
    dataCell(ws, 'D' + rowNum, l, COLORS.subHeader, true, 'left');
    ws.mergeCells('E' + rowNum + ':F' + rowNum);
    dataCell(ws, 'E' + rowNum, v, undefined, true, 'center');
    ws.getRow(rowNum).height = 22;
  });

  const startRow = r + 2;
  ws.mergeCells('A' + startRow + ':F' + startRow);
  const sec3 = ws.getCell('A' + startRow);
  sec3.value = 'By Team Member';
  sec3.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  sec3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
  sec3.alignment = { horizontal: 'center' };
  ws.getRow(startRow).height = 26;

  const hRow = startRow + 1;
  ['Team Member','Email','Active Projects','Completed Projects','Total Tasks','Overdue Tasks'].forEach((h, i) => headerCell(ws, col(i) + hRow, h));
  ws.getRow(hRow).height = 24;

  const mmap = new Map();
  projects.forEach(p => { (p.members || []).forEach(m => { const u = m.user || m; const uid = u.id || m.userId; if (!mmap.has(uid)) mmap.set(uid, { name: ((u.firstName||'') + ' ' + (u.lastName||'')).trim() || u.email, email: u.email || '', pids: new Set() }); mmap.get(uid).pids.add(p.id); }); });

  let mr = hRow + 1;
  for (const [uid, mem] of mmap) {
    const mp = projects.filter(p => mem.pids.has(p.id));
    const ap = mp.filter(p => !['COMPLETED','CANCELLED'].includes(p.status)).length;
    const cp = mp.filter(p => p.status === 'COMPLETED').length;
    const mt = tasks.filter(t => t.assigneeId === uid);
    const ot = mt.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
    const bg = mr % 2 === 0 ? COLORS.altRow : undefined;
    dataCell(ws, 'A' + mr, mem.name, bg, true, 'left');
    dataCell(ws, 'B' + mr, mem.email, bg, false, 'left');
    dataCell(ws, 'C' + mr, ap, bg, false, 'center');
    dataCell(ws, 'D' + mr, cp, bg, false, 'center');
    dataCell(ws, 'E' + mr, mt.length, bg, false, 'center');
    dataCell(ws, 'F' + mr, ot, ot > 0 ? COLORS.atRisk : bg, ot > 0, 'center');
    ws.getRow(mr).height = 22;
    mr++;
  }

  ws.columns = [{ width: 30 },{ width: 34 },{ width: 18 },{ width: 22 },{ width: 20 },{ width: 18 }];
}

async function buildProjects(wb, projects, tasks) {
  const ws = wb.addWorksheet('Projects', { properties: { tabColor: { argb: 'FF70AD47' } } });
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 2 }];

  ws.mergeCells('A1:N1');
  const t = ws.getCell('A1');
  t.value = 'PROJECT REGISTER — ALL PROJECTS';
  t.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ['Sr. No.','Project Name','Category','Status','Priority','Project Lead','Team Members','Start Date','Target End Date','Total Tasks','Completed Tasks','% Complete','Scope / Deliverables','Notes'].forEach((h, i) => headerCell(ws, col(i) + '2', h));
  ws.getRow(2).height = 26;

  projects.forEach((p, idx) => {
    const row = 3 + idx;
    const pt = tasks.filter(t => t.projectId === p.id);
    const pc = pt.filter(t => t.status === 'COMPLETED').length;
    const pct = pt.length > 0 ? Math.round(pc / pt.length * 100) : 0;
    const members = (p.members || []).map(m => { const u = m.user || m; return ((u.firstName||'') + ' ' + (u.lastName||'')).trim() || u.email || ''; }).filter(Boolean).join(', ');
    const lead = p.lead ? p.lead.firstName + ' ' + p.lead.lastName : '—';
    const bg = statusBg(p.status);

    dataCell(ws, 'A' + row, idx + 1, bg, false, 'center');
    dataCell(ws, 'B' + row, p.name, bg, true, 'left');
    dataCell(ws, 'C' + row, formatType(p.projectType), bg, false, 'left');
    dataCell(ws, 'D' + row, fmtStatus(p.status), bg, true, 'center');
    dataCell(ws, 'E' + row, p.priority || 'MEDIUM', bg, false, 'center');
    dataCell(ws, 'F' + row, lead, bg, false, 'left');
    dataCell(ws, 'G' + row, members || '—', bg, false, 'left');
    dataCell(ws, 'H' + row, p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—', bg, false, 'center');
    dataCell(ws, 'I' + row, p.targetEndDate ? new Date(p.targetEndDate).toLocaleDateString('en-IN') : '—', bg, false, 'center');
    dataCell(ws, 'J' + row, pt.length, bg, false, 'center');
    dataCell(ws, 'K' + row, pc, bg, false, 'center');
    dataCell(ws, 'L' + row, pct + '%', bg, true, 'center');
    dataCell(ws, 'M' + row, p.scope || p.description || '—', bg, false, 'left', true);
    dataCell(ws, 'N' + row, p.statusReason || '—', bg, false, 'left', true);
    ws.getRow(row).height = 26;
  });

  ws.columns = [
    { width: 10 },
    { width: 42 },
    { width: 28 },
    { width: 16 },
    { width: 14 },
    { width: 24 },
    { width: 36 },
    { width: 16 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 50 },
    { width: 35 },
  ];
  if (projects.length > 0) ws.autoFilter = { from: 'A2', to: 'N' + (2 + projects.length) };
}

async function buildTasks(wb, tasks, projects) {
  const ws = wb.addWorksheet('Tasks', { properties: { tabColor: { argb: 'FFFFAA00' } } });
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 2 }];

  ws.mergeCells('A1:L1');
  const t = ws.getCell('A1');
  t.value = 'TASK REGISTER — ALL TASKS';
  t.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ['Sr. No.','Project','Milestone','Task Title','Description','Assignee','Priority','Status','Start Date','Due Date','Completed At','Notes'].forEach((h, i) => headerCell(ws, col(i) + '2', h));
  ws.getRow(2).height = 26;

  const pmap = new Map(projects.map(p => [p.id, p.name]));
  tasks.forEach((task, idx) => {
    const row = 3 + idx;
    const bg = task.status === 'COMPLETED' ? COLORS.completed : task.isBlocked ? COLORS.atRisk : undefined;
    const an = task.assignee ? ((task.assignee.firstName||'') + ' ' + (task.assignee.lastName||'')).trim() : '—';
    dataCell(ws, 'A' + row, idx + 1, bg, false, 'center');
    dataCell(ws, 'B' + row, pmap.get(task.projectId) || '—', bg, false, 'left');
    dataCell(ws, 'C' + row, task.milestone?.name || '—', bg, false, 'left');
    dataCell(ws, 'D' + row, task.title, bg, true, 'left');
    dataCell(ws, 'E' + row, task.description || '—', bg, false, 'left', true);
    dataCell(ws, 'F' + row, an, bg, false, 'left');
    dataCell(ws, 'G' + row, task.priority || 'MEDIUM', bg, false, 'center');
    dataCell(ws, 'H' + row, fmtStatus(task.status || 'TODO'), bg, true, 'center');
    dataCell(ws, 'I' + row, task.startDate ? new Date(task.startDate).toLocaleDateString('en-IN') : '—', bg, false, 'center');
    dataCell(ws, 'J' + row, task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '—', bg, false, 'center');
    dataCell(ws, 'K' + row, task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-IN') : '—', bg, false, 'center');
    dataCell(ws, 'L' + row, task.completionNotes || task.blockedReason || '—', bg, false, 'left', true);
    ws.getRow(row).height = 26;
  });

  ws.columns = [
    { width: 10 },
    { width: 40 },
    { width: 26 },
    { width: 42 },
    { width: 48 },
    { width: 26 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 35 },
  ];
  if (tasks.length > 0) ws.autoFilter = { from: 'A2', to: 'L' + (2 + tasks.length) };
}

async function buildActivityLog(wb, activities) {
  const ws = wb.addWorksheet('Work Activity Log', { properties: { tabColor: { argb: 'FF70AD47' } } });
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 2 }];

  ws.mergeCells('A1:G1');
  const t = ws.getCell('A1');
  t.value = 'WORK ACTIVITY LOG — DIGITAL TEAM TRACKER';
  t.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ['Serial Number','Date & Time','Team Member (Student)','Project Name','Work Description','Hours Spent','Assigned By'].forEach((h, i) => headerCell(ws, col(i) + '2', h));
  ws.getRow(2).height = 26;

  let totalHours = 0;
  activities.forEach((a, idx) => {
    const row = 3 + idx;
    const bg = idx % 2 === 0 ? COLORS.altRow : undefined;
    const member = a.user ? ((a.user.firstName||'') + ' ' + (a.user.lastName||'')).trim() : '—';
    const assigner = a.assignedBy ? ((a.assignedBy.firstName||'') + ' ' + (a.assignedBy.lastName||'')).trim() : 'Admin';
    const dateStr = new Date(a.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    totalHours += a.hoursSpent || 0;

    dataCell(ws, 'A' + row, a.serialNo || idx + 1, bg, false, 'center');
    dataCell(ws, 'B' + row, dateStr, bg, false, 'left');
    dataCell(ws, 'C' + row, member, bg, false, 'left');
    dataCell(ws, 'D' + row, a.project?.name || '—', bg, false, 'left');
    dataCell(ws, 'E' + row, a.workDescription || '—', bg, false, 'left', true);
    dataCell(ws, 'F' + row, a.hoursSpent || 0, bg, false, 'center');
    dataCell(ws, 'G' + row, assigner, bg, false, 'left');
    ws.getRow(row).height = 26;
  });

  const tr = 3 + activities.length;
  ws.mergeCells('A' + tr + ':E' + tr);
  dataCell(ws, 'A' + tr, 'TOTAL', COLORS.subHeader, true, 'right');
  dataCell(ws, 'F' + tr, totalHours, COLORS.subHeader, true, 'center');
  dataCell(ws, 'G' + tr, activities.length + ' records', COLORS.subHeader, false, 'left');
  ws.getRow(tr).height = 26;

  ws.columns = [
    { width: 16 },
    { width: 24 },
    { width: 28 },
    { width: 40 },
    { width: 52 },
    { width: 16 },
    { width: 24 },
  ];
  if (activities.length > 0) ws.autoFilter = { from: 'A2', to: 'G' + (2 + activities.length) };
}

export class ReportService {
  static async generateProjectsExcelReport(user: { id: string; role: string }) {
    let projectFilter: any = {};
    let taskFilter: any = {};
    let activityFilter: any = {};

    if (user.role === 'TEAM_MEMBER') {
      const userMemberships = await ProjectMember.find({ userId: user.id }, 'projectId').lean();
      const memberProjectIds = userMemberships.map((m: any) => m.projectId);
      projectFilter = {
        $or: [{ leadId: user.id }, { _id: { $in: memberProjectIds } }],
      };
      const allowedProjects = await Project.find(projectFilter, '_id').lean();
      const allowedProjectIds = allowedProjects.map((p: any) => p._id);
      taskFilter = { projectId: { $in: allowedProjectIds } };
      activityFilter = { userId: user.id };
    }

    const projectDocs = await Project.find(projectFilter).sort({ createdAt: -1 }).lean();
    const projectIds = projectDocs.map((p: any) => p._id);

    const [allLeads, allMemberships, allMilestones] = await Promise.all([
      User.find({ _id: { $in: projectDocs.map((p: any) => p.leadId).filter(Boolean) } }, 'firstName lastName email _id').lean(),
      ProjectMember.find({ projectId: { $in: projectIds } }).lean(),
      Milestone.find({ projectId: { $in: projectIds } }).lean(),
    ]);

    const leadMap = new Map(allLeads.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email }]));
    const memberUserIds = allMemberships.map((m: any) => m.userId);
    const memberUsers = await User.find({ _id: { $in: memberUserIds } }, 'firstName lastName email role _id').lean();
    const memberUserMap = new Map(memberUsers.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role }]));

    const projects = projectDocs.map((p: any) => ({
      ...p,
      id: p._id,
      lead: p.leadId ? leadMap.get(p.leadId) || null : null,
      members: allMemberships
        .filter((m: any) => m.projectId === p._id)
        .map((m: any) => ({
          user: memberUserMap.get(m.userId) || null,
        })),
      milestones: allMilestones.filter((ms: any) => ms.projectId === p._id).map((ms: any) => ({ ...ms, id: ms._id })),
    }));

    const taskDocs = await Task.find(taskFilter).sort({ createdAt: -1 }).lean();
    const taskAssigneeIds = taskDocs.map((t: any) => t.assigneeId).filter(Boolean);
    const taskMilestoneIds = taskDocs.map((t: any) => t.milestoneId).filter(Boolean);

    const [taskAssignees, taskMilestones] = await Promise.all([
      User.find({ _id: { $in: taskAssigneeIds } }, 'firstName lastName email _id').lean(),
      Milestone.find({ _id: { $in: taskMilestoneIds } }, 'name _id').lean(),
    ]);

    const taskAssigneeMap = new Map(taskAssignees.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email }]));
    const taskMilestoneMap = new Map(taskMilestones.map((m: any) => [m._id, { id: m._id, name: m.name }]));

    const tasks = taskDocs.map((t: any) => ({
      ...t,
      id: t._id,
      assignee: t.assigneeId ? taskAssigneeMap.get(t.assigneeId) || null : null,
      milestone: t.milestoneId ? taskMilestoneMap.get(t.milestoneId) || null : null,
    }));

    const activityDocs = await WorkActivity.find(activityFilter).sort({ dateTime: -1, serialNo: -1 }).lean();
    const actUserIds = [
      ...new Set([
        ...activityDocs.map((a: any) => a.userId).filter(Boolean),
        ...activityDocs.map((a: any) => a.assignedById).filter(Boolean),
      ]),
    ];
    const actProjectIds = [...new Set(activityDocs.map((a: any) => a.projectId).filter(Boolean))];

    const [actUsers, actProjects] = await Promise.all([
      User.find({ _id: { $in: actUserIds } }, 'firstName lastName email _id').lean(),
      Project.find({ _id: { $in: actProjectIds } }, 'name _id').lean(),
    ]);

    const actUserMap = new Map(actUsers.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email }]));
    const actProjMap = new Map(actProjects.map((p: any) => [p._id, { id: p._id, name: p.name }]));

    const activities = activityDocs.map((a: any) => ({
      ...a,
      id: a._id,
      user: actUserMap.get(a.userId) || null,
      project: actProjMap.get(a.projectId) || null,
      assignedBy: a.assignedById ? actUserMap.get(a.assignedById) || null : null,
    }));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'VSS Digital Team Tracker';
    wb.created = new Date();
    wb.modified = new Date();

    await buildDashboard(wb, projects, tasks);
    await buildProjects(wb, projects, tasks);
    await buildTasks(wb, tasks, projects);
    await buildActivityLog(wb, activities);

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
