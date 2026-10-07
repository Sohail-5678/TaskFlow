import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDue(due: string): { label: string; overdue: boolean } {
  const d = new Date(due);
  const now = new Date();
  const overdue = d.getTime() < now.getTime();
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { label, overdue };
}

export default function TaskCard({
  task,
  canEdit,
  onEdit,
  onDelete,
}: {
  task: Task;
  canEdit: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const due = task.due_date ? formatDue(task.due_date) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div className="task-title">{task.title}</div>
        {canEdit && (
          <div className="task-actions">
            <button
              className="icon-btn"
              title="Edit"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
            >
              ✎
            </button>
            <button
              className="icon-btn"
              title="Delete"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {task.description && <div className="task-desc">{task.description}</div>}

      <div className="task-foot">
        {due ? (
          <span className={`task-due ${due.overdue ? "overdue" : ""}`}>📅 {due.label}</span>
        ) : (
          <span />
        )}
        {task.assignee && (
          <span className="mini-avatar" title={task.assignee.full_name}>
            {initials(task.assignee.full_name)}
          </span>
        )}
      </div>
    </div>
  );
}
