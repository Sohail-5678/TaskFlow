import { FormEvent, useState } from "react";
import Modal from "./Modal";
import { useAddMember } from "../hooks/useBoards";
import type { BoardRole, Member } from "../types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MembersModal({
  boardId,
  members,
  canManage,
  onClose,
}: {
  boardId: number;
  members: Member[];
  canManage: boolean;
  onClose: () => void;
}) {
  const addMember = useAddMember(boardId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<BoardRole>("member");
  const [error, setError] = useState("");

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await addMember.mutateAsync({ email, role });
      setEmail("");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Could not add member.");
    }
  }

  return (
    <Modal title="Board members" onClose={onClose}>
      <div style={{ marginBottom: canManage ? 20 : 0 }}>
        {members.map((m) => (
          <div className="member-row" key={m.user.id}>
            <div className="member-info">
              <span className="mini-avatar">{initials(m.user.full_name)}</span>
              <div>
                <div style={{ fontSize: 14 }}>{m.user.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{m.user.email}</div>
              </div>
            </div>
            <span className={`role-badge role-${m.role}`}>{m.role}</span>
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={onAdd}>
          {error && <div className="error-banner">{error}</div>}
          <label className="label">Invite by email</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              required
              style={{ flex: 2 }}
            />
            <select
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as BoardRole)}
              style={{ flex: 1 }}
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary" disabled={addMember.isPending}>
              Add
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>
            Viewer = read-only · Member = edit tasks · Admin = manage members
          </p>
        </form>
      )}
    </Modal>
  );
}
