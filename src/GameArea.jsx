import { useState, useRef, useEffect } from "react";
import Dashboard from "./Dashboard"
import "./GameArea.css"

export default function GameArea() {
    const [gameStarted, setGameStarted] = useState(false);
    const canvasRef = useRef(null);
    const scoreRef = useRef(null);
    const levelRef = useRef(null);
    const [gameOver, setGameOver] = useState(false);
    const gameOverRef = useRef(false);
    const [restartKey, setRestartKey] = useState(0);
    // Refs
    const paddleHitSound = useRef();
    const wallHitSound = useRef();
    const gameOverSound = useRef();

    // Cooldowns
    const lastHitAt = useRef(0);

    // Unlock flag
    const audioUnlocked = useRef(false);


    useEffect(() => {
        paddleHitSound.current = new Audio("/sounds/hit_paddle.mp3");
        wallHitSound.current = new Audio("/sounds/hit_wall.mp3");
        gameOverSound.current = new Audio("/sounds/game_over.mp3");
    }, []);


    useEffect(() => {
        function unlockAudio() {
            if (audioUnlocked.current) return;

            [paddleHitSound, wallHitSound, gameOverSound].forEach(s => {
                if (!s.current) return;
                s.current.play().catch(() => { });
                s.current.pause();
                s.current.currentTime = 0;
            });

            audioUnlocked.current = true;
            document.removeEventListener("click", unlockAudio);
        }

        document.addEventListener("click", unlockAudio);
    }, []);

    function playSound(ref, cooldown = 40) {
        if (!audioUnlocked.current) return;
        if (!ref.current) return;

        const now = performance.now();
        if (now - lastHitAt.current < cooldown) return;

        lastHitAt.current = now;

        try {
            ref.current.currentTime = 0;
            ref.current.play();
        } catch { }
    }


    function restartGame() {
        setRestartKey(prev => prev + 1);  // reinitialize game
        setGameOver(false);               // hide score popup
        setLives(3);                      // reset lives
    }

    useEffect(() => {
        gameOverRef.current = gameOver;
    }, [gameOver]);


    const [lives, setLives] = useState(3);

    const soundRef = useRef(null);

    useEffect(() => {
        if (!gameStarted) return; // Do NOT run game logic unless started!
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const rect = canvas.getBoundingClientRect();

        const cw = rect.width;     // real width from CSS
        const ch = rect.height;    // real height from CSS

        let dpr = window.devicePixelRatio || 1;
        let coordY = ch / 2;

        function resizeCanvasToDisplaySize() {
            // compute CSS size (take parent or explicit size)
            const parent = canvas.parentElement;
            if (parent) {
                const rect = parent.getBoundingClientRect();
                // cw = Math.max(300, rect.width);
                // ch = Math.max(200, rect.height);
            }

            dpr = window.devicePixelRatio || 1;
            canvas.style.width = cw + "px";
            canvas.style.height = ch + "px";
            canvas.width = Math.floor(cw * dpr);
            canvas.height = Math.floor(ch * dpr);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }

        // Utility
        function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
        function vec2(x, y) { return { x, y }; }

        // --- Game objects ---
        function Ball(pos, velocity, radius) {
            this.pos = pos;
            this.velocity = velocity;
            this.radius = radius;
            this.lastHit = null;

            this.update = function () {
                const vx = this.velocity.x;
                const vy = this.velocity.y;
                const steps = Math.max(1, Math.ceil(Math.hypot(vx, vy) / (this.radius)));
                for (let i = 0; i < steps; i++) {
                    this.pos.x += vx / steps;
                    this.pos.y += vy / steps;
                }
            };

            this.draw = function () {
                ctx.fillStyle = "#FFFFFF";
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            };
        }

        function Paddle(pos, width, height, color) {
            this.pos = pos;
            this.width = width;
            this.height = height;
            this.color = color;
            this.score = 0;
            this.level = 1;

            this.draw = function () {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
            };

            this.getCenter = function () {
                return vec2(this.pos.x + this.width / 2, this.pos.y + this.height / 2);
            };
        }

        // collision helpers
        function ballCollisionWithWalls(ball) {
            if (ball.pos.y + ball.radius >= ch) {
                playSound(wallHitSound, 40);
                ball.velocity.y *= -1;
                ball.pos.y = ch - ball.radius;
            }
            if (ball.pos.y - ball.radius <= 0) {
                playSound(wallHitSound, 40);
                ball.velocity.y *= -1;
                ball.pos.y = ball.radius;
            }
        }

        function paddleCollisionWithWall(paddle) {
            if (paddle.pos.y < 0) paddle.pos.y = 0;
            if (paddle.pos.y + paddle.height > ch) paddle.pos.y = ch - paddle.height;
        }

        function updateScoreDisplay(paddle) {
            if (scoreRef.current) scoreRef.current.textContent = paddle.score;
        }
        function updateLevelDisplay(paddle) {
            if (levelRef.current) levelRef.current.textContent = paddle.level;
        }

        function ballPaddleCollision(ball, paddle, isLeftPaddle) {
            const nearestX = clamp(ball.pos.x, paddle.pos.x, paddle.pos.x + paddle.width);
            const nearestY = clamp(ball.pos.y, paddle.pos.y, paddle.pos.y + paddle.height);
            const dx = ball.pos.x - nearestX;
            const dy = ball.pos.y - nearestY;
            const dist2 = dx * dx + dy * dy;
            const r2 = ball.radius * ball.radius;
            const isColliding = dist2 <= r2;

            if (isColliding) {
                playSound(paddleHitSound, 60);

                if (ball.lastHit === paddle) return;
                ball.lastHit = paddle;

                const relativeY = (ball.pos.y - (paddle.pos.y + paddle.height / 2)) / (paddle.height / 2);
                const maxBounce = Math.PI / 3;
                const bounceAngle = clamp(relativeY, -1, 1) * maxBounce;

                const speed = Math.hypot(ball.velocity.x, ball.velocity.y) || 5;
                const dirX = isLeftPaddle ? 1 : -1;

                ball.velocity.x = dirX * Math.cos(bounceAngle) * speed;
                ball.velocity.y = Math.sin(bounceAngle) * speed;

                if (isLeftPaddle) {
                    ball.pos.x = paddle.pos.x + paddle.width + ball.radius + 0.5;
                } else {
                    ball.pos.x = paddle.pos.x - ball.radius - 0.5;
                }

                if (isLeftPaddle) {
                    paddle.score += 1;
                    updateScoreDisplay(paddle);
                    if (paddle.score % 5 === 0) {
                        const signX = ball.velocity.x > 0 ? 1 : -1;
                        const signY = ball.velocity.y > 0 ? 1 : -1;
                        ball.velocity.x = signX * (Math.abs(ball.velocity.x) + 2);
                        ball.velocity.y = signY * (Math.abs(ball.velocity.y) + 2);
                        paddle.level += 1;
                        updateLevelDisplay(paddle);
                    }
                }
            } else {
                if (ball.lastHit === paddle) ball.lastHit = null;
            }
        }

        // prediction helper for AI
        function predictBallHit(ball, targetX, maxSteps = 5000) {
            let simX = ball.pos.x;
            let simY = ball.pos.y;
            let velX = ball.velocity.x;
            let velY = ball.velocity.y;
            if (velX === 0) return { y: simY, steps: 1 };
            const wantToTheRight = targetX >= simX;
            for (let step = 0; step < maxSteps; step++) {
                simX += velX;
                simY += velY;
                if (simY - ball.radius <= 0) { simY = ball.radius; velY *= -1; }
                if (simY + ball.radius >= ch) { simY = ch - ball.radius; velY *= -1; }
                if ((wantToTheRight && simX >= targetX) || (!wantToTheRight && simX <= targetX)) {
                    return { y: simY, steps: step + 1 };
                }
            }
            return { y: simY, steps: maxSteps };
        }

        function player2Ai(ball, paddle) {
            const interceptX = paddle.pos.x - 1 - ball.radius;
            const pred = predictBallHit(ball, interceptX, 2000);
            const predictedY = pred.y;
            const steps = Math.max(1, pred.steps);
            const targetY = predictedY - paddle.height / 2;
            const distance = targetY - paddle.pos.y;
            const requiredSpeed = Math.abs(distance) / steps;
            const marginFactor = 1.15;
            const minSpeed = 3;
            const maxSpeed = 30;
            const speed = Math.min(maxSpeed, Math.max(minSpeed, requiredSpeed * marginFactor));
            const dy = targetY - paddle.pos.y;
            if (Math.abs(dy) > speed) paddle.pos.y += Math.sign(dy) * speed;
            else paddle.pos.y = targetY;
            if (paddle.pos.y < 0) paddle.pos.y = 0;
            if (paddle.pos.y + paddle.height > ch) paddle.pos.y = ch - paddle.height;
        }

        // --- Initialize ---
        resizeCanvasToDisplaySize();

        const TRAIL_MAX = 12;
        const trail = [];
        const ball = new Ball(vec2(100, 100), vec2(7, 7), ch * 0.02);
        const paddle1 = new Paddle(vec2(5, ch * 0.4), cw * 0.01, ch * 0.2, "#3498DB");
        const paddle2 = new Paddle(vec2(cw - cw * 0.02, ch * 0.4), cw * 0.01, ch * 0.2, "#E74C3C");

        let internalLives = 3;



        function resetBall(toLeft = true) {
            ball.pos.x = 100;
            ball.pos.y = Math.random() * 10 + 100;
            // keep the SAME velocity direction but reset speed if needed
            ball.velocity.x *= -1;
            ball.velocity.y *= -1;
            trail.length = 0;
        }

        function drawTrail() {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < trail.length; i++) {
                const p = trail[i];
                const t = i / TRAIL_MAX;
                const size = ball.radius * (1 - t * 0.9);
                const alpha = 1 - t;
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // handle mouse pointer over canvas
        function onMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            coordY = e.clientY - rect.top;
            // center paddle1 on mouse
            paddle1.pos.y = coordY - paddle1.height / 2;
            paddleCollisionWithWall(paddle1);
        }

        canvas.addEventListener("mousemove", onMouseMove);

        // sound toggle
        function onSoundClick() {
            if (!soundRef.current) return;
            soundRef.current.classList.toggle("fa-volume-high");
            soundRef.current.classList.toggle("fa-volume-xmark");
        }

        if (soundRef.current) soundRef.current.addEventListener("click", onSoundClick);

        // game loop
        let rafId = null;
        function boardStyle() {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(cw / 2, 0);
            ctx.lineTo(cw / 2, ch);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 6]);
            ctx.beginPath();
            ctx.arc(cw / 2, ch / 2, 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        function gameUpdate() {
            if (gameOverRef.current) return;
            ball.update();
            if (ball.pos.x - ball.radius <= 0) {
                internalLives--;
                setLives(internalLives);
                if (internalLives <= 0) {
                    playSound(gameOverSound, 60);
                    setGameOver(true);
                    return;
                } else {
                    resetBall(false);
                }
            }
            if (ball.pos.x + ball.radius >= cw) {
                resetBall(true);
            }

            trail.unshift({ x: ball.pos.x, y: ball.pos.y });
            if (trail.length > TRAIL_MAX) trail.pop();

            ballCollisionWithWalls(ball);
            ballPaddleCollision(ball, paddle1, true);
            player2Ai(ball, paddle2);
            ballPaddleCollision(ball, paddle2, false);
        }

        function gameDraw() {
            drawTrail();
            ball.draw();
            paddle1.draw();
            paddle2.draw();
        }

        function loop() {
            ctx.clearRect(0, 0, cw, ch);
            boardStyle();
            if (gameOverRef.current === true) {
                ctx.clearRect(0, 0, cw, ch);
                return;
            }
            gameUpdate();
            gameDraw();
            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);

        // handle window resize
        function onResize() {
            resizeCanvasToDisplaySize();
            // re-position paddles based on new size
            paddle1.height = ch * 0.2;
            paddle1.pos.x = 5;
            paddle2.width = cw * 0.02;
            paddle2.pos.x = cw - paddle2.width - 5;
            paddle2.height = ch * 0.2;
            paddle1.pos.y = clamp(paddle1.pos.y, 0, ch - paddle1.height);
            paddle2.pos.y = clamp(paddle2.pos.y, 0, ch - paddle2.height);
        }
        window.addEventListener("resize", onResize);

        // cleanup
        return () => {
            cancelAnimationFrame(rafId);
            canvas.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("resize", onResize);
            if (soundRef.current) soundRef.current.removeEventListener("click", onSoundClick);
        };
    },[restartKey, gameStarted]); // run once


    return (
        <div className="canvadiv">

            {!gameStarted && (
                <button className="start-btn" onClick={() => setGameStarted(true)}>
                    Start Game
                </button>
            )}

            {gameStarted && (
                <canvas id="canvas" ref={canvasRef}></canvas>
            )}

            <Dashboard
                scoreRef={scoreRef}
                levelRef={levelRef}
                lives={lives}
                soundRef={soundRef}
                gameOver={gameOver}
                restartGame={restartGame}
            />

        </div>
    );
}