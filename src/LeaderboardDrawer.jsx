// LeaderboardDrawer.jsx
import { useEffect, useState } from "react";
import "./LeaderboardDrawer.css";

export default function LeaderboardDrawer({ onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchScore() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/scores`, { signal, cache: "no-store" });

        if (!res.ok) {
          // The backend returns a JSON {error: "..."} on failure, so try to parse it (safe)
          let errMsg = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            errMsg = errData?.error || errMsg;
          } catch (e) {
            // ignore json parse error
          }
          throw new Error(`Failed to fetch scores: ${errMsg}`);
        }

        const data = await res.json();
        // Ensure array
        setScores(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name === "AbortError") {
          // fetch aborted — ignore
          return;
        }
        console.error("Error Fetching Data", e);
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchScore();

    // cleanup on unmount
    return () => {
      controller.abort();
    };
  }, [API_URL]);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>🏆 Leaderboard</h2>
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>

        <div className="drawer-content">
          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <div>
              <p style={{ color: "red" }}>Error: {error}</p>
              <button onClick={() => {
                // simple retry by calling effect again — update state to re-run effect:
                setScores([]); // not necessary but forces a re-render
                // The easiest: call fetch manually or toggle a ref — I'll just reload:
                window.location.reload(); // simple, or you can implement a fetch function exposed to UI
              }}>Try again</button>
            </div>
          ) : scores.length === 0 ? (
            <p>No scores yet.</p>
          ) : (
            scores.map((item, i) => (
              <div key={i} className="score-row">
                <span>{i + 1}. {item.name}</span>
                <span>{item.score}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}