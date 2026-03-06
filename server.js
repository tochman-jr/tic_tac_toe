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
let rooms = {}; // Store room information: { code: { players: [], gameId: null, scores: { player1: {wins:0, losses:0, draws:0}, player2: {wins:0, losses:0, draws:0} }, starter: 'player1' } }

wss.on('connection', (ws) => {
     // connection opened

    ws.on('message', (message) => {
         // received message
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (err) {
            console.error('[WS] invalid JSON', err);
            return;
        }

        switch (data.type) {
            case 'createRoom':
                handleCreateRoom(ws);
                break;
            case 'joinRoom':
                handleJoinRoom(ws, data.code);
                break;
            case 'move':
                handleMove(ws, data);
                break;
            case 'reset':
                handleReset(ws, data);
                break;
            default:
                 // unknown message type
        }
    });

    ws.on('close', () => {
        console.log('[WS] connection closed');
        handleDisconnect(ws);
    });
});

function handleCreateRoom(ws) {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
        players: [ws],
        gameId: null,
        scores: {
            player1: { wins: 0, losses: 0, draws: 0 },
            player2: { wins: 0, losses: 0, draws: 0 }
        },
        starter: 'player1'
    };
    ws.roomCode = roomCode;
    ws.send(JSON.stringify({
        type: 'roomCreated',
        code: roomCode
    }));
}

function handleJoinRoom(ws, code) {
    const room = rooms[code];
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Room not found'
        }));
        return;
    }

    if (room.players.length >= 2) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Room is full'
        }));
        return;
    }

    room.players.push(ws);
    ws.roomCode = code;

    // Start the game when two players are in the room
    if (room.players.length === 2) {
        startGame(room);
    } else {
        ws.send(JSON.stringify({
            type: 'waitingInRoom',
            message: 'Waiting for another player...'
        }));
    }
}

function startGame(room) {
    const gameId = generateGameId();
    room.gameId = gameId;

    games[gameId] = {
        players: room.players,
        board: Array(9).fill(null),
        currentPlayer: 'X',
        gameOver: false,
        playerSymbols: {}
    };

    // Assign player symbols based on starter
    const starter = room.starter;
    const second = starter === 'player1' ? 'player2' : 'player1';
    room.players[0].id = starter;
    room.players[1].id = second;
    games[gameId].playerSymbols[starter] = 'X';
    games[gameId].playerSymbols[second] = 'O';

    // remember gameId on each websocket so moves can be associated
    room.players.forEach(ws => ws.gameId = gameId);

    // Send game start to both players
    room.players[0].send(JSON.stringify({
        type: 'gameStart',
        gameId: gameId,
        player: games[gameId].playerSymbols[room.players[0].id],
        opponent: games[gameId].playerSymbols[room.players[1].id]
    }));

    room.players[1].send(JSON.stringify({
        type: 'gameStart',
        gameId: gameId,
        player: games[gameId].playerSymbols[room.players[1].id],
        opponent: games[gameId].playerSymbols[room.players[0].id]
    }));

    broadcastGameState(gameId);
}

function handleMove(ws, data) {
    const gameId = ws.gameId;
    const game = games[gameId];
     // handling move

    if (!game) {
         // move ignored: no game
        return;
    }
    if (game.gameOver) {
         // move ignored: game over
        return;
    }
    if (game.currentPlayer !== game.playerSymbols[ws.id]) {
         // move ignored: wrong turn
        return;
    }

    const index = data.index;
    if (game.board[index] !== null) {
         // move ignored: cell occupied
        return;
    }

    game.board[index] = game.currentPlayer;
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

    if (checkWinner(game.board) || isBoardFull(game.board)) {
        game.gameOver = true;
        // Update scores
        const winner = checkWinner(game.board);
        const room = rooms[ws.roomCode];
        if (winner) {
            const winnerId = Object.keys(game.playerSymbols).find(id => game.playerSymbols[id] === winner);
            const loserId = Object.keys(game.playerSymbols).find(id => game.playerSymbols[id] !== winner);
            room.scores[winnerId].wins++;
            room.scores[loserId].losses++;
        } else {
            // Draw
            room.scores.player1.draws++;
            room.scores.player2.draws++;
        }
        // Alternate starter
        room.starter = room.starter === 'player1' ? 'player2' : 'player1';
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
    // Remove from room
    if (ws.roomCode) {
        const room = rooms[ws.roomCode];
        if (room) {
            const index = room.players.indexOf(ws);
            if (index > -1) {
                room.players.splice(index, 1);
            }

            // If room is empty, delete it
            if (room.players.length === 0) {
                delete rooms[ws.roomCode];
            } else if (room.gameId) {
                // Notify remaining player
                const remainingPlayer = room.players[0];
                remainingPlayer.send(JSON.stringify({
                    type: 'opponentDisconnected'
                }));
                delete games[room.gameId];
            }
        }
    }
}

function broadcastGameState(gameId) {
    const game = games[gameId];
    if (!game) return;

    const room = rooms[Object.keys(rooms).find(code => rooms[code].gameId === gameId)];
    const gameState = {
        type: 'gameState',
        board: game.board,
        currentPlayer: game.currentPlayer,
        gameOver: game.gameOver,
        winner: game.gameOver ? checkWinner(game.board) : null,
        scores: room.scores
    };
     // broadcasting state

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

function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}