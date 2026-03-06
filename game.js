class TicTacToe {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.gameMode = null; // 'ai', 'local', 'online'
        this.player = null;
        this.opponent = null;
        this.gameId = null;
        this.ws = null;
        this.roomCode = null;
        this.init();
    }

    init() {
        this.setupMainMenuEventListeners();
        this.showMainMenu();
    }

    setupMainMenuEventListeners() {
        document.getElementById('aiBtn').addEventListener('click', () => this.startAIMode());
        document.getElementById('localBtn').addEventListener('click', () => this.startLocalMode());
        document.getElementById('onlineBtn').addEventListener('click', () => this.showOnlineMenu());
        document.getElementById('backToMainBtn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.backToMenu());
    }

    showMainMenu() {
        document.getElementById('menuScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('onlineMenu').classList.add('hidden');
        this.gameMode = null;
    }

    showOnlineMenu() {
        document.getElementById('menuScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('onlineMenu').classList.remove('hidden');
        this.setupOnlineMenuEventListeners();
        this.connectToServer();
    }

    setupOnlineMenuEventListeners() {
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.joinRoom());
        document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });
    }

    startAIMode() {
        this.gameMode = 'ai';
        this.resetGame();
        this.showGame();
        this.setupGameEventListeners();
        this.showMessage('Your turn (X)');
    }

    startLocalMode() {
        this.gameMode = 'local';
        this.resetGame();
        this.showGame();
        this.setupGameEventListeners();
        this.showMessage(`Player ${this.currentPlayer}'s Turn`);
    }

    connectToServer() {
        // Connect to Railway WebSocket server
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const wsUrl = `${protocol}//${host}${port}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.showMessage('Connected! Choose an option below.');
        };

        this.ws.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (err) {
                console.error('[WS] failed to parse message', err);
                return;
            }
            this.handleServerMessage(data);
        };

        this.ws.onclose = (event) => {
            this.showMessage('Disconnected from server. Refresh to reconnect.');
            this.showMainMenu();
        };

        this.ws.onerror = (error) => {
            this.showMessage('Connection error. Please check if the server is running.');
        };
    }

    createRoom() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'createRoom' }));
            document.getElementById('createRoomBtn').disabled = true;
            document.getElementById('joinRoomBtn').disabled = true;
            this.showMessage('Creating room...');
        }
    }

    joinRoom() {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (!code) {
            this.showMessage('Please enter a room code.');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'joinRoom', code: code }));
            document.getElementById('createRoomBtn').disabled = true;
            document.getElementById('joinRoomBtn').disabled = true;
            this.showMessage('Joining room...');
        }
    }



    aiMove() {
        const bestMove = this.getBestMove();
        this.board[bestMove] = 'O';
        this.currentPlayer = 'X';
        this.render();

        if (this.checkWinner() || this.isBoardFull()) {
            this.gameOver = true;
            this.render();
        }
    }

    getBestMove() {
        // Use minimax algorithm for unbeatable AI
        let bestScore = -Infinity;
        let move = 0;

        for (let i = 0; i < 9; i++) {
            if (this.board[i] === null) {
                this.board[i] = 'O';
                let score = this.minimax(0, false);
                this.board[i] = null;

                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    minimax(depth, isMaximizing) {
        const winner = this.checkWinner();

        if (winner === 'O') return 10 - depth;
        if (winner === 'X') return depth - 10;
        if (this.isBoardFull()) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (this.board[i] === null) {
                    this.board[i] = 'O';
                    let score = this.minimax(depth + 1, false);
                    this.board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (this.board[i] === null) {
                    this.board[i] = 'X';
                    let score = this.minimax(depth + 1, true);
                    this.board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    setupMenuEventListeners() {
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.joinRoom());
        document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });
    }

    setupEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }

    createRoom() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'createRoom' }));
            document.getElementById('createRoomBtn').disabled = true;
            document.getElementById('joinRoomBtn').disabled = true;
            this.showMessage('Creating room...');
        }
    }

    joinRoom() {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (!code) {
            this.showMessage('Please enter a room code.');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'joinRoom', code: code }));
            document.getElementById('createRoomBtn').disabled = true;
            document.getElementById('joinRoomBtn').disabled = true;
            this.showMessage('Joining room...');
        }
    }

    handleServerMessage(data) {
        console.log('[WS] handling server message', data);
        switch (data.type) {
            case 'roomCreated':
                this.roomCode = data.code;
                this.showMessage(`Room created! Share this code: ${this.roomCode}`);
                document.getElementById('roomCodeInput').value = this.roomCode;
                break;
            case 'waitingInRoom':
                this.showMessage(data.message);
                break;
            case 'gameStart':
                this.gameMode = 'online';
                this.resetGame();                     // clear any prior state
                this.gameId = data.gameId;
                this.player = data.player;
                this.opponent = data.opponent;
                this.showGame();
                this.setupEventListeners();
                this.showMessage(`Game started! You are ${this.player}`);
                break;
            case 'gameState':
                this.board = data.board;
                this.currentPlayer = data.currentPlayer;
                this.gameOver = data.gameOver;
                this.render();
                break;
            case 'opponentDisconnected':
                this.showMessage('Opponent disconnected. Game ended.');
                this.gameOver = true;
                this.render();
                break;
            case 'error':
                this.showMessage(data.message);
                document.getElementById('createRoomBtn').disabled = false;
                document.getElementById('joinRoomBtn').disabled = false;
                break;
            default:
                console.warn('[WS] unknown message type', data.type);
        }
    }


    handleCellClick(e) {
        const index = parseInt(e.target.dataset.index);

        if (this.board[index] || this.gameOver) {
            return;
        }

        if (this.gameMode === 'online') {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.gameId || this.currentPlayer !== this.player) {
                return;
            }
            const msg = { type: 'move', index };
            console.log('[WS] sending move', msg);
            this.ws.send(JSON.stringify(msg));
        } else if (this.gameMode === 'local') {
            this.board[index] = this.currentPlayer;
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            this.render();

            if (this.checkWinner() || this.isBoardFull()) {
                this.gameOver = true;
                this.render();
            }
        } else if (this.gameMode === 'ai') {
            if (this.currentPlayer !== 'X') {
                return; // Not player's turn
            }
            this.board[index] = 'X';
            this.currentPlayer = 'O';
            this.render();

            if (this.checkWinner() || this.isBoardFull()) {
                this.gameOver = true;
                this.render();
            } else {
                // AI's turn
                setTimeout(() => this.aiMove(), 500);
            }
        }
    }

    render() {
        const cells = document.querySelectorAll('.cell');
        const statusEl = document.getElementById('status');

        cells.forEach((cell, index) => {
            cell.className = 'cell';
            const val = this.board[index];
            if (val === 'X') {
                cell.classList.add('x');
                cell.innerHTML = '<i class="fa fa-times"></i>';
            } else if (val === 'O') {
                cell.classList.add('o');
                cell.innerHTML = '<i class="fa fa-circle-o"></i>';
            } else {
                cell.innerHTML = '';
            }
        });

        if (this.gameOver) {
            const winner = this.checkWinner();
            if (winner) {
                if (this.gameMode === 'ai' && winner === 'O') {
                    statusEl.textContent = '😢 AI Wins!';
                } else if (this.gameMode === 'online') {
                    statusEl.textContent = `🎉 Player ${winner} Wins!`;
                } else {
                    statusEl.textContent = `🎉 Player ${winner} Wins!`;
                }
                statusEl.className = 'status winner';
            } else if (this.isBoardFull()) {
                statusEl.textContent = "It's a Draw!";
                statusEl.className = 'status draw';
            }
        } else {
            if (this.gameMode === 'ai') {
                statusEl.textContent = this.currentPlayer === 'X' ? 'Your turn (X)' : 'AI is thinking...';
            } else if (this.gameMode === 'online' && this.player) {
                const playerClass = this.currentPlayer === 'X' ? 'player-x' : 'player-o';
                const isMyTurn = this.currentPlayer === this.player;
                statusEl.innerHTML = `Player <span class="${playerClass}">${this.currentPlayer}</span>'s Turn ${isMyTurn ? '(Your turn)' : ''}`;
            } else {
                statusEl.textContent = `Player ${this.currentPlayer}'s Turn`;
            }
            statusEl.className = 'status';
        }
    }

    checkWinner() {
        const lines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6]
        ];

        for (let line of lines) {
            const [a, b, c] = line;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return this.board[a];
            }
        }
        return null;
    }

    isBoardFull() {
        return this.board.every(cell => cell !== null);
    }

    reset() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'reset' }));
        }
    }

    showGame() {
        document.getElementById('menuScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
    }

    backToMenu() {
        this.resetGame();
        if (this.gameMode === 'online') {
            this.showOnlineMenu();
        } else {
            this.showMainMenu();
        }
    }

    resetGame() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.gameId = null;
        this.player = null;
        this.opponent = null;
        this.render();
    }

    setupGameEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            if (this.gameMode === 'online') {
                this.reset();
            }
            this.resetGame();
        });
    }

    showMessage(message) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = 'status';
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TicTacToe();
});
