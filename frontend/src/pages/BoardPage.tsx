import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { useAuth } from "../auth/AuthContext";
import Column from "../components/Column";
import TaskCard from "../components/TaskCard";
import TaskModal, { TaskDraft } from "../components/TaskModal";
import MembersModal from "../components/MembersModal";
import { useBoard } from "../hooks/useBoards";
import {
  useBoardTasks,
  useCreateTask,
  useDeleteTask,
  useMoveTask,
  useUpdateTask,
} from "../hooks/useTasks";
import { useBoardSocket } from "../hooks/useBoardSocket";
import { COLUMN_META } from "../types";
import type { BoardColumns, Task, TaskStatus } from "../types";

export default function BoardPage() {
  const { boardId: boardIdParam } = useParams();
  const boardId = Number(boardIdParam);
  const qc = useQueryClient();

  const { data: board } = useBoard(boardId);
  const { data: tasks, isLoading } = useBoardTasks(boardId);
  const createTask = useCreateTask(boardId);
  const updateTask = useUpdateTask(boardId);
  const moveTask = useMoveTask(boardId);
  const deleteTask = useDeleteTask(boardId);

  const role = board?.role ?? "viewer";
  const canEdit = role === "member" || role === "admin";
  const canManage = role === "admin";

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskModal, setTaskModal] = useState<{ mode: "create" | "edit"; status?: TaskStatus; task?: Task } | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [connected, setConnected] = useState(false);
  const { demo } = useAuth();

  // Real-time: any task.* event just refetches the board's tasks so every
  // connected member converges on the same authoritative state.
  // In demo mode this is a no-op (no backend / WebSocket).
  useBoardSocket(Number.isFinite(boardId) ? boardId : null, () => {
    qc.invalidateQueries({ queryKey: ["tasks", boardId] });
    setConnected(true);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const allTasks = useMemo(() => {
    if (!tasks) return [] as Task[];
    return [...tasks.columns.todo, ...tasks.columns.in_progress, ...tasks.columns.done];
  }, [tasks]);

  function findTask(id: number): Task | undefined {
    return allTasks.find((t) => t.id === id);
  }

  function onDragStart(e: DragStartEvent) {
    const t = findTask(Number(e.active.id));
    if (t) setActiveTask(t);
  }

  function columnOf(overId: string | number): TaskStatus | null {
    const id = String(overId);
    if (id.startsWith("column-")) return id.replace("column-", "") as TaskStatus;
    const t = findTask(Number(id));
    return t ? t.status : null;
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const task = findTask(Number(active.id));
    if (!task) return;

    const destStatus = columnOf(over.id);
    if (!destStatus) return;

    // Compute target position within the destination column.
    const destTasks = tasks ? tasks.columns[destStatus] : [];
    let position = destTasks.length;
    const overId = String(over.id);
    if (!overId.startsWith("column-")) {
      const idx = destTasks.findIndex((t) => t.id === Number(over.id));
      if (idx >= 0) position = idx;
    }

    if (task.status === destStatus && task.position === position) return;

    // Optimistic update so the move feels instant.
    if (tasks) {
      const next: BoardColumns = {
        columns: {
          todo: [...tasks.columns.todo],
          in_progress: [...tasks.columns.in_progress],
          done: [...tasks.columns.done],
        },
      };
      next.columns[task.status] = next.columns[task.status].filter((t) => t.id !== task.id);
      const moved = { ...task, status: destStatus };
      next.columns[destStatus].splice(position, 0, moved);
      qc.setQueryData(["tasks", boardId], next);
    }

    moveTask.mutate({ taskId: task.id, status: destStatus, position });
  }

  async function submitTask(draft: TaskDraft) {
    if (!taskModal) return;
    if (taskModal.mode === "create") {
      await createTask.mutateAsync({
        title: draft.title,
        description: draft.description,
        status: taskModal.status ?? "todo",
        due_date: draft.due_date,
        assignee_id: draft.assignee_id,
      });
    } else if (taskModal.task) {
      await updateTask.mutateAsync({
        taskId: taskModal.task.id,
        data: {
          title: draft.title,
          description: draft.description,
          due_date: draft.due_date,
          assignee_id: draft.assignee_id,
        },
      });
    }
    setTaskModal(null);
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Boards</Link>
          <span>/</span>
          <span>{board?.name ?? "…"}</span>
        </div>

        <div className="page-head">
          <div>
            <div className="page-title">{board?.name ?? "Loading…"}</div>
            {board?.description && <div className="page-sub">{board.description}</div>}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="live-badge">
              <span className="live-dot" />
              {demo ? "Demo mode" : connected ? "Live" : "Connecting…"}
            </span>
            <button className="btn" onClick={() => setShowMembers(true)}>
              👥 Members {board ? `(${board.members.length})` : ""}
            </button>
            <span className={`role-badge role-${role}`}>{role}</span>
          </div>
        </div>

        {isLoading || !tasks ? (
          <div className="spinner" />
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="kanban">
              {COLUMN_META.map((col) => (
                <Column
                  key={col.key}
                  status={col.key}
                  label={col.label}
                  accent={col.accent}
                  tasks={tasks.columns[col.key]}
                  canEdit={canEdit}
                  onAdd={(status) => setTaskModal({ mode: "create", status })}
                  onEdit={(task) => setTaskModal({ mode: "edit", task })}
                  onDelete={(task) => {
                    if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate(task.id);
                  }}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? (
                <TaskCard task={activeTask} canEdit={false} onEdit={() => {}} onDelete={() => {}} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {taskModal && board && (
        <TaskModal
          mode={taskModal.mode}
          initial={taskModal.task}
          members={board.members}
          busy={createTask.isPending || updateTask.isPending}
          onClose={() => setTaskModal(null)}
          onSubmit={submitTask}
        />
      )}

      {showMembers && board && (
        <MembersModal
          boardId={boardId}
          members={board.members}
          canManage={canManage}
          onClose={() => setShowMembers(false)}
        />
      )}
    </>
  );
}
