import { useEffect, useState } from "react";
import "./LeaderboardDrawer.css";

export default function LeaderboardDrawer({onClose}){
    const [scores, setScores] = useState([]);
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(()=>{
        async function fetchScore(){
            try{
                const res = await fetch(`${API_URL}/scores`)
                const data = await res.json();
                setScores(data);
            }
            catch(e){
                console.error("Error Fetching Data");
            }
        }
        fetchScore();
    },[]);

     return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        
        <div className="drawer-header">
          <h2>🏆 Leaderboard</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="drawer-content">
          {scores.length === 0 ? (
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