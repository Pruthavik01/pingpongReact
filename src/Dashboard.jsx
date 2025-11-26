import "./Dashboard.css";

export default function Dashboard({ scoreRef, levelRef, lives, soundRef }) {
  return (
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
  );
}
