import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatus } from "../types";
import TaskCard from "./TaskCard";

export default function Column({
  status,
  label,
  accent,
  tasks,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
}: {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: Task[];
  canEdit: boolean;
  onAdd: (status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });

  return (
    <div ref={setNodeRef} className={`column ${isOver ? "drag-over" : ""}`}>
      <div className="column-head">
        <div className="column-title">
          <span className="column-dot" style={{ background: accent }} />
          {label}
        </div>
        <span className="column-count">{tasks.length}</span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canEdit={canEdit}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </SortableContext>

      {canEdit && (
        <button className="add-task-btn" onClick={() => onAdd(status)}>
          + Add task
        </button>
      )}
    </div>
  );
}
