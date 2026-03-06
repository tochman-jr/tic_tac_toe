const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Create WebSocket server
const wss = new WebSocket.Server({ server: app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
}) });

let games = {}; // Store game states
let waitingPlayers = []; // Queue for players waiting to join

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());

        switch (data.type) {
            case 'join':
                handleJoin(ws, data);
                break;
            case 'move':
                handleMove(ws, data);
                break;
            case 'reset':
                handleReset(ws, data);
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        handleDisconnect(ws);
    });
});

function handleJoin(ws, data) {
    if (waitingPlayers.length > 0) {
        // Start a new game with two players
        const player1 = waitingPlayers.shift();
        const player2 = ws;

        const gameId = generateGameId();
        games[gameId] = {
            players: [player1, player2],
            board: Array(9).fill(null),
            currentPlayer: 'X',
            gameOver: false,
            playerSymbols: { [player1.id]: 'X', [player2.id]: 'O' }
        };

        player1.gameId = gameId;
        player2.gameId = gameId;

        // Assign player IDs
        player1.id = 'player1';
        player2.id = 'player2';

        // Send game start to both players
        player1.send(JSON.stringify({
            type: 'gameStart',
            gameId: gameId,
            player: 'X',
            opponent: 'O'
        }));

        player2.send(JSON.stringify({
            type: 'gameStart',
            gameId: gameId,
            player: 'O',
            opponent: 'X'
        }));

        broadcastGameState(gameId);
    } else {
        // Add to waiting queue
        ws.id = 'waiting';
        waitingPlayers.push(ws);
        ws.send(JSON.stringify({
            type: 'waiting',
            message: 'Waiting for another player...'
        }));
    }
}

function handleMove(ws, data) {
    const gameId = ws.gameId;
    const game = games[gameId];

    if (!game || game.gameOver || game.currentPlayer !== game.playerSymbols[ws.id]) {
        return;
    }

    const index = data.index;
    if (game.board[index] !== null) {
        return;
    }

    game.board[index] = game.currentPlayer;
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

    if (checkWinner(game.board) || isBoardFull(game.board)) {
        game.gameOver = true;
    }

    broadcastGameState(gameId);
}

function handleReset(ws, data) {
    const gameId = ws.gameId;
    const game = games[gameId];

    if (!game) return;

    game.board = Array(9).fill(null);
    game.currentPlayer = 'X';
    game.gameOver = false;

    broadcastGameState(gameId);
}

function handleDisconnect(ws) {
    // Remove from waiting players
    const index = waitingPlayers.indexOf(ws);
    if (index > -1) {
        waitingPlayers.splice(index, 1);
    }

    // Handle game disconnection
    if (ws.gameId) {
        const game = games[ws.gameId];
        if (game) {
            // Notify the other player
            const otherPlayer = game.players.find(p => p !== ws);
            if (otherPlayer) {
                otherPlayer.send(JSON.stringify({
                    type: 'opponentDisconnected'
                }));
            }
            delete games[ws.gameId];
        }
    }
}

function broadcastGameState(gameId) {
    const game = games[gameId];
    if (!game) return;

    const gameState = {
        type: 'gameState',
        board: game.board,
        currentPlayer: game.currentPlayer,
        gameOver: game.gameOver,
        winner: game.gameOver ? checkWinner(game.board) : null
    };

    game.players.forEach(player => {
        player.send(JSON.stringify(gameState));
    });
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function isBoardFull(board) {
    return board.every(cell => cell !== null);
}

function generateGameId() {
    return Math.random().toString(36).substr(2, 9);
}