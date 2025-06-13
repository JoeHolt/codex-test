class Piece {
  constructor(color) {
    this.color = color; // 'w' or 'b'
  }
  possibleMoves(board, x, y) {
    return [];
  }
}

class King extends Piece {
  constructor(color) {
    super(color);
    this.type = 'k';
  }
  possibleMoves(board, x, y) {
    const deltas = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    return deltas
      .map(d => [x + d[0], y + d[1]])
      .filter(([nx, ny]) => board.inBounds(nx, ny) && !board.isColor(nx, ny, this.color));
  }
}

class Queen extends Piece {
  constructor(color) {
    super(color);
    this.type = 'q';
  }
  possibleMoves(board, x, y) {
    return board.rayMoves(x, y, this.color, [
      [1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]
    ]);
  }
}

class Rook extends Piece {
  constructor(color) {
    super(color);
    this.type = 'r';
  }
  possibleMoves(board, x, y) {
    return board.rayMoves(x, y, this.color, [[1,0],[-1,0],[0,1],[0,-1]]);
  }
}

class Bishop extends Piece {
  constructor(color) {
    super(color);
    this.type = 'b';
  }
  possibleMoves(board, x, y) {
    return board.rayMoves(x, y, this.color, [[1,1],[1,-1],[-1,1],[-1,-1]]);
  }
}

class Knight extends Piece {
  constructor(color) {
    super(color);
    this.type = 'n';
  }
  possibleMoves(board, x, y) {
    const deltas = [
      [1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]
    ];
    return deltas
      .map(d => [x+d[0], y+d[1]])
      .filter(([nx, ny]) => board.inBounds(nx, ny) && !board.isColor(nx, ny, this.color));
  }
}

class Pawn extends Piece {
  constructor(color) {
    super(color);
    this.type = 'p';
  }
  possibleMoves(board, x, y) {
    const dir = this.color === 'w' ? -1 : 1;
    let moves = [];
    let nx = x + dir;
    if (board.inBounds(nx, y) && board.isEmpty(nx, y)) {
      moves.push([nx, y]);
      // double move
      if ((this.color === 'w' && x === 6) || (this.color === 'b' && x === 1)) {
        nx = x + dir*2;
        if (board.isEmpty(nx, y)) moves.push([nx, y]);
      }
    }
    // captures
    [[dir,1],[dir,-1]].forEach(d => {
      const cx = x + d[0], cy = y + d[1];
      if (board.inBounds(cx, cy)) {
        if (!board.isEmpty(cx, cy) && !board.isColor(cx, cy, this.color)) {
          moves.push([cx, cy]);
        }
        // en passant
        if (board.canEnPassant(cx, cy, this.color)) {
          moves.push([cx, cy]);
        }
      }
    });
    return moves;
  }
}

class Board {
  constructor() {
    this.grid = [];
    for (let i = 0; i < 8; i++) {
      this.grid[i] = new Array(8).fill(null);
    }
    this.enPassant = null; // square that can be captured en passant
    this.castling = { w: {K: true, Q: true}, b: {K: true, Q: true} };
    this.reset();
  }

