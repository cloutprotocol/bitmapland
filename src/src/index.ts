/*!
LICENSE: UNLICENSED

This code is the sole property of the copyright holder named below.
No person or entity may use any part of this code without explicit written permission.
Permission may be revoked at any time with written notice.

Copyright Bitmap Dev
https://bitmap.land
https://github.com/bitmapdev
https://twitter.com/bitmapdev
*/
import { io } from 'socket.io-client';

import { setupCanvas } from './canvas';
import {
  BLACK,
  BLOCK_SIZE,
  COUNT_BLOCKS_PER_ADJUSTMENT,
  COUNT_BLOCKS_PER_EPOCH,
  COUNT_BLOCKS_PER_EPOCH_ROW,
  COUNT_COLUMNS_PER_EPOCH,
  GREY,
  GREY_DARK,
  MIN_DISTANCE_BLOCK,
  MIN_DISTANCE_BLOCK_LABEL,
  ORANGE,
  ORANGE_DARK,
  WHITE,
  WINDOW_RADIUS_BLOCK,
  WINDOW_RADIUS_BLOCK_LABEL,
} from './constants';
import { createDB, DBStore, getDBValue, setDBValue } from './db';
import { emitter } from './emitter';
import { handleLoc, handleMouseLoc } from './interaction';
import {
  BitmapOptions,
  BitmapsLengthResponse,
  CanvasInfo,
  InscribedBitmapsResponse,
  LatestBlockResponse,
  Response,
  ResponseFunction,
  State,
} from './types';
import { getIndex, isEvenAdjustment, logError } from './utils';

const trac = io('https://bitmap.trac.network', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 500,
  randomizationFactor: 0,
});

const state: State = {
  countTotalBlocks: 0,
  countClaimedBlocks: 0,
  countEpochs: 0,
  loc: {
    zoom: 1,
    x: 0,
    y: 0,
  },
  mouseLoc: null,
  claimed: {},
  requested: {},
};

createDB().then((db) => {
  getDBValue(db, DBStore.CLAIMED).then((claimed) => {
    state.claimed = Object.assign(claimed, state.claimed);
    emitter.emit('draw');

    emitter.on('claimed', () => {
      setDBValue(db, DBStore.CLAIMED, state.claimed);
    });
  });

  getDBValue(db, DBStore.REQUESTED_2).then((requested) => {
    state.requested = Object.assign(requested, state.requested);
    emitter.emit('draw');

    emitter.on('requested', () => {
      setDBValue(db, DBStore.REQUESTED_2, state.requested);
    });
  });
});

trac.on('error', (error: unknown) => {
  logError(error);
});

