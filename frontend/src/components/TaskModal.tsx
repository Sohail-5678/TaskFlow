import { FormEvent, useState } from "react";
import Modal from "./Modal";
import type { Member, Task } from "../types";

export interface TaskDraft {
  title: string;
  description: string;
  due_date: string | null;
  assignee_id: number | null;
}

export default function TaskModal({
  mode,
  initial,
  members,
  onClose,
  onSubmit,
  busy,
}: {
  mode: "create" | "edit";
  initial?: Task;
  members: Member[];
  onClose: () => void;
  onSubmit: (draft: TaskDraft) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [due, setDue] = useState(initial?.due_date ? initial.due_date.slice(0, 10) : "");
  const [assignee, setAssignee] = useState<string>(
    initial?.assignee_id ? String(initial.assignee_id) : ""
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      due_date: due ? new Date(due).toISOString() : null,
      assignee_id: assignee ? Number(assignee) : null,
    });
  }

  return (
    <Modal title={mode === "create" ? "Add task" : "Edit task"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Draft launch blog post"
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label className="label">Description</label>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details…"
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="label">Due date</label>
            <input
              className="input"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="label">Assignee</label>
            <select
              className="select"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : mode === "create" ? "Add task" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
