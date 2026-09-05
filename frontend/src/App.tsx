import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Channels } from "./pages/Channels";
import { Dashboard } from "./pages/Dashboard";
import { Help } from "./pages/Help";
import { History } from "./pages/History";
import { Landing } from "./pages/Landing";
import { Networks } from "./pages/Networks";
import { Settings } from "./pages/Settings";
import "./index.css";

// Skip-to-main-content link for keyboard and screen-reader users
function SkipLink() {
  return (
    <a
      href="#main-content"
      style={{
        position: "absolute",
        top: "-100%",
        left: 0,
        background: "var(--color-blue-600)",
        color: "#fff",
        padding: "0.5rem 1rem",
        zIndex: 9999,
        borderRadius: "0 0 0.5rem 0",
        fontWeight: 600,
        textDecoration: "none",
      }}
      onFocus={(e) => { (e.target as HTMLAnchorElement).style.top = "0"; }}
      onBlur={(e) => { (e.target as HTMLAnchorElement).style.top = "-100%"; }}
    >
      Skip to main content
    </a>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SkipLink />
      <div className="page-enter">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/networks" element={<Networks />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
