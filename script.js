// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const PIECES = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟'
};
const PIECE_VALUES = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
const FILES = ['a','b','c','d','e','f','g','h'];

// Piece-square tables for evaluation (how good each square is for each piece)
const PST = {
  P: [
    0,  0,  0,  0,  0,  0,  0,  0,
   50, 50, 50, 50, 50, 50, 50, 50,
   10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
  ],
  N: [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50
  ],
  B: [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5, 10, 10,  5,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20
  ],
  R: [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
  ],
  Q: [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20
  ],
  K: [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
  ]
};

// ─── GAME STATE ──────────────────────────────────────────────────────────────
let board, turn, selected, validMoves, gameMode, difficulty;
let history = [], capturedByWhite = [], capturedByBlack = [];
let castlingRights, enPassantTarget, halfMoveClock, fullMoveNum;
let moveListData = [];
let promoResolve = null;
let gameActive = false;
let lastMove = null;
let selectedDiff = 'easy';

// ─── INIT BOARD ──────────────────────────────────────────────────────────────
function initBoard() {
  board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow = ['R','N','B','Q','K','B','N','R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = 'b' + backRow[c];
    board[1][c] = 'bP';
    board[6][c] = 'wP';
    board[7][c] = 'w' + backRow[c];
  }
  turn = 'w';
  selected = null;
  validMoves = [];
  history = [];
  capturedByWhite = [];
  capturedByBlack = [];
  castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  enPassantTarget = null;
  halfMoveClock = 0;
  fullMoveNum = 1;
  moveListData = [];
  lastMove = null;
  gameActive = true;
}

// ─── BUILD BOARD DOM ─────────────────────────────────────────────────────────
function buildBoardDOM() {
  const fl = (id) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    FILES.forEach(f => {
      const d = document.createElement('div');
      d.className = 'file-label'; d.textContent = f;
      el.appendChild(d);
    });
  };
  fl('fileLabelsTop'); fl('fileLabelsBot');

  const wrap = document.getElementById('boardRows');
  wrap.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    const row = document.createElement('div');
    row.className = 'board-row-wrap';

    const rl = document.createElement('div');
    rl.className = 'rank-label';
    rl.textContent = 8 - r;
    row.appendChild(rl);

    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;
      sq.addEventListener('click', () => handleClick(r, c));
      row.appendChild(sq);
    }

    const rl2 = document.createElement('div');
    rl2.className = 'rank-label';
    rl2.textContent = 8 - r;
    row.appendChild(rl2);

    wrap.appendChild(row);
  }
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function render() {
  const squares = document.querySelectorAll('.sq');
  const inCheckKing = isInCheck(turn);

  squares.forEach(sq => {
    const r = +sq.dataset.r, c = +sq.dataset.c;
    const piece = board[r][c];

    sq.className = 'sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

    if (lastMove && ((r === lastMove.fr && c === lastMove.fc) || (r === lastMove.tr && c === lastMove.tc))) {
      sq.classList.add('last-move');
    }
    if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');

    const isValid = validMoves.find(m => m[0] === r && m[1] === c);
    if (isValid) {
      sq.classList.add(piece && piece[0] !== turn ? 'valid-capture' : (piece ? 'valid-capture' : 'valid-move'));
    }
    if (inCheckKing && piece && piece[1] === 'K' && piece[0] === turn) sq.classList.add('in-check');

    sq.textContent = piece ? PIECES[piece] : '';
  });

  document.getElementById('capturedByWhite').textContent = capturedByWhite.map(p => PIECES[p]).join('');
  document.getElementById('capturedByBlack').textContent = capturedByBlack.map(p => PIECES[p]).join('');

  const dot = document.getElementById('turnDot');
  dot.className = 'turn-dot ' + (turn === 'w' ? 'white' : 'black');
  document.getElementById('turnLabel').textContent = (turn === 'w' ? 'White' : 'Black') + ' to move';

  renderMoveList();
}

function renderMoveList() {
  const ml = document.getElementById('moveList');
  ml.innerHTML = '';
  for (let i = 0; i < moveListData.length; i += 2) {
    const div = document.createElement('div');
    div.className = 'move-entry';
    div.innerHTML = `<span class="move-num">${i/2+1}.</span><span>${moveListData[i]||''}</span><span>${moveListData[i+1]||''}</span>`;
    ml.appendChild(div);
  }
  ml.scrollTop = ml.scrollHeight;
}

// ─── MOVE GENERATION ─────────────────────────────────────────────────────────
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function opponent(color) { return color === 'w' ? 'b' : 'w'; }

