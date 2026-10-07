import { useAuth } from "../auth/AuthContext";
import { Link } from "react-router-dom";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TopBar() {
  const { user, logout } = useAuth();
  return (
    <div className="topbar">
      <Link to="/" className="brand">
        <span className="brand-logo">🗂️</span>
        TaskFlow
      </Link>
      <div className="topbar-right">
        {user && (
          <>
            <span className="avatar" title={user.full_name}>
              {initials(user.full_name)}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
