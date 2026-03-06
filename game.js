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
        
        if (this.board[index] || this.gameOver || this.currentPlayer !== 'X') {
            return;
        }

        this.board[index] = 'X';
        this.currentPlayer = 'O';
        this.render();

        if (this.checkWinner() || this.isBoardFull()) {
            this.gameOver = true;
            this.render();
            return;
        }

        // AI makes move after a slight delay for better UX
        setTimeout(() => this.aiMove(), 500);
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
        const winner = this.checkWinnerState();
        
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
                statusEl.textContent = '🎉 You Win!';
                statusEl.className = 'status winner';
            } else if (winner === 'O') {
                statusEl.textContent = '😢 AI Wins!';
                statusEl.className = 'status winner';
            } else if (this.isBoardFull()) {
                statusEl.textContent = "It's a Draw!";
                statusEl.className = 'status draw';
            }
        } else {
            statusEl.textContent = this.currentPlayer === 'X' ? 'Your turn (X)' : 'AI is thinking...';
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
