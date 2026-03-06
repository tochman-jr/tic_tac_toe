class TicTacToe {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }

    handleCellClick(e) {
        const index = parseInt(e.target.dataset.index);
        
        if (this.board[index] || this.gameOver) {
            return;
        }

        this.board[index] = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.render();

        if (this.checkWinner() || this.isBoardFull()) {
            this.gameOver = true;
            this.render();
        }
    }

    checkWinner() {
        return this.checkWinnerState() !== null;
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
                statusEl.textContent = '🎉 Player X Wins!';
                statusEl.className = 'status winner';
            } else if (winner === 'O') {
                statusEl.textContent = '🎉 Player O Wins!';
                statusEl.className = 'status winner';
            } else if (this.isBoardFull()) {
                statusEl.textContent = "It's a Draw!";
                statusEl.className = 'status draw';
            }
        } else {
            const playerClass = this.currentPlayer === 'X' ? 'player-x' : 'player-o';
            statusEl.innerHTML = `Player <span class="${playerClass}">${this.currentPlayer}</span>'s Turn`;
            statusEl.className = 'status';
        }
    }

    reset() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.render();
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TicTacToe();
});
