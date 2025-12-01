import { useState } from "react";
import "./Dashboard.css";
import ScoreSubmit from "./ScoreSubmit";
import LeaderboardDrawer from "./LeaderboardDrawer";
export default function Dashboard({ scoreRef, levelRef, lives, soundRef, gameOver,restartGame  }) {
  const [openDrawer, setOpenDrawer] = useState(false)
  return (
    <>
      <button className="leaderboard" onClick={() => setOpenDrawer(true)}>
        <i className="fa-solid fa-bars"></i>
      </button>

      <div className="dash">
        <div className="score">
          <h3>Score :&nbsp;</h3>
          <h3 id="score" ref={scoreRef}>0</h3>
          &nbsp;&nbsp;

          {Array.from({ length: lives }).map((_, i) => (
            <i key={i} className="fa-solid fa-heart live"></i>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="sound" style={{ marginRight: 14 }}>
            <i id="sound" className="fa-solid fa-volume-high" ref={soundRef}></i>
          </div>

          <div className="level">
            <h3>Level : &nbsp;</h3>
            <h3 id="level" ref={levelRef}>1</h3>
          </div>
        </div>
      </div>

      {/* Show ScoreSubmit ONLY if the game is over */}
      {gameOver && <ScoreSubmit score={scoreRef.current?.textContent} restartGame={restartGame} />}
      {openDrawer && <LeaderboardDrawer onClose={() => setOpenDrawer(false)} />}
    </>
  );
}

