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
        // reset visibility
        const onlineChoice = document.getElementById('onlineChoice');
        const hostSettings = document.getElementById('hostSettings');
        const joinSettings = document.getElementById('joinSettings');
        if (onlineChoice) onlineChoice.classList.remove('hidden');
        if (hostSettings) hostSettings.classList.add('hidden');
        if (joinSettings) joinSettings.classList.add('hidden');

        // only set up listeners and connect once per visit
        if (!this._onlineMenuReady) {
            this._onlineMenuReady = true;
            this.setupOnlineMenuEventListeners();
        }
        this.connectToServer();
    }

    setupOnlineMenuEventListeners() {
        const hostBtn = document.getElementById('hostChoiceBtn');
        const joinBtn = document.getElementById('joinChoiceBtn');
        const onlineChoice = document.getElementById('onlineChoice');
        const hostSettings = document.getElementById('hostSettings');
        const joinSettings = document.getElementById('joinSettings');

        if (hostBtn) hostBtn.addEventListener('click', () => {
            if (onlineChoice) onlineChoice.classList.add('hidden');
            if (hostSettings) hostSettings.classList.remove('hidden');
            if (joinSettings) joinSettings.classList.add('hidden');
            // ensure buttons are enabled when showing host settings
            const createBtn = document.getElementById('createRoomBtn');
            const joinRoomBtn = document.getElementById('joinRoomBtn');
            if (createBtn) createBtn.disabled = false;
            if (joinRoomBtn) joinRoomBtn.disabled = false;
        });

        if (joinBtn) joinBtn.addEventListener('click', () => {
            if (onlineChoice) onlineChoice.classList.add('hidden');
            if (joinSettings) joinSettings.classList.remove('hidden');
            if (hostSettings) hostSettings.classList.add('hidden');
            // ensure buttons are enabled when showing join settings and focus input
            const createBtn = document.getElementById('createRoomBtn');
            const joinRoomBtn = document.getElementById('joinRoomBtn');
            if (createBtn) createBtn.disabled = false;
            if (joinRoomBtn) joinRoomBtn.disabled = false;
            const roomInput = document.getElementById('roomCodeInput');
            if (roomInput) roomInput.focus();
        });

        const createBtn = document.getElementById('createRoomBtn');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.createRoom());
                createBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.createRoom(); });
            }
            if (joinRoomBtn) {
                joinRoomBtn.addEventListener('click', () => { console.log('[UI] joinRoomBtn clicked'); this.joinRoom(); });
                joinRoomBtn.addEventListener('touchstart', (e) => { e.preventDefault(); console.log('[UI] joinRoomBtn touchstart'); this.joinRoom(); });
            }

        const roomInput = document.getElementById('roomCodeInput');
            if (roomInput) roomInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.code === 'Enter') {
                    e.preventDefault();
                    this.joinRoom();
                }
            });

        const copyBtn = document.getElementById('copyRoomCodeBtn');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            const codeEl = document.getElementById('roomCodeDisplay');
            if (codeEl && codeEl.textContent) {
                navigator.clipboard && navigator.clipboard.writeText(codeEl.textContent).then(() => {
                    this.showMessage('Room code copied to clipboard');
                }).catch(() => {
                    this.showMessage('Copy failed — select and copy manually');
                });
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
        // close any existing connection before opening a new one
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            this.ws.onclose = null; // prevent the close handler showing 'Disconnected'
            this.ws.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const wsUrl = `${protocol}//${host}${port}`;

        // disable action buttons until connection is established
        const createBtn = document.getElementById('createRoomBtn');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (createBtn) createBtn.disabled = true;
        if (joinRoomBtn) joinRoomBtn.disabled = true;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.showMessage('Connected! Choose an option below.');
            console.log('[WS] connection opened');
            // enable buttons now that socket is ready
            if (createBtn) createBtn.disabled = false;
            if (joinRoomBtn) joinRoomBtn.disabled = false;
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
            console.log('[WS] connection closed', event);
        };

        this.ws.onerror = (error) => {
            this.showMessage('Connection error. Please check if the server is running.');
            console.error('[WS] connection error', error);
        };
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

    setupEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }

    createRoom() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // read optional matchCount from UI (if present)
            const matchEl = document.getElementById('matchCountInput');
            let matchCount = null;
            if (matchEl) {
                const v = parseInt(matchEl.value, 10);
                if (!isNaN(v) && v > 0) matchCount = v;
            }

            const payload = { type: 'createRoom' };
            if (matchCount) payload.matchCount = matchCount;

            // generate a room code client-side and show it immediately
            const generated = Math.random().toString(36).substr(2, 6).toUpperCase();
            const hostRoomCode = document.getElementById('hostRoomCode');
            const codeDisplay = document.getElementById('roomCodeDisplay');
            if (codeDisplay) codeDisplay.textContent = generated;
            if (hostRoomCode) hostRoomCode.classList.remove('hidden');

            // send desiredCode to server so server can use it if available
            payload.desiredCode = generated;
            console.log('[WS] creating room, payload=', payload);
            this.ws.send(JSON.stringify(payload));

            // start a timeout: if no roomCreated arrives, notify host
            if (this._roomCreateTimeout) clearTimeout(this._roomCreateTimeout);
            this._roomCreateTimeout = setTimeout(() => {
                const codeDisplay = document.getElementById('roomCodeDisplay');
                if (codeDisplay && codeDisplay.textContent === 'Waiting...') {
                    this.showMessage('No response from server — try again');
                    console.warn('[WS] createRoom timed out waiting for roomCreated');
                    const hostRoomCode = document.getElementById('hostRoomCode');
                    if (hostRoomCode) hostRoomCode.classList.add('hidden');
                    document.getElementById('createRoomBtn').disabled = false;
                    document.getElementById('joinRoomBtn').disabled = false;
                }
            }, 10000);
            document.getElementById('createRoomBtn').disabled = true;
            document.getElementById('joinRoomBtn').disabled = true;
            this.showMessage('Creating room...');
        }
    }

    joinRoom() {
        const codeEl = document.getElementById('roomCodeInput');
        const code = codeEl ? codeEl.value.trim().toUpperCase() : '';
        console.log('[UI] joinRoom requested, code=', code, 'ws=', this.ws && this.ws.readyState);
        if (!code) {
            this.showMessage('Please enter a room code.');
            if (codeEl) codeEl.focus();
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'joinRoom', code: code }));
            document.getElementById('createRoomBtn').disabled = true;
            document.getElementById('joinRoomBtn').disabled = true;
            this.showMessage('Joining room...');
        } else {
            this.showMessage('Not connected to server.');
        }
    }

    handleServerMessage(data) {
        console.log('[WS] handling server message', data);
        switch (data.type) {
            case 'roomCreated':
                this.roomCode = data.code;
                this.showMessage(`Room created! Share this code: ${this.roomCode}`);
                // show the code in both join input and host display (if present)
                const joinInput = document.getElementById('roomCodeInput');
                if (joinInput) joinInput.value = this.roomCode;

                const codeDisplay = document.getElementById('roomCodeDisplay');
                const hostRoomCode = document.getElementById('hostRoomCode');
                const hostSettings = document.getElementById('hostSettings');
                const onlineChoice = document.getElementById('onlineChoice');
                if (codeDisplay) codeDisplay.textContent = this.roomCode;
                if (hostRoomCode) hostRoomCode.classList.remove('hidden');
                if (hostSettings) hostSettings.classList.remove('hidden');
                if (onlineChoice) onlineChoice.classList.add('hidden');
                // clear create-room timeout
                if (this._roomCreateTimeout) {
                    clearTimeout(this._roomCreateTimeout);
                    this._roomCreateTimeout = null;
                }
                break;
            case 'waitingInRoom':
                this.showMessage(data.message);
                break;
            case 'gameStart': {
                const isNewSession = this.gameMode !== 'online';
                this.gameMode = 'online';
                // Preserve scores display across rounds — only reset board/state
                this.board = Array(9).fill(null);
                this.currentPlayer = 'X';
                this.gameOver = false;
                this.gameId = data.gameId;
                this.player = data.player;       // may have switched (X <-> O)
                this.opponent = data.opponent;
                if (isNewSession) {
                    this.showGame();
                    if (!this._gameBound) {
                        this._gameBound = true;
                        this.setupEventListeners();
                    }
                }
                this.render();
                this.showMessage(`Round started — you are ${this.player}`);
                break;
            }
            case 'gameState':
                console.log('[WS] gameState received', data);
                this.board = data.board;
                this.currentPlayer = data.currentPlayer;
                this.gameOver = data.gameOver;
                if (data.scores) {
                    this.renderScores(data.scores);
                }
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

        console.log('[click] index=', index, 'board_val=', this.board[index], 'gameOver=', this.gameOver, 'gameMode=', this.gameMode, 'ws=', this.ws && this.ws.readyState, 'gameId=', this.gameId, 'currentPlayer=', this.currentPlayer, 'player=', this.player);

        if (this.board[index]) {
            console.warn('[click] cell occupied, ignoring');
            return;
        }

        if (this.gameOver) {
            console.warn('[click] game is over, ignoring');
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
        const winLine = this.getWinLine();

        cells.forEach((cell, index) => {
            cell.className = 'cell';
            const val = this.board[index];
            if (val === 'X') {
                cell.classList.add('x');
                cell.textContent = 'X';
            } else if (val === 'O') {
                cell.classList.add('o');
                cell.textContent = 'O';
            } else {
                cell.textContent = '';
            }
            if (winLine && winLine.includes(index)) {
                cell.classList.add('winner-cell');
            }
        });

        if (this.gameOver) {
            const winner = this.checkWinner();
            if (winner) {
                if (this.gameMode === 'ai' && winner === 'O') {
                    statusEl.textContent = 'AI Wins!';
                } else if (this.gameMode === 'online') {
                    statusEl.textContent = `Player ${winner} Wins!`;
                } else {
                    statusEl.textContent = `Player ${winner} Wins!`;
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
        const lbl = document.getElementById('modeLabel');
        if (lbl) lbl.textContent = `MODE:${this.gameMode ? this.gameMode.toUpperCase() : '--'}`;
    }

    backToMenu() {
        const wasOnline = this.gameMode === 'online';
        this.resetGame();
        document.getElementById('scores').style.display = 'none';
        if (wasOnline) {
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

    renderScores(scores) {
        document.getElementById('scores').style.display = 'flex';
        document.getElementById('player1Score').textContent = `Player X: ${scores.player1.wins}W ${scores.player1.losses}L ${scores.player1.draws}D`;
        document.getElementById('player2Score').textContent = `Player O: ${scores.player2.wins}W ${scores.player2.losses}L ${scores.player2.draws}D`;
    }

    getWinLine() {
        const lines = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        for (const line of lines) {
            const [a,b,c] = line;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return line;
            }
        }
        return null;
    }

    showMessage(msg) {
        const onMenu = !document.getElementById('menuScreen').classList.contains('hidden');
        const menuMsg = document.getElementById('message');
        const gameStatus = document.getElementById('status');
        if (onMenu && menuMsg) {
            menuMsg.textContent = msg;
        } else if (gameStatus) {
            gameStatus.textContent = msg;
            gameStatus.className = 'status';
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TicTacToe();
});
