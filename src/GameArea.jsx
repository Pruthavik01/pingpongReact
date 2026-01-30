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
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    // Refs
    const paddleHitSound = useRef();
    const wallHitSound = useRef();
    const gameOverSound = useRef();
    const soundEnabled = useRef(true);

    // Cooldowns
    const lastHitAt = useRef(0);

    // Unlock flag
    const audioUnlocked = useRef(false);

    useEffect(() => {
        paddleHitSound.current = new Audio("/sounds/hit_paddle.mp3");
        wallHitSound.current = new Audio("/sounds/hit_wall2.mp3");
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

    // Track mobile state on resize
    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth <= 768);
        }
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    function playSound(ref, cooldown = 40) {
        if (!soundEnabled.current) return;
        if (!audioUnlocked.current) return;
        if (!ref.current) return;

        const now = performance.now();
        if (now - lastHitAt.current < cooldown) return;

        lastHitAt.current = now;

        try {
            ref.current.currentTime = 0;
            ref.current.play();
        } catch (e) {
            console.log(e);
        }
    }

    function restartGame() {
        setRestartKey(prev => prev + 1);
        setGameOver(false);
        setLives(3);

        if (scoreRef.current) {
            scoreRef.current.textContent = 0;
        }

        if (levelRef.current) {
            levelRef.current.textContent = 1;
        }
    }

    useEffect(() => {
        gameOverRef.current = gameOver;
    }, [gameOver]);

    const [lives, setLives] = useState(3);
    const soundRef = useRef(null);

    useEffect(() => {
        if (!gameStarted) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const rect = canvas.getBoundingClientRect();

        let cw = rect.width;
        let ch = rect.height;

        let dpr = window.devicePixelRatio || 1;
        let coordY = ch / 2;
        let coordX = cw / 2;

        function resizeCanvasToDisplaySize() {
            const rect = canvas.getBoundingClientRect();
            cw = rect.width;
            ch = rect.height;

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
            if (isMobile) {
                // Vertical mode: bounce off left/right walls
                if (ball.pos.x + ball.radius >= cw) {
                    playSound(wallHitSound, 40);
                    ball.velocity.x *= -1;
                    ball.pos.x = cw - ball.radius;
                }
                if (ball.pos.x - ball.radius <= 0) {
                    playSound(wallHitSound, 40);
                    ball.velocity.x *= -1;
                    ball.pos.x = ball.radius;
                }
            } else {
                // Horizontal mode: bounce off top/bottom walls
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
        }

        function paddleCollisionWithWall(paddle) {
            if (isMobile) {
                // Vertical mode: constrain X
                if (paddle.pos.x < 0) paddle.pos.x = 0;
                if (paddle.pos.x + paddle.width > cw) paddle.pos.x = cw - paddle.width;
            } else {
                // Horizontal mode: constrain Y
                if (paddle.pos.y < 0) paddle.pos.y = 0;
                if (paddle.pos.y + paddle.height > ch) paddle.pos.y = ch - paddle.height;
            }
        }

        function updateScoreDisplay(paddle) {
            if (scoreRef.current) scoreRef.current.textContent = paddle.score;
        }
        
        function updateLevelDisplay(paddle) {
            if (levelRef.current) levelRef.current.textContent = paddle.level;
        }

        function ballPaddleCollision(ball, paddle, isPlayerPaddle) {
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

                const speed = Math.hypot(ball.velocity.x, ball.velocity.y) || 5;

                if (isMobile) {
                    // Vertical mode: paddle at bottom/top
                    const relativeX = (ball.pos.x - (paddle.pos.x + paddle.width / 2)) / (paddle.width / 2);
                    const maxBounce = Math.PI / 3;
                    const bounceAngle = clamp(relativeX, -1, 1) * maxBounce;

                    const dirY = isPlayerPaddle ? -1 : 1; // Player at bottom shoots up

                    ball.velocity.x = Math.sin(bounceAngle) * speed;
                    ball.velocity.y = dirY * Math.cos(bounceAngle) * speed;

                    if (isPlayerPaddle) {
                        ball.pos.y = paddle.pos.y - ball.radius - 0.5;
                    } else {
                        ball.pos.y = paddle.pos.y + paddle.height + ball.radius + 0.5;
                    }
                } else {
                    // Horizontal mode: paddle at left/right
                    const relativeY = (ball.pos.y - (paddle.pos.y + paddle.height / 2)) / (paddle.height / 2);
                    const maxBounce = Math.PI / 3;
                    const bounceAngle = clamp(relativeY, -1, 1) * maxBounce;

                    const dirX = isPlayerPaddle ? 1 : -1; // Player at left shoots right

                    ball.velocity.x = dirX * Math.cos(bounceAngle) * speed;
                    ball.velocity.y = Math.sin(bounceAngle) * speed;

                    if (isPlayerPaddle) {
                        ball.pos.x = paddle.pos.x + paddle.width + ball.radius + 0.5;
                    } else {
                        ball.pos.x = paddle.pos.x - ball.radius - 0.5;
                    }
                }

                if (isPlayerPaddle) {
                    paddle.score += 1;
                    updateScoreDisplay(paddle);
                    if (paddle.score % 5 === 0) {
                        const signX = ball.velocity.x > 0 ? 1 : -1;
                        const signY = ball.velocity.y > 0 ? 1 : -1;
                        ball.velocity.x = signX * (Math.abs(ball.velocity.x) + 1);
                        ball.velocity.y = signY * (Math.abs(ball.velocity.y) + 1);
                        paddle.level += 1;
                        updateLevelDisplay(paddle);
                    }
                }
            } else {
                if (ball.lastHit === paddle) ball.lastHit = null;
            }
        }

        // prediction helper for AI
        function predictBallHit(ball, targetPos, maxSteps = 5000) {
            let simX = ball.pos.x;
            let simY = ball.pos.y;
            let velX = ball.velocity.x;
            let velY = ball.velocity.y;

            if (isMobile) {
                // Vertical mode: predict X position when ball reaches targetPos Y
                if (velY === 0) return { x: simX, steps: 1 };
                const wantUp = targetPos <= simY;
                
                for (let step = 0; step < maxSteps; step++) {
                    simX += velX;
                    simY += velY;
                    
                    // Bounce off left/right walls
                    if (simX - ball.radius <= 0) { simX = ball.radius; velX *= -1; }
                    if (simX + ball.radius >= cw) { simX = cw - ball.radius; velX *= -1; }
                    
                    if ((wantUp && simY <= targetPos) || (!wantUp && simY >= targetPos)) {
                        return { x: simX, steps: step + 1 };
                    }
                }
                return { x: simX, steps: maxSteps };
            } else {
                // Horizontal mode: predict Y position when ball reaches targetPos X
                if (velX === 0) return { y: simY, steps: 1 };
                const wantRight = targetPos >= simX;
                
                for (let step = 0; step < maxSteps; step++) {
                    simX += velX;
                    simY += velY;
                    
                    // Bounce off top/bottom walls
                    if (simY - ball.radius <= 0) { simY = ball.radius; velY *= -1; }
                    if (simY + ball.radius >= ch) { simY = ch - ball.radius; velY *= -1; }
                    
                    if ((wantRight && simX >= targetPos) || (!wantRight && simX <= targetPos)) {
                        return { y: simY, steps: step + 1 };
                    }
                }
                return { y: simY, steps: maxSteps };
            }
        }

        function player2Ai(ball, paddle) {
            const marginFactor = isMobile ? 1.3 : 1.15;
            const minSpeed = 3;
            const maxSpeed = isMobile ? 20 : 30;

            if (isMobile) {
                // Vertical mode: AI at top, moves left-right
                const interceptY = paddle.pos.y + paddle.height + 1 + ball.radius;
                const pred = predictBallHit(ball, interceptY, 2000);
                const predictedX = pred.x;
                const steps = Math.max(1, pred.steps);
                const targetX = predictedX - paddle.width / 2;
                const distance = targetX - paddle.pos.x;
                const requiredSpeed = Math.abs(distance) / steps;
                const speed = Math.min(maxSpeed, Math.max(minSpeed, requiredSpeed * marginFactor));
                const dx = targetX - paddle.pos.x;
                
                if (Math.abs(dx) > speed) {
                    paddle.pos.x += Math.sign(dx) * speed;
                } else {
                    paddle.pos.x = targetX;
                }
                
                if (paddle.pos.x < 0) paddle.pos.x = 0;
                if (paddle.pos.x + paddle.width > cw) paddle.pos.x = cw - paddle.width;
            } else {
                // Horizontal mode: AI at right, moves up-down
                const interceptX = paddle.pos.x - 1 - ball.radius;
                const pred = predictBallHit(ball, interceptX, 2000);
                const predictedY = pred.y;
                const steps = Math.max(1, pred.steps);
                const targetY = predictedY - paddle.height / 2;
                const distance = targetY - paddle.pos.y;
                const requiredSpeed = Math.abs(distance) / steps;
                const speed = Math.min(maxSpeed, Math.max(minSpeed, requiredSpeed * marginFactor));
                const dy = targetY - paddle.pos.y;
                
                if (Math.abs(dy) > speed) {
                    paddle.pos.y += Math.sign(dy) * speed;
                } else {
                    paddle.pos.y = targetY;
                }
                
                if (paddle.pos.y < 0) paddle.pos.y = 0;
                if (paddle.pos.y + paddle.height > ch) paddle.pos.y = ch - paddle.height;
            }
        }

        // --- Initialize ---
        resizeCanvasToDisplaySize();

        const TRAIL_MAX = 12;
        const trail = [];
        
        // Different ball speeds for mobile vs desktop
        const initialSpeed = isMobile ? 3.5 : 7;
        const ball = new Ball(
            vec2(cw / 2, ch / 2), 
            vec2(initialSpeed, initialSpeed), 
            isMobile ? Math.min(cw, ch) * 0.025 : ch * 0.02
        );
        
        let paddle1, paddle2;

        if (isMobile) {
            // Vertical mode: player at bottom, AI at top
            paddle1 = new Paddle(vec2(cw * 0.4, ch - ch * 0.03), cw * 0.2, ch * 0.015, "#3498DB");
            paddle2 = new Paddle(vec2(cw * 0.4, 5), cw * 0.2, ch * 0.015, "#E74C3C");
        } else {
            // Horizontal mode: player at left, AI at right
            paddle1 = new Paddle(vec2(5, ch * 0.4), cw * 0.01, ch * 0.2, "#3498DB");
            paddle2 = new Paddle(vec2(cw - cw * 0.02, ch * 0.4), cw * 0.01, ch * 0.2, "#E74C3C");
        }

        let internalLives = 3;

        function resetBall(toPlayer = true) {
            ball.pos.x = cw / 2;
            ball.pos.y = ch / 2;
            
            const speed = isMobile ? 3.5 : 7;
            
            if (isMobile) {
                ball.velocity.x = (Math.random() - 0.5) * speed * 2;
                ball.velocity.y = toPlayer ? speed : -speed;
            } else {
                ball.velocity.x = toPlayer ? speed : -speed;
                ball.velocity.y = (Math.random() - 0.5) * speed * 2;
            }
            
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

        // handle pointer (mouse/touch) over canvas
        function onPointerMove(e) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;

            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            if (isMobile) {
                // Vertical mode: move paddle left-right
                coordX = clientX - rect.left;
                paddle1.pos.x = coordX - paddle1.width / 2;
                paddleCollisionWithWall(paddle1);
            } else {
                // Horizontal mode: move paddle up-down
                coordY = clientY - rect.top;
                paddle1.pos.y = coordY - paddle1.height / 2;
                paddleCollisionWithWall(paddle1);
            }
        }

        canvas.addEventListener("mousemove", onPointerMove);
        canvas.addEventListener("touchmove", onPointerMove, { passive: false });
        canvas.addEventListener("touchstart", onPointerMove, { passive: false });

        // sound toggle
        function onSoundClick() {
            if (!soundRef.current) return;

            soundEnabled.current = !soundEnabled.current;

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
            
            if (isMobile) {
                // Vertical: horizontal line in middle
                ctx.moveTo(0, ch / 2);
                ctx.lineTo(cw, ch / 2);
            } else {
                // Horizontal: vertical line in middle
                ctx.moveTo(cw / 2, 0);
                ctx.lineTo(cw / 2, ch);
            }
            
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

            if (isMobile) {
                // Vertical mode: lose if ball goes off bottom
                if (ball.pos.y + ball.radius >= ch) {
                    internalLives--;
                    setLives(internalLives);
                    if (internalLives <= 0) {
                        playSound(gameOverSound, 60);
                        setGameOver(true);
                        return;
                    } else {
                        resetBall(true);
                    }
                }
                if (ball.pos.y - ball.radius <= 0) {
                    resetBall(true);
                }
            } else {
                // Horizontal mode: lose if ball goes off left
                if (ball.pos.x - ball.radius <= 0) {
                    internalLives--;
                    setLives(internalLives);
                    if (internalLives <= 0) {
                        playSound(gameOverSound, 60);
                        setGameOver(true);
                        return;
                    } else {
                        resetBall(true);
                    }
                }
                if (ball.pos.x + ball.radius >= cw) {
                    resetBall(true);
                }
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
            const newRect = canvas.getBoundingClientRect();
            cw = newRect.width;
            ch = newRect.height;
            resizeCanvasToDisplaySize();

            if (isMobile) {
                // Vertical mode
                paddle1.width = cw * 0.2;
                paddle1.height = ch * 0.015;
                paddle1.pos.y = ch - paddle1.height - 5;
                paddle2.width = cw * 0.2;
                paddle2.height = ch * 0.015;
                paddle2.pos.y = 5;
                paddle1.pos.x = clamp(paddle1.pos.x, 0, cw - paddle1.width);
                paddle2.pos.x = clamp(paddle2.pos.x, 0, cw - paddle2.width);
            } else {
                // Horizontal mode
                paddle1.height = ch * 0.2;
                paddle1.width = cw * 0.01;
                paddle1.pos.x = 5;
                paddle2.width = cw * 0.02;
                paddle2.height = ch * 0.2;
                paddle2.pos.x = cw - paddle2.width - 5;
                paddle1.pos.y = clamp(paddle1.pos.y, 0, ch - paddle1.height);
                paddle2.pos.y = clamp(paddle2.pos.y, 0, ch - paddle2.height);
            }
        }
        
        window.addEventListener("resize", onResize);

        // cleanup
        return () => {
            cancelAnimationFrame(rafId);
            canvas.removeEventListener("mousemove", onPointerMove);
            canvas.removeEventListener("touchmove", onPointerMove);
            canvas.removeEventListener("touchstart", onPointerMove);
            window.removeEventListener("resize", onResize);
            if (soundRef.current) soundRef.current.removeEventListener("click", onSoundClick);
        };
    }, [restartKey, gameStarted, isMobile]);

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