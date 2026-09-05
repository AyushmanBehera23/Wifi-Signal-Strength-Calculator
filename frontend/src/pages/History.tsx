import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteHistory, getHistory } from "../services/api";
import type { HistoryRecord } from "../types/wifi";

export function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const PAGE_SIZE = 20;

  const load = (p: number) => {
    setLoading(true);
    getHistory(p, PAGE_SIZE)
      .then((r) => { setRecords(r.records); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteHistory();
      setRecords([]);
      setTotal(0);
      setDeleteConfirm(false);
    } catch {}
    setDeleting(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700 }}>Scan History</h1>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.875rem" }}>{total} scan(s) stored locally</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link to="/dashboard" className="btn btn-secondary">← Dashboard</Link>
          {records.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setDeleteConfirm(true)}
              disabled={deleting}
              aria-label="Delete all scan history"
            >
              🗑 Delete all
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div role="alertdialog" aria-labelledby="delete-dialog-title" className="card" style={{ borderColor: "rgba(239,68,68,0.4)", marginBottom: "1.5rem" }}>
          <h2 id="delete-dialog-title" style={{ margin: "0 0 0.5rem", color: "#ef4444", fontSize: "1rem" }}>Delete all history?</h2>
          <p style={{ margin: "0 0 1rem", color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
            This will permanently delete all {total} scan record(s) from local storage. This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting} aria-label="Confirm delete all history">
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 300 }} aria-label="Loading history" />
      ) : records.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>No scan history</p>
          <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>Run your first scan to start building history.</p>
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      ) : (
        <>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="data-table" aria-label="Scan history">
              <thead>
                <tr>
                  <th scope="col">Date / Time</th>
                  <th scope="col">Networks</th>
                  <th scope="col">Scanner</th>
                  <th scope="col">Analysis v.</th>
                  <th scope="col">Duration</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const start = new Date(r.started_at);
                  const end = r.completed_at ? new Date(r.completed_at) : null;
                  const duration = end ? `${((end.getTime() - start.getTime()) / 1000).toFixed(1)}s` : "—";
                  return (
                    <tr key={r.scan_id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{start.toLocaleDateString()}</div>
                        <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>{start.toLocaleTimeString()}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--color-blue-400)" }}>{r.network_count}</td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>{r.scanner_source}</td>
                      <td className="mono" style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>{r.analysis_version}</td>
                      <td className="mono" style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">← Prev</button>
              <span style={{ alignSelf: "center", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                Page {page} of {totalPages}
              </span>
              <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
