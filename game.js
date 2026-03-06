class TicTacToe {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.player = null;
        this.opponent = null;
        this.gameId = null;
        this.ws = null;
        this.roomCode = null;
        this.init();
    }

    init() {
        this.setupMenuEventListeners();
        this.connectToServer();
    }

    connectToServer() {
        // For Netlify deployment, use polling instead of WebSockets
        this.usePolling = window.location.hostname !== 'localhost';
        
        if (this.usePolling) {
            this.startPolling();
        } else {
            this.connectWebSocket();
        }
    }

    connectWebSocket() {
        this.ws = new WebSocket('ws://localhost:3000');

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.showMessage('Connected! Choose an option below.');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.showMessage('Disconnected from server. Refresh to reconnect.');
            this.showMenu();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showMessage('Connection error. Please check if the server is running.');
        };
    }

    startPolling() {
        // Polling implementation for static hosting
        this.pollingInterval = setInterval(() => {
            if (this.gameId) {
                this.pollGameState();
            }
        }, 1000); // Poll every second
        
        this.showMessage('Connected! Choose an option below.');
    }

    async pollGameState() {
        try {
            const response = await fetch(`/api/game/${this.gameId}`);
            if (response.ok) {
                const data = await response.json();
                this.handleServerMessage(data);
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    async createRoom() {
        if (this.usePolling) {
            try {
                const response = await fetch('/api/rooms', { method: 'POST' });
                const data = await response.json();
                this.handleServerMessage(data);
            } catch (error) {
                this.showMessage('Error creating room. Please try again.');
            }
        } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'createRoom' }));
        }
        document.getElementById('createRoomBtn').disabled = true;
        document.getElementById('joinRoomBtn').disabled = true;
        this.showMessage('Creating room...');
    }

    async joinRoom() {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (!code) {
            this.showMessage('Please enter a room code.');
            return;
        }

        if (this.usePolling) {
            try {
                const response = await fetch(`/api/rooms/${code}`, { method: 'POST' });
                const data = await response.json();
                this.handleServerMessage(data);
            } catch (error) {
                this.showMessage('Error joining room. Please check the code.');
            }
        } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'joinRoom', code: code }));
        }
        document.getElementById('createRoomBtn').disabled = true;
        document.getElementById('joinRoomBtn').disabled = true;
        this.showMessage('Joining room...');
    }

    handleCellClick(e) {
        if (this.usePolling) {
            if (!this.gameId) return;
            
            const index = parseInt(e.target.dataset.index);
            if (this.board[index] || this.gameOver || this.currentPlayer !== this.player) {
                return;
            }

            fetch(`/api/game/${this.gameId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: index })
            }).catch(error => console.error('Move error:', error));
        } else {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.gameId) {
                return;
            }

            const index = parseInt(e.target.dataset.index);

            if (this.board[index] || this.gameOver || this.currentPlayer !== this.player) {
                return;
            }

            this.ws.send(JSON.stringify({
                type: 'move',
                index: index
            }));
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
        }
    }

    showMenu() {
        document.getElementById('menu').classList.remove('hidden');
        document.getElementById('game').classList.add('hidden');
    }

    showGame() {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('game').classList.remove('hidden');
    }

    handleCellClick(e) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.gameId) {
            return;
        }

        const index = parseInt(e.target.dataset.index);

        if (this.board[index] || this.gameOver || this.currentPlayer !== this.player) {
            return;
        }

        this.ws.send(JSON.stringify({
            type: 'move',
            index: index
        }));
    }

    render() {
        const cells = document.querySelectorAll('.cell');
        const statusEl = document.getElementById('status');

        cells.forEach((cell, index) => {
            cell.textContent = this.board[index];
            cell.className = 'cell';
            if (this.board[index] === 'X') {
                cell.classList.add('x');
            } else if (this.board[index] === 'O') {
                cell.classList.add('o');
            }
        });

        if (this.gameOver) {
            const winner = this.checkWinnerState();
            if (winner === 'X') {
                statusEl.textContent = `🎉 Player ${winner} Wins!`;
                statusEl.className = 'status winner';
            } else if (winner === 'O') {
                statusEl.textContent = `🎉 Player ${winner} Wins!`;
                statusEl.className = 'status winner';
            } else if (this.isBoardFull()) {
                statusEl.textContent = "It's a Draw!";
                statusEl.className = 'status draw';
            }
        } else if (this.currentPlayer && this.player) {
            const playerClass = this.currentPlayer === 'X' ? 'player-x' : 'player-o';
            const isMyTurn = this.currentPlayer === this.player;
            statusEl.innerHTML = `Player <span class="${playerClass}">${this.currentPlayer}</span>'s Turn ${isMyTurn ? '(Your turn)' : ''}`;
            statusEl.className = 'status';
        }
    }

    checkWinnerState() {
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
