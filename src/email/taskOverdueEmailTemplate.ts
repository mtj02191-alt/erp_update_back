export const generateTaskOverdueTemplate = (
  task: any,
  escalationLevel: number,
): string => {
  const assignees =
    (Array.isArray(task.assigned_users_meta) &&
      task.assigned_users_meta
        .map((m: any) => (m && m.user_id != null ? String(m.user_id) : null))
        .filter((v: string | null) => v !== null)
        .join(", ")) ||
    (Array.isArray(task.assigned_user_ids) &&
      task.assigned_user_ids.map((id) => String(id)).join(", ")) ||
    "Unassigned";

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d9534f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .details { background-color: white; padding: 15px; border-radius: 5px; border-left: 5px solid #d9534f; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Task Overdue Alert</h1>
          </div>
          <div class="content">
            <p><strong>Escalation Level: ${escalationLevel}</strong></p>
            <p>The following task is overdue and requires immediate attention:</p>
            <div class="details">
              <p><strong>Title:</strong> ${task.title}</p>
              <p><strong>Due Date:</strong> ${task.due_date}</p>
              <p><strong>Priority:</strong> ${task.priority}</p>
              <p><strong>Assigned To:</strong> ${assignees}</p>
            </div>
            <p>Please take necessary actions.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};