  reset() {
    // set up pieces
    const back = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook];
    for (let i = 0; i < 8; i++) {
      this.grid[0][i] = new back[i]('b');
      this.grid[1][i] = new Pawn('b');
      this.grid[6][i] = new Pawn('w');
      this.grid[7][i] = new back[i]('w');
    }
    for (let i = 2; i < 6; i++) {
      for (let j = 0; j < 8; j++) {
        this.grid[i][j] = null;
      }
    }
  }

  inBounds(x, y) {
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  isEmpty(x, y) {
    return this.inBounds(x, y) && this.grid[x][y] === null;
  }

  isColor(x, y, color) {
    return this.inBounds(x, y) && this.grid[x][y] && this.grid[x][y].color === color;
  }

  piece(x, y) {
    return this.inBounds(x, y) ? this.grid[x][y] : null;
  }

  rayMoves(x, y, color, dirs) {
    const moves = [];
    for (const d of dirs) {
      let nx = x + d[0], ny = y + d[1];
      while (this.inBounds(nx, ny)) {
        if (this.isEmpty(nx, ny)) {
          moves.push([nx, ny]);
        } else {
          if (!this.isColor(nx, ny, color)) moves.push([nx, ny]);
          break;
        }
        nx += d[0];
        ny += d[1];
      }
    }
    return moves;
  }

  canEnPassant(x, y, color) {
    if (!this.enPassant) return false;
    const [ex, ey] = this.enPassant;
    return x === ex && y === ey && !this.isColor(x, y, color);
  }

  movePiece(fromX, fromY, toX, toY) {
    const piece = this.piece(fromX, fromY);
    if (!piece) return false;
    const moves = piece.possibleMoves(this, fromX, fromY);
    const valid = moves.some(([mx, my]) => mx === toX && my === toY);
    if (!valid) return false;

    let captured = this.piece(toX, toY);
    // handle en passant
    if (piece.type === 'p' && this.enPassant && toX === this.enPassant[0] && toY === this.enPassant[1]) {
      captured = this.piece(fromX, toY);
      this.grid[fromX][toY] = null; // capture pawn
    }
    // handle castling
    if (piece.type === 'k' && Math.abs(toY - fromY) === 2) {
      if (toY > fromY) { // king side
        const rook = this.piece(fromX,7);
        this.grid[fromX][5] = rook;
        this.grid[fromX][7] = null;
      } else { // queen side
        const rook = this.piece(fromX,0);
        this.grid[fromX][3] = rook;
        this.grid[fromX][0] = null;
      }
      this.castling[piece.color].K = false;
      this.castling[piece.color].Q = false;
    }
    // update enPassant
    this.enPassant = null;
    if (piece.type === 'p' && Math.abs(toX - fromX) === 2) {
      this.enPassant = [(fromX + toX)/2, fromY];
    }
    // move
    this.grid[toX][toY] = piece;
    this.grid[fromX][fromY] = null;
    // pawn promotion
    if (piece.type === 'p' && (toX === 0 || toX === 7)) {
      this.grid[toX][toY] = new Queen(piece.color); // auto promote to queen
    }
    // update castling rights
    if (piece.type === 'k') {
      this.castling[piece.color].K = false;
      this.castling[piece.color].Q = false;
    }
    if (piece.type === 'r') {
      if (fromY === 0) this.castling[piece.color].Q = false;
      if (fromY === 7) this.castling[piece.color].K = false;
    }
    return captured;
  }
}

class Game {
  constructor() {
    this.board = new Board();
    this.turn = 'w';
    this.selected = null; // [x, y]
    this.captured = { w: [], b: [] };
    this.render();
  }

  render() {
    const container = document.getElementById('board');
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const cell = document.createElement('div');
        cell.className = `cell ${(i+j)%2===0 ? 'white':'black'}`;
        cell.dataset.x = i;
        cell.dataset.y = j;
        const piece = this.board.piece(i,j);
        if (piece) {
          cell.textContent = this.symbol(piece);
        }
        cell.addEventListener('click', (e)=>this.clickCell(e));
        container.appendChild(cell);
      }
    }
    this.updateStatus();
    this.updateCaptured();
  }

  symbol(piece) {
    const symbols = {
      'p': {'w': '\u2659', 'b': '\u265F'},
      'r': {'w': '\u2656', 'b': '\u265C'},
      'n': {'w': '\u2658', 'b': '\u265E'},
      'b': {'w': '\u2657', 'b': '\u265D'},
      'q': {'w': '\u2655', 'b': '\u265B'},
      'k': {'w': '\u2654', 'b': '\u265A'}
    };
    return symbols[piece.type][piece.color];
  }

  pieceValue(type) {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    return values[type] || 0;
  }

  clickCell(e) {
    const x = parseInt(e.currentTarget.dataset.x);
    const y = parseInt(e.currentTarget.dataset.y);
    if (this.selected) {
      const captured = this.board.movePiece(this.selected[0], this.selected[1], x, y);
      if (captured !== false) {
        if (captured) this.captured[this.turn].push(captured);
        this.turn = this.turn === 'w' ? 'b' : 'w';
      }
      this.selected = null;
      this.render();
    } else {
      const piece = this.board.piece(x, y);
      if (piece && piece.color === this.turn) {
        this.selected = [x, y];
        this.highlightMoves(piece.possibleMoves(this.board, x, y));
      }
    }
  }

  highlightMoves(moves) {
    this.render();
    const container = document.getElementById('board');
    for (const [x,y] of moves) {
      const index = x*8 + y;
      const cell = container.children[index];
      cell.classList.add('highlight');
    }
  }

  updateStatus() {
    document.getElementById('status').textContent = this.turn === 'w' ? "White's move" : "Black's move";
  }

  updateCaptured() {
    ['w','b'].forEach(color => {
      const el = document.getElementById(color === 'w' ? 'white-captured' : 'black-captured');
      el.textContent = this.captured[color].map(p => this.symbol(p)).join(' ');
      const score = this.captured[color].reduce((s,p)=>s+this.pieceValue(p.type),0);
      document.getElementById(color === 'w' ? 'white-score' : 'black-score').textContent = score;
    });
  }
}

window.onload = () => new Game();