function pseudoMoves(b, r, c, ep) {
  const piece = b[r][c];
  if (!piece) return [];
  const [color, type] = [piece[0], piece[1]];
  const moves = [];
  const opp = opponent(color);
  const dir = color === 'w' ? -1 : 1;

  const slide = (deltas) => {
    for (const [dr, dc] of deltas) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        if (!b[nr][nc]) { moves.push([nr, nc]); }
        else { if (b[nr][nc][0] === opp) moves.push([nr, nc]); break; }
        nr += dr; nc += dc;
      }
    }
  };
  const jump = (deltas) => {
    for (const [dr, dc] of deltas) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && (!b[nr][nc] || b[nr][nc][0] === opp)) moves.push([nr, nc]);
    }
  };

  if (type === 'P') {
    if (!b[r + dir]?.[c]) {
      moves.push([r + dir, c]);
      const startRow = color === 'w' ? 6 : 1;
      if (r === startRow && !b[r + 2*dir]?.[c]) moves.push([r + 2*dir, c]);
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (inBounds(nr, nc)) {
        if (b[nr][nc]?.[0] === opp) moves.push([nr, nc]);
        if (ep && ep[0] === nr && ep[1] === nc) moves.push([nr, nc]);
      }
    }
  }
  else if (type === 'N') jump([[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]);
  else if (type === 'B') slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  else if (type === 'R') slide([[-1,0],[1,0],[0,-1],[0,1]]);
  else if (type === 'Q') slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  else if (type === 'K') jump([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);

  return moves;
}

function isSquareAttacked(b, r, c, byColor) {
  for (let pr = 0; pr < 8; pr++)
    for (let pc = 0; pc < 8; pc++)
      if (b[pr][pc]?.[0] === byColor)
        if (pseudoMoves(b, pr, pc, null).some(m => m[0] === r && m[1] === c)) return true;
  return false;
}

function isInCheck(color, b = board) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] === color + 'K')
        return isSquareAttacked(b, r, c, opponent(color));
  return false;
}

function applyMove(b, fr, fc, tr, tc, ep, cr, promoType = null) {
  const nb = b.map(row => [...row]);
  const piece = nb[fr][fc];
  const [color, type] = [piece[0], piece[1]];
  let newEp = null;
  let newCr = { ...cr };
  let captured = nb[tr][tc];

  if (type === 'P' && ep && tr === ep[0] && tc === ep[1]) {
    captured = nb[fr][tc];
    nb[fr][tc] = null;
  }
  if (type === 'P' && Math.abs(tr - fr) === 2) {
    newEp = [(fr + tr) / 2, tc];
  }
  if (type === 'K') {
    newCr[color + 'K'] = false;
    newCr[color + 'Q'] = false;
    if (fc === 4 && tc === 6) { nb[fr][5] = nb[fr][7]; nb[fr][7] = null; }
    if (fc === 4 && tc === 2) { nb[fr][3] = nb[fr][0]; nb[fr][0] = null; }
  }
  if (type === 'R') {
    if (fr === 7 && fc === 0) newCr.wQ = false;
    if (fr === 7 && fc === 7) newCr.wK = false;
    if (fr === 0 && fc === 0) newCr.bQ = false;
    if (fr === 0 && fc === 7) newCr.bK = false;
  }

  nb[tr][tc] = piece;
  nb[fr][fc] = null;

  if (type === 'P' && (tr === 0 || tr === 7)) {
    nb[tr][tc] = color + (promoType || 'Q');
  }

  return { nb, captured, newEp, newCr };
}

function getLegalMoves(b, r, c, ep, cr) {
  const piece = b[r][c];
  if (!piece) return [];
  const color = piece[0];
  const pseudo = pseudoMoves(b, r, c, ep);
  const legal = [];

  for (const [tr, tc] of pseudo) {
    const { nb } = applyMove(b, r, c, tr, tc, ep, cr);
    if (!isInCheck(color, nb)) legal.push([tr, tc]);
  }

  if (piece[1] === 'K' && !isInCheck(color, b)) {
    const row = color === 'w' ? 7 : 0;
    if (r === row && c === 4) {
      if (cr[color + 'K'] && !b[row][5] && !b[row][6] &&
          !isSquareAttacked(b, row, 5, opponent(color)) &&
          !isSquareAttacked(b, row, 6, opponent(color))) {
        legal.push([row, 6]);
      }
      if (cr[color + 'Q'] && !b[row][3] && !b[row][2] && !b[row][1] &&
          !isSquareAttacked(b, row, 3, opponent(color)) &&
          !isSquareAttacked(b, row, 2, opponent(color))) {
        legal.push([row, 2]);
      }
    }
  }

  return legal;
}

function getAllLegalMoves(b, color, ep, cr) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c]?.[0] === color)
        for (const [tr, tc] of getLegalMoves(b, r, c, ep, cr))
          moves.push({ fr: r, fc: c, tr, tc });
  return moves;
}