trac.on('response', (response: Response) => {
  const handlers = {
    [ResponseFunction.LATEST_BLOCK]: (data: LatestBlockResponse) => {
      const prevCountTotalBlocks = state.countTotalBlocks;
      state.countTotalBlocks = data.result;
      state.countEpochs = Math.ceil(
        state.countTotalBlocks / COUNT_BLOCKS_PER_EPOCH
      );
      if (prevCountTotalBlocks !== state.countTotalBlocks) {
        emitter.emit('draw');
      }
    },
    [ResponseFunction.BITMAPS_LENGTH]: (data: BitmapsLengthResponse) => {
      state.countClaimedBlocks = data.result;
      emitter.emit('count');
    },
    [ResponseFunction.INSCRIBED_BITMAPS]: (data: InscribedBitmapsResponse) => {
      Object.assign(
        state.claimed,
        Object.fromEntries(
          Object.entries(data.result).map(([key, value]) => {
            return [key, !!value];
          })
        )
      );
      emitter.emit('draw');
      emitter.emit('claimed');
      emitter.emit('count');
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlers[response.func](response as any);
});

const getBitmapsLength = () => {
  trac.emit('get', {
    func: 'bitmapsLength',
    args: [],
    call_id: '',
  });
};

const getLatestBlock = () => {
  trac.emit('get', {
    func: 'latestBlock',
    args: [],
    call_id: '',
  });
};

const getInscribedBitmaps = (numbers: readonly number[]) => {
  const now = state.countTotalBlocks;

  numbers.forEach((num) => {
    state.requested[num] = now;
  });
  emitter.emit('requested');

  trac.emit('get', {
    func: 'inscribedBitmaps',
    args: [numbers],
    call_id: '',
  });
};

const getBitmapsInArea = () => {
  if (state.loc.zoom >= MIN_DISTANCE_BLOCK) {
    const centerX =
      Math.round(state.loc.x) * -1 +
      COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs * 0.5;
    const centerY =
      Math.round(state.loc.y) * -1 + COUNT_COLUMNS_PER_EPOCH * 0.5;

    const rootX = Math.max(
      Math.min(
        centerX - WINDOW_RADIUS_BLOCK,
        COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs - WINDOW_RADIUS_BLOCK * 2
      ),
      0
    );
    const rootY = Math.max(
      Math.min(
        centerY - WINDOW_RADIUS_BLOCK,
        COUNT_COLUMNS_PER_EPOCH - WINDOW_RADIUS_BLOCK * 2
      ),
      0
    );

    const windowWidthBlock = WINDOW_RADIUS_BLOCK * 2;
    const blocksToRequest: number[] = [];

    for (let x = rootX; x < rootX + windowWidthBlock; x += 1) {
      for (let y = rootY; y < rootY + windowWidthBlock; y += 1) {
        const index = getIndex(x, y);

        const requested = state.requested[index];

        if (
          index < state.countTotalBlocks &&
          !state.claimed[index] &&
          (typeof requested === 'undefined' ||
            state.countTotalBlocks > requested)
        ) {
          blocksToRequest.push(index);
        }
      }
    }

    if (blocksToRequest.length) {
      blocksToRequest
        .reduce<number[][]>(
          (acc, index) => {
            const lastArray = acc[acc.length - 1];

            if (lastArray && lastArray.length < 5000) {
              lastArray.push(index);
            } else {
              acc.push([index]);
            }

            return acc;
          },
          [[]]
        )
        .forEach((chunk) => {
          getInscribedBitmaps(chunk);
        });
    }
  }
};

const clearCanvas = ({
  canvas,
  context,
  width,
  height,
  backgroundColor,
}: CanvasInfo) => {
  canvas.width = width;
  context.fillStyle = backgroundColor ?? BLACK;
  context.fillRect(0, 0, width, height);
};

const scaleAndOffset = ({ context, width, height, scale }: CanvasInfo) => {
  context.translate(width * 0.5, height * 0.5);
  context.scale(scale, scale);
  context.translate(
    (-(state.countEpochs * 0.5 * COUNT_BLOCKS_PER_EPOCH_ROW) + state.loc.x) *
      BLOCK_SIZE,
    (-COUNT_COLUMNS_PER_EPOCH * 0.5 + state.loc.y) * BLOCK_SIZE
  );
};

const drawEpochs = ({ context, scale }: CanvasInfo) => {
  context.fillStyle = ORANGE;
  context.strokeStyle = BLACK;
  context.lineWidth = 1 / scale;

  for (let epochIndex = 0; epochIndex < state.countEpochs; epochIndex += 1) {
    context.fillStyle = ORANGE;
    context.fillRect(
      epochIndex * COUNT_BLOCKS_PER_EPOCH_ROW * BLOCK_SIZE,
      0,
      COUNT_BLOCKS_PER_EPOCH_ROW * BLOCK_SIZE,
      COUNT_COLUMNS_PER_EPOCH * BLOCK_SIZE
    );
    context.strokeRect(
      epochIndex * COUNT_BLOCKS_PER_EPOCH_ROW * BLOCK_SIZE,
      0,
      COUNT_BLOCKS_PER_EPOCH_ROW * BLOCK_SIZE,
      COUNT_COLUMNS_PER_EPOCH * BLOCK_SIZE
    );
  }
};

const drawBlocks = ({ context }: CanvasInfo) => {
  const blockAlpha = Math.max(
    Math.min((state.loc.zoom - MIN_DISTANCE_BLOCK) / 10, 1),
    0
  );
  const labelAlpha = Math.max(
    Math.min((state.loc.zoom - MIN_DISTANCE_BLOCK_LABEL) / 10, 1),
    0
  );
  context.save();
  context.globalAlpha = blockAlpha;

  getBitmapsInArea();

  if (state.loc.zoom >= MIN_DISTANCE_BLOCK) {
    const centerX =
      Math.round(state.loc.x) * -1 +
      COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs * 0.5;
    const centerY =
      Math.round(state.loc.y) * -1 + COUNT_COLUMNS_PER_EPOCH * 0.5;

    const rootX = Math.max(
      Math.min(
        centerX - WINDOW_RADIUS_BLOCK,
        COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs - WINDOW_RADIUS_BLOCK * 2
      ),
      0
    );
    const rootY = Math.max(
      Math.min(
        centerY - WINDOW_RADIUS_BLOCK,
        COUNT_COLUMNS_PER_EPOCH - WINDOW_RADIUS_BLOCK * 2
      ),
      0
    );

    const windowWidthBlock = WINDOW_RADIUS_BLOCK * 2;

    for (let x = rootX; x < rootX + windowWidthBlock; x += 1) {
      for (let y = rootY; y < rootY + windowWidthBlock; y += 1) {
        const index = getIndex(x, y);
        const isClaimed = !!state.claimed[index];

        const orange = isEvenAdjustment(index) ? ORANGE_DARK : ORANGE;
        const grey = isEvenAdjustment(index) ? GREY_DARK : GREY;

        context.fillStyle = isClaimed ? orange : grey;
        context.fillRect(
          x * BLOCK_SIZE,
          y * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );

        if (
          state.loc.zoom >= MIN_DISTANCE_BLOCK_LABEL &&
          x >= centerX - WINDOW_RADIUS_BLOCK_LABEL - 1 &&
          x <= centerX + WINDOW_RADIUS_BLOCK_LABEL &&
          y >= centerY - WINDOW_RADIUS_BLOCK_LABEL - 1 &&
          y <= centerY + WINDOW_RADIUS_BLOCK_LABEL
        ) {
          context.save();
          context.globalAlpha = labelAlpha;
          context.fillStyle = WHITE;
          context.font = `${BLOCK_SIZE * 0.2}px arial`;
          context.textBaseline = 'middle';
          context.textAlign = 'center';
          context.fillText(
            `${index}`,
            (x + 0.5) * BLOCK_SIZE,
            (y + 0.5) * BLOCK_SIZE
          );
          context.restore();
        }
      }
    }
  }

  context.restore();
};

const drawAdjustments = ({ context }: CanvasInfo) => {
  for (let epochIndex = 0; epochIndex < state.countEpochs; epochIndex += 1) {
    const carriedOffset =
      COUNT_BLOCKS_PER_ADJUSTMENT -
      ((epochIndex * COUNT_BLOCKS_PER_EPOCH) % COUNT_BLOCKS_PER_ADJUSTMENT);
    let offset =
      carriedOffset === 0 ? COUNT_BLOCKS_PER_ADJUSTMENT : carriedOffset;
    let x = 0;
    let y = 0;

    while (y < COUNT_COLUMNS_PER_EPOCH) {
      const w = Math.min(COUNT_BLOCKS_PER_EPOCH_ROW - x, offset - x);

      const index = getIndex(epochIndex * COUNT_BLOCKS_PER_EPOCH_ROW + x, y);

      context.fillStyle = isEvenAdjustment(index) ? ORANGE_DARK : ORANGE;

      context.fillRect(
        (epochIndex * COUNT_BLOCKS_PER_EPOCH_ROW + x) * BLOCK_SIZE,
        y * BLOCK_SIZE,
        w * BLOCK_SIZE,
        BLOCK_SIZE
      );

      if (x + w >= COUNT_BLOCKS_PER_EPOCH_ROW) {
        x = 0;
        y += 1;
      } else {
        x += w;
      }

      offset -= w;

      if (offset <= 0) {
        offset = COUNT_BLOCKS_PER_ADJUSTMENT;
      }
    }
  }
};

const drawGrid = ({ context, scale }: CanvasInfo) => {
  context.save();
  context.globalAlpha = Math.max(Math.min(state.loc.zoom / 10 - 0.1, 1), 0);

  for (let y = 0; y < COUNT_COLUMNS_PER_EPOCH; y += 1) {
    context.beginPath();
    context.moveTo(0, y * BLOCK_SIZE);
    context.lineTo(
      state.countEpochs * COUNT_BLOCKS_PER_EPOCH_ROW * BLOCK_SIZE,
      y * BLOCK_SIZE
    );
    context.stroke();
  }

  for (let x = 0; x < COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs; x += 1) {
    if (x % COUNT_BLOCKS_PER_EPOCH_ROW === 0) {
      context.lineWidth = 3 / scale;
    } else {
      context.lineWidth = 1 / scale;
    }
    context.beginPath();
    context.moveTo(x * BLOCK_SIZE, 0);
    context.lineTo(x * BLOCK_SIZE, COUNT_COLUMNS_PER_EPOCH * BLOCK_SIZE);
    context.stroke();
  }
  context.restore();
};

// const drawHover = ({ context, width, height, scale }: CanvasInfo) => {
//   const blockAlpha = Math.max(
//     Math.min((state.loc.zoom - MIN_DISTANCE_BLOCK) / 10, 1),
//     0
//   );
//   context.save();
//   context.globalAlpha = blockAlpha;

//   if (state.loc.zoom >= MIN_DISTANCE_BLOCK) {
//     const centerX =
//       Math.round(state.loc.x) * -1 +
//       COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs * 0.5;
//     const centerY =
//       Math.round(state.loc.y) * -1 + COUNT_COLUMNS_PER_EPOCH * 0.5;

//     const rootX = Math.max(
//       Math.min(
//         centerX - WINDOW_RADIUS_BLOCK,
//         COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs - WINDOW_RADIUS_BLOCK * 2
//       ),
//       0
//     );
//     const rootY = Math.max(
//       Math.min(
//         centerY - WINDOW_RADIUS_BLOCK,
//         COUNT_COLUMNS_PER_EPOCH - WINDOW_RADIUS_BLOCK * 2
//       ),
//       0
//     );

//     const mouseX = state.mouseLoc?.x;
//     const mouseY = state.mouseLoc?.y;

//     if (typeof mouseX === 'number' && typeof mouseY === 'number') {
//       const mouseXScaled =
//         ((mouseX - width * 0.5) / scale +
//           (state.countEpochs * 0.5 * COUNT_BLOCKS_PER_EPOCH_ROW - state.loc.x) *
//             BLOCK_SIZE) /
//         BLOCK_SIZE;
//       const mouseYScaled =
//         ((mouseY - height * 0.5) / scale +
//           (COUNT_COLUMNS_PER_EPOCH * 0.5 - state.loc.y) * BLOCK_SIZE) /
//         BLOCK_SIZE;

//       for (let x = rootX; x < rootX + WINDOW_RADIUS_BLOCK * 2; x += 1) {
//         for (let y = rootY; y < rootY + WINDOW_RADIUS_BLOCK * 2; y += 1) {
//           if (
//             x >= mouseXScaled - 1 &&
//             x < mouseXScaled &&
//             y >= mouseYScaled - 1 &&
//             y < mouseYScaled
//           ) {
//             context.strokeStyle = WHITE;
//             context.lineWidth = 2 / scale;
//             context.strokeRect(
//               x * BLOCK_SIZE,
//               y * BLOCK_SIZE,
//               BLOCK_SIZE,
//               BLOCK_SIZE
//             );
//           }
//         }
//       }
//     }
//   }

//   context.restore();
// };

const epochRangeCanvases: HTMLCanvasElement[] = [];
const epochNumberCanvases: HTMLCanvasElement[] = [];

const drawEpochLabels = ({ context, width, scale }: CanvasInfo) => {
  const shouldWrap = width < 560 && state.loc.zoom < 1.5;
  context.fillStyle = WHITE;
  context.font = `${(BLOCK_SIZE * 0.15) / scale}px arial`;
  context.textBaseline = 'bottom';
  context.textAlign = 'left';

  for (let epochIndex = 0; epochIndex < state.countEpochs; epochIndex += 1) {
    const epochRangeCanvas =
      epochRangeCanvases[epochIndex] ?? document.createElement('canvas');
    epochRangeCanvases[epochIndex] = epochRangeCanvas;
    epochRangeCanvas.width = 300;
    epochRangeCanvas.height = 60;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const epochRangeContext = epochRangeCanvas.getContext('2d')!;
    epochRangeContext.fillStyle = WHITE;
    epochRangeContext.font = '20px arial';
    epochRangeContext.textBaseline = 'bottom';
    epochRangeContext.textAlign = 'left';

    if (shouldWrap) {
      epochRangeContext.fillText(
        `${epochIndex * COUNT_BLOCKS_PER_EPOCH} -`,
        0,
        epochRangeCanvas.height * 0.5
      );
      epochRangeContext.fillText(
        `${Math.min(
          (epochIndex + 1) * COUNT_BLOCKS_PER_EPOCH - 1,
          state.countTotalBlocks - 1
        )}`,
        0,
        epochRangeCanvas.height
      );
    } else {
      epochRangeContext.fillText(
        `${epochIndex * COUNT_BLOCKS_PER_EPOCH} - ${Math.min(
          (epochIndex + 1) * COUNT_BLOCKS_PER_EPOCH - 1,
          state.countTotalBlocks - 1
        )}`,
        0,
        epochRangeCanvas.height
      );
    }

    const rangeScale = 0.7;

    context.drawImage(
      epochRangeCanvas,
      epochIndex * COUNT_BLOCKS_PER_EPOCH_ROW * BLOCK_SIZE,
      -((epochRangeCanvas.height * rangeScale) / scale + 5 / scale),
      (epochRangeCanvas.width * rangeScale) / scale,
      (epochRangeCanvas.height * rangeScale) / scale
    );

    const epochNumberCanvas =
      epochNumberCanvases[epochIndex] ?? document.createElement('canvas');
    epochNumberCanvases[epochIndex] = epochNumberCanvas;
    epochNumberCanvas.width = 300;
    epochNumberCanvas.height = 300;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const epochNumberContext = epochNumberCanvas.getContext('2d')!;
    epochNumberContext.fillStyle = WHITE;
    epochNumberContext.font = '250px arial';
    epochNumberContext.textBaseline = 'middle';
    epochNumberContext.textAlign = 'center';

    epochNumberContext.fillText(
      `${epochIndex + 1}`,
      epochNumberCanvas.width * 0.5,
      epochNumberCanvas.height * 0.5
    );

    const numberScale = 50;

    context.save();
    context.globalAlpha = Math.max(Math.min(2 - state.loc.zoom, 1), 0);
    context.drawImage(
      epochNumberCanvas,
      (epochIndex + 0.5) * COUNT_BLOCKS_PER_EPOCH_ROW * BLOCK_SIZE -
        epochNumberCanvas.width * 0.5 * numberScale,
      0.5 * COUNT_COLUMNS_PER_EPOCH * BLOCK_SIZE -
        epochNumberCanvas.height * 0.5 * numberScale,
      epochNumberCanvas.width * numberScale,
      epochNumberCanvas.height * numberScale
    );
    context.restore();
  }
};

const clipArea = ({ context, backgroundColor }: CanvasInfo) => {
  const epochIndex = Math.floor(
    state.countTotalBlocks / COUNT_BLOCKS_PER_EPOCH
  );
  const epochOffset = epochIndex * COUNT_BLOCKS_PER_EPOCH_ROW;
  const blocksInThisEpoch = state.countTotalBlocks % COUNT_BLOCKS_PER_EPOCH;
  const y = Math.floor(blocksInThisEpoch / COUNT_BLOCKS_PER_EPOCH_ROW);
  const rowOffset = blocksInThisEpoch % COUNT_BLOCKS_PER_EPOCH_ROW;
  const x = epochOffset + rowOffset;
  const w = COUNT_BLOCKS_PER_EPOCH_ROW - rowOffset;

  const padding = 10;
  context.beginPath();

  if (w) {
    context.moveTo(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
    context.lineTo(x * BLOCK_SIZE, y * BLOCK_SIZE);
    context.lineTo(
      (epochOffset + COUNT_BLOCKS_PER_EPOCH_ROW + padding) * BLOCK_SIZE,
      y * BLOCK_SIZE
    );
  } else {
    context.moveTo(
      (epochOffset + COUNT_BLOCKS_PER_EPOCH_ROW + padding) * BLOCK_SIZE,
      (y + 1) * BLOCK_SIZE
    );
  }

  context.lineTo(
    (epochOffset + COUNT_BLOCKS_PER_EPOCH_ROW + padding) * BLOCK_SIZE,
    (COUNT_COLUMNS_PER_EPOCH + padding) * BLOCK_SIZE
  );
  context.lineTo(
    epochOffset * BLOCK_SIZE,
    (COUNT_COLUMNS_PER_EPOCH + padding) * BLOCK_SIZE
  );
  context.lineTo(epochOffset * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
  context.closePath();
  context.fillStyle = backgroundColor ?? BLACK;
  context.fill();
};

const draw = ({
  canvas,
  context,
  backgroundColor,
}: Pick<CanvasInfo, 'canvas' | 'context' | 'backgroundColor'>) => {
  const minScale =
    canvas.width / (state.countEpochs * COUNT_BLOCKS_PER_EPOCH_ROW * 1.1);
  const scale = Math.round(minScale * state.loc.zoom * 1000) / 100000;
  const { width, height } = canvas;

  const info = {
    canvas,
    context,
    width,
    height,
    scale,
    backgroundColor,
  };

  clearCanvas(info);
  scaleAndOffset(info);
  drawEpochs(info);
  drawAdjustments(info);
  drawBlocks(info);
  drawGrid(info);
  // drawHover(info);
  clipArea(info);
  drawEpochLabels(info);
};

declare global {
  interface Window {
    renderBitmapTo: (
      element: HTMLElement | null,
      options?: BitmapOptions
    ) => void;
  }
}

window.renderBitmapTo = (element, options) => {
  try {
    if (!element) {
      throw new Error(`Expected an HTML element but received: ${element}`);
    }

    const { canvas, context } = setupCanvas(element);

    const countElement = document.getElementById('count');

    if (countElement) {
      emitter.on('count', () => {
        if (state.countClaimedBlocks && state.countTotalBlocks) {
          countElement.textContent = `${state.countClaimedBlocks} / ${state.countTotalBlocks} (claimed / blocks)`;
        }
      });
    }

    trac.connect();

    getLatestBlock();
    getBitmapsLength();

    window.setInterval(() => {
      getLatestBlock();
      getBitmapsLength();
    }, 1000);

    const boundDraw = () =>
      draw({ canvas, context, backgroundColor: options?.backgroundColor });

    const onDraw = () => {
      window.requestAnimationFrame(boundDraw);
    };

    emitter.on('draw', onDraw);

    handleLoc({ canvas }, state);
    handleMouseLoc({ canvas }, state);

    emitter.emit('draw');
  } catch (error) {
    return logError(error);
  }
};
