import "./ScoreSubmit.css";
import { useState } from "react";

export default function ScoreSubmit({ score,restartGame }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const URL = import.meta.env.VITE_API_URL;


    async function handleSubmit() {
        const name = document.getElementById("playerName").value.trim();

        if (!name) {
            setMessage("Please enter your name.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${URL}/add-score`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, score: Number(score) }),
            });

            const data = await res.json();

            if (data.error) {
                setMessage("Error saving score!");
            } else {
                setMessage(`Score saved successfully ${name}!`);
            }
        } catch (err) {
            console.error(err);
            setMessage("Server error!");
        }

        setLoading(false);
    }

    function handleRestart() {
        restartGame();     // 🔥 triggers full game restart
    }


    return (
        <div id="gameOverForm" className="gameOverForm">
            <h2>Game Over</h2>

            <div className="score-row">
                <h3>Your Score:</h3>
                <h3>{score}</h3>
            </div>

            <div className="submit-row">
                <input type="text" id="playerName" placeholder="Enter Your Name" />
                <button id="submitScore" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Submitting..." : "Submit"}
                </button>
            </div>
            <button id="restart" onClick={handleRestart}>Restart</button>

            {message && <p className="status">{message}</p>}
        </div>
    );
}