// ─── MOVE NOTATION ───────────────────────────────────────────────────────────
function toAN(fr, fc, tr, tc, piece, captured) {
  const typeChar = piece[1] !== 'P' ? piece[1] : '';
  const cap = captured ? 'x' : '';
  const from = piece[1] === 'P' && captured ? FILES[fc] : typeChar;
  return from + cap + FILES[tc] + (8 - tr);
}

// ─── CLICK HANDLER ───────────────────────────────────────────────────────────
async function handleClick(r, c) {
  if (!gameActive) return;
  if (gameMode === 'bot' && turn === 'b') return;

  const piece = board[r][c];

  if (selected) {
    const move = validMoves.find(m => m[0] === r && m[1] === c);
    if (move) {
      await executeMove(selected[0], selected[1], r, c);
      selected = null;
      validMoves = [];
      render();
      if (gameActive && gameMode === 'bot' && turn === 'b') {
        setTimeout(doBotMove, 300);
      }
      return;
    }
  }

  if (piece && piece[0] === turn) {
    selected = [r, c];
    validMoves = getLegalMoves(board, r, c, enPassantTarget, castlingRights);
  } else {
    selected = null;
    validMoves = [];
  }
  render();
}

// ─── EXECUTE MOVE ─────────────────────────────────────────────────────────────
async function executeMove(fr, fc, tr, tc, promoType = null) {
  const piece = board[fr][fc];
  const isPawnPromo = piece[1] === 'P' && (tr === 0 || tr === 7);

  if (isPawnPromo && !promoType) {
    promoType = await showPromo(piece[0]);
  }

  const { nb, captured, newEp, newCr } = applyMove(board, fr, fc, tr, tc, enPassantTarget, castlingRights, promoType);

  history.push({
    board: board.map(row => [...row]),
    turn, enPassantTarget, castlingRights: {...castlingRights},
    capturedByWhite: [...capturedByWhite],
    capturedByBlack: [...capturedByBlack],
    moveListData: [...moveListData],
    lastMove
  });

  const an = toAN(fr, fc, tr, tc, piece, captured) + (promoType && promoType !== 'Q' ? '='+promoType : '');
  moveListData.push(an);

  if (captured) {
    if (turn === 'w') capturedByWhite.push(captured);
    else capturedByBlack.push(captured);
  }

  board = nb;
  enPassantTarget = newEp;
  castlingRights = newCr;
  lastMove = { fr, fc, tr, tc };
  turn = opponent(turn);
  if (turn === 'w') fullMoveNum++;

  checkGameState();
}

// ─── GAME STATE CHECK ─────────────────────────────────────────────────────────
function checkGameState() {
  const allMoves = getAllLegalMoves(board, turn, enPassantTarget, castlingRights);
  const inCheck = isInCheck(turn);

  if (allMoves.length === 0) {
    gameActive = false;
    if (inCheck) {
      const winner = opponent(turn) === 'w' ? 'White' : 'Black';
      showOverlay('Checkmate!', `${winner} wins by checkmate! ♟`);
    } else {
      showOverlay('Stalemate!', 'The game is a draw by stalemate.');
    }
  } else {
    const s = inCheck
      ? (turn === 'w' ? '⚠ White is in Check!' : '⚠ Black is in Check!')
      : ((turn === 'w' ? 'White' : 'Black') + "'s turn");
    document.getElementById('statusText').textContent = s;
  }
}

// ─── BOT ─────────────────────────────────────────────────────────────────────
async function doBotMove() {
  if (!gameActive) return;
  document.getElementById('thinkingEl').classList.add('show');

  await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

  const depth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const move = getBestMove(board, 'b', depth, enPassantTarget, castlingRights);

  document.getElementById('thinkingEl').classList.remove('show');

  if (move) {
    await executeMove(move.fr, move.fc, move.tr, move.tc);
    selected = null;
    validMoves = [];
    render();
  }
}

function evaluateBoard(b) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      const [color, type] = [p[0], p[1]];
      const val = PIECE_VALUES[type] || 0;
      const pstRow = color === 'w' ? r : 7 - r;
      const pstVal = PST[type] ? PST[type][pstRow * 8 + c] : 0;
      score += (color === 'w' ? 1 : -1) * (val + pstVal);
    }
  }
  return score;
}

