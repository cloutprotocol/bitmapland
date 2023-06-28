const roundSquareRoot = (total: number) => {
  let idealX = 0;
  let idealY = 0;
  let smallestDiff = Infinity;

  for (let x = 1; x < total; x += 1) {
    const y = total / x;
    const diff = Math.abs(x - y);

    if (!(y % 1) && diff < smallestDiff) {
      smallestDiff = diff;
      idealX = x;
      idealY = y;
    }
  }

  return idealX > idealY ? idealX : idealY;
};

export const BLOCK_SIZE = 100;

export const MIN_DISTANCE_BLOCK = 10;
export const MIN_DISTANCE_BLOCK_LABEL = 35;

export const WINDOW_RADIUS_BLOCK = 100;
export const WINDOW_RADIUS_BLOCK_LABEL = 30;

export const COUNT_BLOCKS_PER_EPOCH = 210000;
export const COUNT_BLOCKS_PER_EPOCH_ROW = roundSquareRoot(
  COUNT_BLOCKS_PER_EPOCH
);
export const COUNT_COLUMNS_PER_EPOCH = Math.ceil(
  COUNT_BLOCKS_PER_EPOCH / COUNT_BLOCKS_PER_EPOCH_ROW
);
export const COUNT_BLOCKS_PER_ADJUSTMENT = 2016;

export const BLACK = '#181c1f';
export const WHITE = '#FFFFFF';
export const GREY = '#9D9D9D';
export const GREY_DARK = '#7D7D7D';
export const ORANGE = '#FF9500';
export const ORANGE_DARK = '#FF7E00';
export const BLUE = '#3490E6';
export const BLUE_GREY = '#95AABF';
export const GREEN = '#329239';
