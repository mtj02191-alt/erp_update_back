const formatUserName = (user: any): string | null => {
  if (!user || typeof user !== "object") return null;
  const named = String(user.name || "").trim();
  if (named) return named;
  const fromParts = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  if (fromParts) return fromParts;
  const email = String(user.email || "").trim();
  return email || null;
};

const formatAssignees = (task: any): string => {
  if (typeof task?.assigned_to_display === "string" && task.assigned_to_display.trim()) {
    return task.assigned_to_display.trim();
  }

  const fromMeta = Array.isArray(task?.assigned_users_meta)
    ? task.assigned_users_meta.map(formatUserName).filter(Boolean)
    : [];
  if (fromMeta.length > 0) return fromMeta.join(", ");

  const fromUsers = Array.isArray(task?.assigned_users)
    ? task.assigned_users.map(formatUserName).filter(Boolean)
    : [];
  if (fromUsers.length > 0) return fromUsers.join(", ");

  return "Unassigned";
};

export const generateTaskOverdueTemplate = (
  task: any,
  escalationLevel: number,
): string => {
  const assignees = formatAssignees(task);

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