function minimax(b, depth, alpha, beta, maximizing, ep, cr) {
  if (depth === 0) return evaluateBoard(b);

  const color = maximizing ? 'w' : 'b';
  const moves = getAllLegalMoves(b, color, ep, cr);

  if (moves.length === 0) {
    if (isInCheck(color, b)) return maximizing ? -50000 : 50000;
    return 0;
  }

  if (difficulty === 'easy') moves.sort(() => Math.random() - 0.5);

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const { nb, newEp, newCr } = applyMove(b, m.fr, m.fc, m.tr, m.tc, ep, cr);
      best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false, newEp, newCr));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const { nb, newEp, newCr } = applyMove(b, m.fr, m.fc, m.tr, m.tc, ep, cr);
      best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true, newEp, newCr));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(b, color, depth, ep, cr) {
  const moves = getAllLegalMoves(b, color, ep, cr);
  if (!moves.length) return null;

  if (difficulty === 'easy') {
    if (Math.random() < 0.6) return moves[Math.floor(Math.random() * moves.length)];
    depth = 1;
  }

  let bestScore = Infinity;
  let best = moves[0];
  moves.sort(() => Math.random() - 0.5);

  for (const m of moves) {
    const { nb, newEp, newCr } = applyMove(b, m.fr, m.fc, m.tr, m.tc, ep, cr);
    const score = minimax(nb, depth - 1, -Infinity, Infinity, true, newEp, newCr);
    if (score < bestScore) { bestScore = score; best = m; }
  }
  return best;
}

// ─── PROMOTION ───────────────────────────────────────────────────────────────
function showPromo(color) {
  return new Promise(resolve => {
    promoResolve = resolve;
    const modal = document.getElementById('promoModal');
    const pp = document.getElementById('promoPieces');
    pp.innerHTML = '';
    ['Q', 'R', 'B', 'N'].forEach(t => {
      const btn = document.createElement('div');
      btn.className = 'promo-piece';
      btn.textContent = PIECES[color + t];
      btn.onclick = () => { modal.classList.remove('show'); resolve(t); };
      pp.appendChild(btn);
    });
    modal.classList.add('show');
  });
}

// ─── OVERLAYS ────────────────────────────────────────────────────────────────
function showOverlay(title, msg) {
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayMsg').textContent = msg;
  document.getElementById('overlay').classList.add('show');
}

// ─── UI CONTROLS ─────────────────────────────────────────────────────────────
function startGame(mode) {
  gameMode = mode;
  difficulty = selectedDiff;
  document.getElementById('modeScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'flex';
  document.getElementById('passBtn').style.display = mode === 'pass' ? 'block' : 'none';
  initBoard();
  buildBoardDOM();
  render();
}

function goToMenu() {
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('modeScreen').style.display = 'flex';
  document.getElementById('overlay').classList.remove('show');
}

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDiff = btn.dataset.diff;
  });
});

document.getElementById('btnBot').addEventListener('click', () => startGame('bot'));
document.getElementById('btnPass').addEventListener('click', () => startGame('pass'));

document.getElementById('undoBtn').addEventListener('click', () => {
  if (!history.length) return;
  const state = history.pop();
  if (gameMode === 'bot' && history.length > 0 && state.turn === 'b') {
    const prev = history.pop();
    board = prev.board.map(row => [...row]);
    turn = prev.turn;
    enPassantTarget = prev.enPassantTarget;
    castlingRights = prev.castlingRights;
    capturedByWhite = [...prev.capturedByWhite];
    capturedByBlack = [...prev.capturedByBlack];
    moveListData = [...prev.moveListData];
    lastMove = prev.lastMove;
  } else {
    board = state.board.map(row => [...row]);
    turn = state.turn;
    enPassantTarget = state.enPassantTarget;
    castlingRights = state.castlingRights;
    capturedByWhite = [...state.capturedByWhite];
    capturedByBlack = [...state.capturedByBlack];
    moveListData = [...state.moveListData];
    lastMove = state.lastMove;
  }
  gameActive = true;
  selected = null;
  validMoves = [];
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('statusText').textContent = (turn === 'w' ? 'White' : 'Black') + "'s turn";
  render();
});

document.getElementById('resignBtn').addEventListener('click', () => {
  if (!gameActive) return;
  gameActive = false;
  const winner = turn === 'w' ? 'Black' : 'White';
  showOverlay('Resigned!', `${turn === 'w' ? 'White' : 'Black'} resigned. ${winner} wins!`);
});

document.getElementById('newGameBtn').addEventListener('click', () => {
  document.getElementById('overlay').classList.remove('show');
  initBoard();
  render();
});

document.getElementById('passBtn').addEventListener('click', () => {
  if (!gameActive || gameMode !== 'pass') return;
  turn = opponent(turn);
  selected = null;
  validMoves = [];
  render();
});

document.getElementById('overlayNew').addEventListener('click', () => {
  document.getElementById('overlay').classList.remove('show');
  initBoard();
  render();
});

document.getElementById('overlayMenu').addEventListener('click', goToMenu);
