import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import Modal from "../components/Modal";
import { useBoards, useCreateBoard } from "../hooks/useBoards";
import type { BoardRole } from "../types";

function RoleBadge({ role }: { role?: BoardRole }) {
  if (!role) return null;
  return <span className={`role-badge role-${role}`}>{role}</span>;
}

export default function DashboardPage() {
  const { data: boards, isLoading } = useBoards();
  const createBoard = useCreateBoard();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const board = await createBoard.mutateAsync({ name, description });
    setOpen(false);
    setName("");
    setDescription("");
    navigate(`/boards/${board.id}`);
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="page-head">
          <div>
            <div className="page-title">Your boards</div>
            <div className="page-sub">
              Create a board, invite your team, and move work in real time.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            + New board
          </button>
        </div>

        {isLoading ? (
          <div className="spinner" />
        ) : boards && boards.length > 0 ? (
          <div className="board-grid">
            {boards.map((b) => (
              <div
                key={b.id}
                className="board-tile"
                onClick={() => navigate(`/boards/${b.id}`)}
                role="button"
              >
                <h3>{b.name}</h3>
                <p>{b.description || "No description"}</p>
                <div className="tile-meta">
                  <RoleBadge role={b.role} />
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {new Date(b.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="big">🗂️</div>
            <p>No boards yet. Create your first one to get started.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setOpen(true)}
            >
              + New board
            </button>
          </div>
        )}
      </div>

      {open && (
        <Modal title="Create a board" onClose={() => setOpen(false)}>
          <form onSubmit={onCreate}>
            <div className="field">
              <label className="label">Board name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product Launch"
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label className="label">Description (optional)</label>
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this board about?"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={createBoard.isPending}>
                {createBoard.isPending ? "Creating…" : "Create board"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
