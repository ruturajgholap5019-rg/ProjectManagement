export interface PdfReportOptions {
  project: any;
  members: any[];
  milestones: any[];
  tasks: any[];
  comments: any[];
  attachments: any[];
  activities?: any[];
  timeRange: string;
  startDate?: string;
  endDate?: string;
  statusFilter?: string;
  includeSections: {
    summary: boolean;
    members: boolean;
    tasks: boolean;
    comments: boolean;
    attachments: boolean;
    activities?: boolean;
  };
}

export const generateProjectPdfReport = (options: PdfReportOptions) => {
  const {
    project,
    members,
    tasks,
    comments,
    attachments,
    activities = [],
    timeRange,
    startDate,
    endDate,
    statusFilter,
    includeSections,
  } = options;

  let filteredTasks = [...tasks];
  let filteredComments = [...comments];
  let filteredAttachments = [...attachments];
  let filteredActivities = [...activities];

  const now = new Date();
  let cutOffDate: Date | null = null;
  let rangeLabel = 'Full Project History';

  if (timeRange === 'LAST_WEEK') {
    cutOffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    rangeLabel = 'Past 7 Days (Last Week)';
  } else if (timeRange === 'LAST_MONTH') {
    cutOffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    rangeLabel = 'Past 1 Month';
  } else if (timeRange === 'LAST_2_MONTHS') {
    cutOffDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    rangeLabel = 'Past 2 Months';
  } else if (timeRange === 'LAST_3_MONTHS') {
    cutOffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    rangeLabel = 'Past 3 Months';
  } else if (timeRange === 'LAST_6_MONTHS') {
    cutOffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    rangeLabel = 'Past 6 Months';
  } else if (timeRange === 'LAST_YEAR') {
    cutOffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    rangeLabel = 'Past 1 Year';
  } else if (timeRange === 'CUSTOM' && startDate && endDate) {
    rangeLabel = `Custom Range (${startDate} to ${endDate})`;
  }

  if (cutOffDate) {
    filteredTasks = filteredTasks.filter((t) => new Date(t.createdAt || t.dueDate || Date.now()) >= cutOffDate!);
    filteredComments = filteredComments.filter((c) => new Date(c.createdAt) >= cutOffDate!);
    filteredAttachments = filteredAttachments.filter((a) => new Date(a.createdAt) >= cutOffDate!);
    filteredActivities = filteredActivities.filter((act) => new Date(act.dateTime || act.createdAt) >= cutOffDate!);
  } else if (timeRange === 'CUSTOM' && startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    filteredTasks = filteredTasks.filter((t) => {
      const d = new Date(t.createdAt || Date.now());
      return d >= s && d <= e;
    });
    filteredComments = filteredComments.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= s && d <= e;
    });
    filteredAttachments = filteredAttachments.filter((a) => {
      const d = new Date(a.createdAt);
      return d >= s && d <= e;
    });
    filteredActivities = filteredActivities.filter((act) => {
      const d = new Date(act.dateTime || act.createdAt);
      return d >= s && d <= e;
    });
  }

  if (statusFilter === 'COMPLETED_ONLY') {
    filteredTasks = filteredTasks.filter((t) => t.status === 'COMPLETED');
  } else if (statusFilter === 'ACTIVE_ONLY') {
    filteredTasks = filteredTasks.filter((t) => t.status !== 'COMPLETED');
  }

  const completedCount = filteredTasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = filteredTasks.filter((t) => ['IN_PROGRESS', 'REVIEW', 'REVISION'].includes(t.status)).length;
  const todoCount = filteredTasks.filter((t) => t.status === 'TODO').length;
  const totalCount = filteredTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalHoursLogged = filteredActivities.reduce((sum, act) => sum + (Number(act.hoursSpent) || 0), 0);

  const leadName = project.lead
    ? `${project.lead.firstName} ${project.lead.lastName} (${project.lead.email})`
    : 'Unassigned';

  const supervisorName = project.creator
    ? `${project.creator.firstName} ${project.creator.lastName} (${project.creator.role})`
    : 'System Admin';

  const clientName = project.client?.name || 'Internal Project (No External Client)';
  const clientContact = [project.client?.phone && `📞 ${project.client.phone}`, project.client?.email && `✉️ ${project.client.email}`].filter(Boolean).join(' | ');
  const referencePerson = project.referencePerson || project.client?.referencePerson || 'Not Specified';

  // Group tasks by Module / Milestone Group
  const tasksByModule = new Map<string, any[]>();
  filteredTasks.forEach((t) => {
    const moduleName = t.milestone?.name || 'General / Core Deliverables';
    if (!tasksByModule.has(moduleName)) {
      tasksByModule.set(moduleName, []);
    }
    tasksByModule.get(moduleName)!.push(t);
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Project Executive Report - ${project.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            margin: 0;
            padding: 20px;
            font-size: 11px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .brand-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          .brand-name {
            font-size: 1.4rem;
            font-weight: 800;
            color: #4f46e5;
            letter-spacing: -0.02em;
          }
          .report-type {
            font-size: 0.85rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .header-banner {
            background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4338ca 100%);
            color: #ffffff;
            padding: 20px 24px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(67, 56, 202, 0.15);
          }
          .header-banner h1 {
            margin: 0 0 6px 0;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.02em;
          }
          .header-banner p {
            margin: 0;
            opacity: 0.9;
            font-size: 11px;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .badge-primary { background-color: #e0e7ff; color: #3730a3; }
          .badge-success { background-color: #d1fae5; color: #065f46; }
          .badge-warning { background-color: #fef3c7; color: #92400e; }
          .badge-danger { background-color: #fee2e2; color: #991b1b; }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .stat-card {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 14px;
            text-align: center;
          }
          .stat-value {
            font-size: 1.5rem;
            font-weight: 800;
            color: #4338ca;
          }
          .stat-label {
            font-size: 0.72rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 3px;
          }

          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .meta-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 14px 16px;
          }
          .meta-box-title {
            font-size: 12px;
            font-weight: 800;
            color: #3730a3;
            margin-bottom: 8px;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 4px;
          }
          .meta-row {
            margin-bottom: 4px;
          }
          .meta-row strong { color: #0f172a; }

          .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #1e1b4b;
            border-bottom: 2px solid #4338ca;
            padding-bottom: 4px;
            margin-top: 22px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            page-break-after: avoid;
          }

          .scope-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
            padding: 12px 16px;
            margin-bottom: 18px;
            font-size: 11px;
            line-height: 1.6;
            color: #1e3a8a;
          }

          .module-group-title {
            font-size: 12px;
            font-weight: 700;
            color: #3730a3;
            background-color: #e0e7ff;
            padding: 6px 12px;
            border-radius: 4px;
            margin-top: 14px;
            margin-bottom: 8px;
            border-left: 4px solid #4338ca;
            page-break-after: avoid;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 10.5px;
            page-break-inside: auto;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            font-weight: 700;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #cbd5e1;
            color: #334155;
            vertical-align: top;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          thead {
            display: table-header-group;
          }

          .progress-bar-bg {
            background-color: #e2e8f0;
            border-radius: 10px;
            height: 10px;
            width: 100%;
            overflow: hidden;
            margin: 8px 0;
          }
          .progress-bar-fill {
            background: linear-gradient(90deg, #10b981, #6366f1);
            height: 100%;
            border-radius: 10px;
          }

          .stat-pill {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            background-color: #f1f5f9;
            margin-right: 8px;
            font-weight: 700;
            font-size: 10px;
          }

          .footer {
            margin-top: 28px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            text-align: center;
            font-size: 10px;
            color: #64748b;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="brand-header">
          <div class="brand-name">Digital Team Management Platform</div>
          <div class="report-type">Executive Project & Deliverables Audit Report</div>
        </div>

        <div class="header-banner">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>${project.name}</h1>
              <p>Official Executive Summary • Generated ${new Date().toLocaleString()}</p>
            </div>
            <div>
              <span class="badge badge-primary">${project.projectType ? project.projectType.replace(/_/g, ' ') : 'GENERAL'}</span>
              <span class="badge badge-success">${project.status || 'ACTIVE'}</span>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${progressPercent}%</div>
            <div class="stat-label">Overall Progress</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${completedCount} / ${totalCount}</div>
            <div class="stat-label">Tasks Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHoursLogged.toFixed(1)} hrs</div>
            <div class="stat-label">Total Time Logged</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${members.length}</div>
            <div class="stat-label">Team Members</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="meta-box">
            <div class="meta-box-title">🏢 CLIENT & STAKEHOLDER INFORMATION</div>
            <div class="meta-row"><strong>Client Name:</strong> ${clientName}</div>
            ${clientContact ? `<div class="meta-row"><strong>Contact Details:</strong> ${clientContact}</div>` : ''}
            ${project.client?.address ? `<div class="meta-row"><strong>Address:</strong> 📍 ${project.client.address}</div>` : ''}
            <div class="meta-row"><strong>👨‍🏫 Referred By (Person / Teacher):</strong> ${referencePerson}</div>
          </div>

          <div class="meta-box">
            <div class="meta-box-title">📋 PROJECT SUPERVISION & TIMELINE</div>
            <div class="meta-row"><strong>👨‍🏫 Assigned By / Supervisor:</strong> ${supervisorName}</div>
            <div class="meta-row"><strong>Project Lead:</strong> ${leadName}</div>
            <div class="meta-row"><strong>Started Date:</strong> ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not Set'}</div>
            <div class="meta-row"><strong>Target Delivery Date:</strong> ${project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : 'Not Set'}</div>
            <div class="meta-row"><strong>Report Time Horizon:</strong> ${rangeLabel}</div>
          </div>
        </div>

        ${
          includeSections.summary
            ? `
          <div class="section-block">
            <div class="section-title">
              <span>Executive Scope & Completion Progress</span>
            </div>

            <div class="scope-box">
              <strong>🎯 Project Scope & Key Deliverables:</strong><br/>
              ${project.scope || project.description || 'No detailed scope provided.'}
            </div>

            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <div style="margin-top: 10px;">
              <span class="stat-pill" style="color: #059669;">🟢 Completed: ${completedCount}</span>
              <span class="stat-pill" style="color: #4f46e5;">⚡ In Progress / Review: ${inProgressCount}</span>
              <span class="stat-pill" style="color: #475569;">⏳ Pending TODO: ${todoCount}</span>
            </div>
          </div>
        `
            : ''
        }

        ${
          includeSections.members && members.length > 0
            ? `
          <div class="section-block">
            <div class="section-title">
              <span>Assigned Team Roster (${members.length} Members)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">#</th>
                  <th style="width: 30%;">Full Member Name</th>
                  <th style="width: 35%;">Email Address</th>
                  <th style="width: 35%;">Project Role & Skills Matrix</th>
                </tr>
              </thead>
              <tbody>
                ${members
                  .map((m, idx) => {
                    const u = m.user || m;
                    const skillsStr = u.skills && u.skills.length > 0
                      ? u.skills.map((s: any) => s.skillName).join(', ')
                      : 'General Engineering';
                    return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td><strong>${u.firstName || ''} ${u.lastName || ''}</strong></td>
                      <td>${u.email}</td>
                      <td>
                        <strong>${u.role === 'ADMIN' ? 'Organization Admin' : 'Team Contributor'}</strong> (${u.memberType || 'STUDENT'})
                        <br/><span style="color: #64748b; font-size: 9.5px;">Skills: ${skillsStr}</span>
                      </td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        ${
          includeSections.tasks && filteredTasks.length > 0
            ? `
          <div class="section-block">
            <div class="section-title">
              <span>Module & Milestone Deliverables Breakdown (${filteredTasks.length} Tasks across ${tasksByModule.size} Modules)</span>
            </div>

            ${Array.from(tasksByModule.entries())
              .map(([moduleName, moduleTasks]) => {
                const moduleCompleted = moduleTasks.filter((t) => t.status === 'COMPLETED').length;
                const modulePct = moduleTasks.length > 0 ? Math.round((moduleCompleted / moduleTasks.length) * 100) : 0;

                return `
                <div class="module-group-title">
                  📦 Module Group: ${moduleName} • Progress: ${moduleCompleted}/${moduleTasks.length} Tasks (${modulePct}%)
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 32%;">Task Deliverable Title</th>
                      <th style="width: 10%;">Priority</th>
                      <th style="width: 12%;">Status</th>
                      <th style="width: 26%;">Assigned Student</th>
                      <th style="width: 20%;">Target / Completion Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${moduleTasks
                      .map((t) => {
                        const assigneeName = t.assignee
                          ? `${t.assignee.firstName || ''} ${t.assignee.lastName || ''}`.trim()
                          : 'Unassigned';

                        let dateStr = 'No deadline';
                        if (t.status === 'COMPLETED' && t.completedAt) {
                          dateStr = `<strong>Completed:</strong> ${new Date(t.completedAt).toLocaleDateString()}`;
                        } else if (t.dueDate) {
                          dateStr = `<strong>Target Due:</strong> ${new Date(t.dueDate).toLocaleDateString()}`;
                        }

                        return `
                        <tr>
                          <td>
                            <strong>${t.title}</strong>
                            ${t.description ? `<br/><span style="color: #64748b; font-size: 9.5px;">${t.description}</span>` : ''}
                          </td>
                          <td><span class="badge ${t.priority === 'CRITICAL' ? 'badge-danger' : t.priority === 'HIGH' ? 'badge-warning' : 'badge-primary'}">${t.priority}</span></td>
                          <td><span class="badge ${t.status === 'COMPLETED' ? 'badge-success' : 'badge-primary'}">${t.status}</span></td>
                          <td>
                            <strong>${assigneeName}</strong>
                          </td>
                          <td>${dateStr}</td>
                        </tr>
                      `;
                      })
                      .join('')}
                  </tbody>
                </table>
              `;
              })
              .join('')}
          </div>
        `
            : ''
        }

        ${
          filteredActivities.length > 0
            ? `
          <div class="section-block">
            <div class="section-title">
              <span>Work Activity Logs (${filteredActivities.length} Sessions Logged • ${totalHoursLogged.toFixed(1)} Total Hours)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">Log Date</th>
                  <th style="width: 25%;">Contributor</th>
                  <th style="width: 48%;">Work Activity Description</th>
                  <th style="width: 12%;">Hours Spent</th>
                </tr>
              </thead>
              <tbody>
                ${filteredActivities
                  .map((act) => {
                    const contributor = act.user ? `${act.user.firstName} ${act.user.lastName}` : 'Contributor';
                    return `
                    <tr>
                      <td>${new Date(act.dateTime || act.createdAt || Date.now()).toLocaleDateString()}</td>
                      <td><strong>${contributor}</strong></td>
                      <td>${act.workDescription || '-'}</td>
                      <td><strong>${Number(act.hoursSpent).toFixed(1)} hrs</strong></td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        ${
          includeSections.comments && filteredComments.length > 0
            ? `
          <div class="section-block">
            <div class="section-title">
              <span>Discussion & Team Activity (${filteredComments.length})</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 25%;">Author</th>
                  <th style="width: 55%;">Comment Content</th>
                  <th style="width: 20%;">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                ${filteredComments
                  .map((c) => {
                    const author = c.user ? `${c.user.firstName} ${c.user.lastName}` : 'System';
                    return `
                    <tr>
                      <td><strong>${author}</strong></td>
                      <td>${c.commentText || c.content}</td>
                      <td>${new Date(c.createdAt).toLocaleString()}</td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        ${
          includeSections.attachments && filteredAttachments.length > 0
            ? `
          <div class="section-block">
            <div class="section-title">
              <span>Uploaded Deliverable Files (${filteredAttachments.length})</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>File Size</th>
                  <th>Uploaded By</th>
                  <th>Upload Date</th>
                </tr>
              </thead>
              <tbody>
                ${filteredAttachments
                  .map((a) => {
                    const uploader = a.user ? `${a.user.firstName} ${a.user.lastName}` : 'System';
                    const sizeKb = (a.fileSize / 1024).toFixed(1);
                    return `
                    <tr>
                      <td><strong>${a.filename}</strong></td>
                      <td>${sizeKb} KB</td>
                      <td>${uploader}</td>
                      <td>${new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        <div class="footer">
          <p>Digital Team Management Platform • Official Executive Project Audit Report • Confidential</p>
        </div>
      </body>
    </html>
  `;

  // Open printable PDF preview window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }
};

export const generateUserPdfReport = (options: {
  user: any;
  tasks?: any[];
  projects?: any[];
  activities?: any[];
  skills?: any[];
}) => {
  const { user, tasks = [], projects = [], activities = [], skills = [] } = options;

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Team Member';
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalHours = activities.reduce((sum: number, a: any) => sum + (Number(a.hoursSpent) || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>User Performance Report - ${fullName}</title>
        <style>
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 36px;
            background-color: #ffffff;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .brand {
            font-size: 1.5rem;
            font-weight: 800;
            color: #4f46e5;
            letter-spacing: -0.02em;
          }
          .report-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #64748b;
          }
          .user-profile-banner {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .user-name {
            font-size: 1.6rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 6px 0;
          }
          .user-meta {
            font-size: 0.88rem;
            color: #475569;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin-bottom: 28px;
          }
          .stat-card {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
          }
          .stat-value {
            font-size: 1.6rem;
            font-weight: 800;
            color: #4f46e5;
          }
          .stat-label {
            font-size: 0.76rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .section-title {
            font-size: 1.15rem;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 28px;
            margin-bottom: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.86rem;
            margin-bottom: 20px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            color: #334155;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
          }
          .badge-completed { background-color: #dcfce7; color: #166534; }
          .badge-progress { background-color: #e0e7ff; color: #3730a3; }
          .badge-todo { background-color: #f1f5f9; color: #475569; }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            text-align: center;
            font-size: 0.78rem;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">Digital Team Management Platform</div>
          <div class="report-title">Individual Member Performance & Telemetry Report</div>
        </div>

        <div class="user-profile-banner">
          <div>
            <h1 class="user-name">${fullName}</h1>
            <div class="user-meta">
              <strong>Email:</strong> ${user.email || 'N/A'} | 
              <strong>Role:</strong> ${user.role || 'TEAM_MEMBER'} | 
              <strong>Member Type:</strong> ${user.memberType || 'STUDENT'}
              ${user.phone ? ` | <strong>Phone:</strong> ${user.phone}` : ''}
            </div>
          </div>
          <div style="text-align: right; font-size: 0.82rem; color: #64748b;">
            Generated on: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${totalHours.toFixed(1)}</div>
            <div class="stat-label">Hours Logged</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${projects.length}</div>
            <div class="stat-label">Assigned Projects</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${completedTasks} / ${totalTasks}</div>
            <div class="stat-label">Tasks Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${completionRate}%</div>
            <div class="stat-label">Completion Rate</div>
          </div>
        </div>

        <div class="section-title">Assigned Projects (${projects.length})</div>
        ${
          projects.length === 0
            ? '<p style="color: #64748b; font-style: italic;">No projects currently assigned to this member.</p>'
            : `
          <table>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Category / Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${projects
                .map((p) => {
                  const proj = p.project || p;
                  return `
                  <tr>
                    <td><strong>${proj.name}</strong></td>
                    <td>${proj.projectType ? proj.projectType.replace(/_/g, ' ') : 'General'}</td>
                    <td><span class="badge badge-progress">${proj.status || 'ACTIVE'}</span></td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        `
        }

        <div class="section-title">Assigned Tasks & Deliverables (${tasks.length})</div>
        ${
          tasks.length === 0
            ? '<p style="color: #64748b; font-style: italic;">No tasks currently assigned to this member.</p>'
            : `
          <table>
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Completion Summary</th>
              </tr>
            </thead>
            <tbody>
              ${tasks
                .map((t) => {
                  const statusClass = t.status === 'COMPLETED' ? 'badge-completed' : t.status === 'IN_PROGRESS' ? 'badge-progress' : 'badge-todo';
                  return `
                  <tr>
                    <td><strong>${t.title}</strong></td>
                    <td>${t.project ? t.project.name : 'N/A'}</td>
                    <td>${t.priority}</td>
                    <td><span class="badge ${statusClass}">${t.status.replace(/_/g, ' ')}</span></td>
                    <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</td>
                    <td>${t.completionNotes || '-'}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        `
        }

        <div class="section-title">Skills & Capabilities Matrix (${skills.length})</div>
        ${
          skills.length === 0
            ? '<p style="color: #64748b; font-style: italic;">No skill tags recorded.</p>'
            : `
          <div style="margin-bottom: 20px;">
            ${skills.map((s) => `<span class="badge badge-progress" style="margin-right: 6px; margin-bottom: 6px;">${s.skillName || s}</span>`).join('')}
          </div>
        `
        }

        <div class="section-title">Work Activity Log History (${activities.length})</div>
        ${
          activities.length === 0
            ? '<p style="color: #64748b; font-style: italic;">No logged work activity sessions.</p>'
            : `
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Work Summary / Description</th>
                <th>Hours Spent</th>
              </tr>
            </thead>
            <tbody>
              ${activities
                .map((a) => `
                <tr>
                  <td>${new Date(a.createdAt || Date.now()).toLocaleDateString()}</td>
                  <td>${a.project ? a.project.name : 'General'}</td>
                  <td>${a.workDescription || '-'}</td>
                  <td><strong>${Number(a.hoursSpent).toFixed(1)} hrs</strong></td>
                </tr>
              `)
                .join('')}
            </tbody>
          </table>
        `
        }

        <div class="footer">
          <p>Digital Team Management Platform • Confidential Member Performance Report</p>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }
};

