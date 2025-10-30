
import { Chess, Move, Piece } from 'chess.js';
import { Difficulty } from '../types';

const pieceValues: { [key in 'p' | 'n' | 'b' | 'r' | 'q' | 'k']: number } = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

const difficultySettings: Record<Difficulty, { depth: number; errorRate: number }> = {
  beginner: { depth: 2, errorRate: 0.8 },
  intermediate: { depth: 3, errorRate: 0.5 },
  advanced: { depth: 3, errorRate: 0.2 },
  master: { depth: 4, errorRate: 0 },
};

// Piece-Square Tables (from White's perspective)
const pawnEvalWhite = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 27, 27, 10,  5,  5],
    [0,  0,  0, 25, 25,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-25,-25, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightEval = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopEvalWhite = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookEvalWhite = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenEval = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

// Simplified King evaluation for mid-game safety
const kingEvalWhite = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

// Mirrored tables for Black
const pawnEvalBlack = [...pawnEvalWhite].reverse();
const bishopEvalBlack = [...bishopEvalWhite].reverse();
const rookEvalBlack = [...rookEvalWhite].reverse();
const kingEvalBlack = [...kingEvalWhite].reverse();

const getPiecePositionalValue = (piece: Piece, rowIndex: number, colIndex: number): number => {
    switch (piece.type) {
        case 'p': return piece.color === 'w' ? pawnEvalWhite[rowIndex][colIndex] : pawnEvalBlack[rowIndex][colIndex];
        case 'n': return knightEval[rowIndex][colIndex];
        case 'b': return piece.color === 'w' ? bishopEvalWhite[rowIndex][colIndex] : bishopEvalBlack[rowIndex][colIndex];
        case 'r': return piece.color === 'w' ? rookEvalWhite[rowIndex][colIndex] : rookEvalBlack[rowIndex][colIndex];
        case 'q': return queenEval[rowIndex][colIndex];
        case 'k': return piece.color === 'w' ? kingEvalWhite[rowIndex][colIndex] : kingEvalBlack[rowIndex][colIndex];
        default: return 0;
    }
};

export const evaluateBoard = (game: Chess): number => {
  if (game.isCheckmate()) {
    // The side to move is checkmated.
    return game.turn() === 'b' ? Infinity : -Infinity;
  }
  if (game.isDraw()) {
    return 0;
  }

  let totalEvaluation = 0;
  game.board().forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece) {
        const materialValue = pieceValues[piece.type];
        const positionalValue = getPiecePositionalValue(piece, rowIndex, colIndex);
        const value = materialValue + positionalValue;
        totalEvaluation += value * (piece.color === 'w' ? 1 : -1);
      }
    });
  });
  return totalEvaluation;
};

const quiescence = (game: Chess, alpha: number, beta: number, isMaximizingPlayer: boolean): number => {
    const stand_pat = evaluateBoard(game);
    
    if (isMaximizingPlayer) {
        if (stand_pat >= beta) return beta;
        if (stand_pat > alpha) alpha = stand_pat;
    } else {
        if (stand_pat <= alpha) return alpha;
        if (stand_pat < beta) beta = stand_pat;
    }

    const captureMoves = game.moves({ verbose: true }).filter(move => move.flags.includes('c'));
    captureMoves.sort((a, b) => {
        const aScore = (pieceValues[a.captured!] || 0) - (pieceValues[a.piece] || 0);
        const bScore = (pieceValues[b.captured!] || 0) - (pieceValues[b.piece] || 0);
        return bScore - aScore;
    });

    for (const move of captureMoves) {
        game.move(move);
        const score = quiescence(game, alpha, beta, !isMaximizingPlayer);
        game.undo();

        if (isMaximizingPlayer) {
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        } else {
            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
    }

    return isMaximizingPlayer ? alpha : beta;
};


const minimax = (game: Chess, depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean): number => {
    if (depth === 0 || game.isGameOver()) {
        return quiescence(game, alpha, beta, isMaximizingPlayer);
    }

    const newGameMoves = game.moves({ verbose: true });
    
    // Move ordering
    newGameMoves.sort((a, b) => {
        let aScore = 0;
        let bScore = 0;

        if (a.flags.includes('c')) aScore += 10 * pieceValues[a.captured!] - pieceValues[a.piece];
        if (a.promotion) aScore += pieceValues[a.promotion! as 'q' | 'r' | 'b' | 'n'];

        if (b.flags.includes('c')) bScore += 10 * pieceValues[b.captured!] - pieceValues[b.piece];
        if (b.promotion) bScore += pieceValues[b.promotion! as 'q' | 'r' | 'b' | 'n'];
        
        return bScore - aScore;
    });


    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of newGameMoves) {
            game.move(move);
            const currentEval = minimax(game, depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, currentEval);
            alpha = Math.max(alpha, currentEval);
            if (beta <= alpha) {
                break;
            }
        }
        return maxEval;
    } else { // Minimizing player
        let minEval = Infinity;
        for (const move of newGameMoves) {
            game.move(move);
            const currentEval = minimax(game, depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, currentEval);
            beta = Math.min(beta, currentEval);
            if (beta <= alpha) {
                break;
            }
        }
        return minEval;
    }
};

export const findBestMoveForAnalysis = (game: Chess, depth: number): Promise<Move | null> => {
     return new Promise((resolve) => {
        // Use setTimeout to unblock UI thread during analysis
        setTimeout(() => {
            const newGameMoves = game.moves({ verbose: true });
            if (newGameMoves.length === 0) {
              resolve(null);
              return;
            }

            let bestMoveFound: Move = newGameMoves[0];
            const isMaximizing = game.turn() === 'w';
            let bestValue = isMaximizing ? -Infinity : Infinity;

            for (const move of newGameMoves) {
                const gameCopy = new Chess(game.fen());
                gameCopy.move(move);
                const boardValue = minimax(gameCopy, depth - 1, -Infinity, Infinity, !isMaximizing);
                
                if (isMaximizing) {
                    if (boardValue > bestValue) {
                        bestValue = boardValue;
                        bestMoveFound = move;
                    }
                } else {
                    if (boardValue < bestValue) {
                        bestValue = boardValue;
                        bestMoveFound = move;
                    }
                }
            }
            resolve(bestMoveFound);
        }, 0); 
    });
}

export const findComputerMove = (game: Chess, difficulty: Difficulty): Promise<Move | null> => {
    return new Promise((resolve) => {
        const settings = difficultySettings[difficulty];
        findBestMoveForAnalysis(game, settings.depth).then(bestMoveFound => {
            if (!bestMoveFound) {
                resolve(null);
                return;
            }
            const allMoves = game.moves({verbose: true});
            if (allMoves.length > 1 && Math.random() < settings.errorRate) {
                // Introduce an error by picking a random non-best move
                const nonBestMoves = allMoves.filter(m => m.san !== bestMoveFound.san);
                if(nonBestMoves.length > 0){
                    resolve(nonBestMoves[Math.floor(Math.random() * nonBestMoves.length)]);
                } else {
                    resolve(bestMoveFound); // fallback if there's no other move
                }
            } else {
                resolve(bestMoveFound);
            }
        })
    });
};

export const getEvaluation = (game: Chess): number => {
    const rawEval = evaluateBoard(game);
    // Convert to a pawn advantage value and clamp it for the UI.
    const pawnAdvantage = rawEval / 100;
    return Math.max(-10, Math.min(10, pawnAdvantage));
}
