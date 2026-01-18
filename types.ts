
export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  CASHED_OUT = 'CASHED_OUT'
}

export interface GameState {
  totalCoins: number;
  currentPot: number;
  currentFloor: number;
  status: GameStatus;
  lastBet: number;
}

export interface FloorConfig {
  blocks: number;
  multiplier: number;
}
