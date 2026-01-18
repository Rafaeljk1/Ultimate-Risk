
import { FloorConfig } from './types';

export const INITIAL_COINS = 1000;
export const MIN_BET = 10;
export const MAX_FLOORS = 10;

// Configuração dos andares: quanto mais alto, mais blocos (maior risco)
export const TOWER_CONFIG: Record<number, FloorConfig> = {
  1: { blocks: 2, multiplier: 1.5 },
  2: { blocks: 2, multiplier: 2.2 },
  3: { blocks: 2, multiplier: 3.5 },
  4: { blocks: 2, multiplier: 5.0 },
  5: { blocks: 3, multiplier: 8.5 },
  6: { blocks: 3, multiplier: 15.0 },
  7: { blocks: 3, multiplier: 25.0 },
  8: { blocks: 3, multiplier: 40.0 },
  9: { blocks: 3, multiplier: 75.0 },
  10: { blocks: 3, multiplier: 150.0 },
};

export const STORAGE_KEY = 'tower_climber_data';
