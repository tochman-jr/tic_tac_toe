class TicTacToe {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.player = null;
        this.opponent = null;
        this.gameId = null;
        this.ws = null;
        this.init();
    }

    init() {
        this.connectToServer();
        this.setupEventListeners();
        this.render();
    }

    connectToServer() {
        this.ws = new WebSocket('ws://localhost:3000');

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.ws.send(JSON.stringify({ type: 'join' }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.showMessage('Disconnected from server. Refresh to reconnect.');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'waiting':
                this.showMessage(data.message);
                break;
            case 'gameStart':
                this.gameId = data.gameId;
                this.player = data.player;
                this.opponent = data.opponent;
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
        }
    }

    setupEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
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
