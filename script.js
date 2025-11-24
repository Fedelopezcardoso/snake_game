const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const GAME_SPEED = 100; // ms

// Game State
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop;
let isGameRunning = false;

// Entities
let snake = [];
let food = { x: 0, y: 0 };
let walls = [];
let velocity = { x: 0, y: 0 };
let nextVelocity = { x: 0, y: 0 };

// Initialize High Score Display
highScoreElement.textContent = highScore;

// Event Listeners
document.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);

function startGame() {
    if (isGameRunning) return;

    resetGame();
    isGameRunning = true;
    startBtn.textContent = 'RESTART';
    startBtn.blur(); // Remove focus so spacebar doesn't trigger button

    gameLoop = setInterval(update, GAME_SPEED);
}

function resetGame() {
    // Reset Snake (Start in middle)
    snake = [
        { x: 10, y: 15 },
        { x: 10, y: 16 },
        { x: 10, y: 17 }
    ];

    // Reset Movement (Moving Up)
    velocity = { x: 0, y: -1 };
    nextVelocity = { x: 0, y: -1 };

    score = 0;
    scoreElement.textContent = score;

    particles = [];

    generateWalls();
    placeFood();
}

function generateWalls() {
    walls = [];
    const wallCount = 15; // Number of random walls

    for (let i = 0; i < wallCount; i++) {
        let wall;
        let safe = false;
        while (!safe) {
            wall = {
                x: Math.floor(Math.random() * TILE_COUNT),
                y: Math.floor(Math.random() * TILE_COUNT)
            };

            safe = true;

            // Check against snake body
            for (let segment of snake) {
                if (wall.x === segment.x && wall.y === segment.y) {
                    safe = false;
                    break;
                }
            }

            // Also keep a small safe zone around the head to avoid instant death
            if (safe) {
                const distFromHead = Math.abs(wall.x - snake[0].x) + Math.abs(wall.y - snake[0].y);
                if (distFromHead < 3) {
                    safe = false;
                }
            }
        }
        walls.push(wall);
    }
}

function placeFood() {
    let validPosition = false;
    while (!validPosition) {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };

        validPosition = true;

        // Check snake collision
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                validPosition = false;
                break;
            }
        }

        // Check wall collision
        if (validPosition) {
            for (let wall of walls) {
                if (wall.x === food.x && wall.y === food.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }
}

function handleInput(e) {
    if (!isGameRunning) return;

    switch (e.key) {
        case 'ArrowUp':
            if (velocity.y !== 1) nextVelocity = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (velocity.y !== -1) nextVelocity = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (velocity.x !== 1) nextVelocity = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (velocity.x !== -1) nextVelocity = { x: 1, y: 0 };
            break;
    }
}

function update() {
    velocity = nextVelocity;

    const head = {
        x: snake[0].x + velocity.x,
        y: snake[0].y + velocity.y
    };

    // Infinite Sides (Wrapping)
    if (head.x < 0) head.x = TILE_COUNT - 1;
    if (head.x >= TILE_COUNT) head.x = 0;
    if (head.y < 0) head.y = TILE_COUNT - 1;
    if (head.y >= TILE_COUNT) head.y = 0;

    // Wall Collision
    for (let wall of walls) {
        if (head.x === wall.x && head.y === wall.y) {
            gameOver();
            return;
        }
    }

    // Self Collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head); // Add new head

    // Eat Food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        createParticles(food.x, food.y, '#ff0055');
        placeFood();
        // Don't pop tail, so snake grows
    } else {
        snake.pop(); // Remove tail
    }

    draw();
}

function draw() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    drawGrid();

    // Draw Walls
    ctx.fillStyle = '#00ccff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ccff';
    for (let wall of walls) {
        ctx.fillRect(wall.x * GRID_SIZE, wall.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    }

    // Draw Food
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    ctx.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);

    // Draw Snake
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff88';
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#ffffff' : '#00ff88'; // Head is white
        ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    // Draw Particles
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.05;

        if (particle.life <= 0) {
            particles.splice(index, 1);
        } else {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life;
            ctx.fillRect(particle.x * GRID_SIZE, particle.y * GRID_SIZE, particle.size, particle.size);
            ctx.globalAlpha = 1.0;
        }
    });

    // Reset Shadow
    ctx.shadowBlur = 0;
}

// Particle System
let particles = [];

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x + 0.5, // Center in tile
            y: y + 0.5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 1.0,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }

    // Draw Game Over Text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '40px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);

    ctx.font = '20px "Courier New"';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);

    startBtn.textContent = 'TRY AGAIN';
}

// Touch Controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    e.preventDefault(); // Prevent scrolling
}, { passive: false });

canvas.addEventListener('touchend', function (e) {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    e.preventDefault();
}, { passive: false });

function handleSwipe(startX, startY, endX, endY) {
    let diffX = endX - startX;
    let diffY = endY - startY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal Swipe
        if (diffX > 0 && velocity.x !== -1) {
            nextVelocity = { x: 1, y: 0 }; // Right
        } else if (diffX < 0 && velocity.x !== 1) {
            nextVelocity = { x: -1, y: 0 }; // Left
        }
    } else {
        // Vertical Swipe
        if (diffY > 0 && velocity.y !== -1) {
            nextVelocity = { x: 0, y: 1 }; // Down
        } else if (diffY < 0 && velocity.y !== 1) {
            nextVelocity = { x: 0, y: -1 }; // Up
        }
    }
}

function drawGrid() {
    ctx.strokeStyle = '#1a1a1a'; // Match --grid-color from CSS
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Initial Draw
resetGame();
draw();
