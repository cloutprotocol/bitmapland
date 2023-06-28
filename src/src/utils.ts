import {
  COUNT_BLOCKS_PER_ADJUSTMENT,
  COUNT_BLOCKS_PER_EPOCH,
  COUNT_BLOCKS_PER_EPOCH_ROW,
} from './constants';

export const isEvenAdjustment = (index: number) => {
  const adjustmentNumber = Math.floor(index / COUNT_BLOCKS_PER_ADJUSTMENT);

  return !!(adjustmentNumber % 2);
};

export const getIndex = (x: number, y: number) => {
  return (
    y * COUNT_BLOCKS_PER_EPOCH_ROW +
    Math.floor(x / COUNT_BLOCKS_PER_EPOCH_ROW) * COUNT_BLOCKS_PER_EPOCH +
    (x % COUNT_BLOCKS_PER_EPOCH_ROW)
  );
};

export const logError = (error: unknown) => {
  if (window.console && window.console.error) {
    window.console.error(error);
  }
};
