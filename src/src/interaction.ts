import {
  COUNT_BLOCKS_PER_EPOCH_ROW,
  COUNT_COLUMNS_PER_EPOCH,
} from './constants';
import { emitter } from './emitter';
import { CanvasInfo, State } from './types';

interface LocState {
  lastTouches: {
    one: { x: number; y: number } | null;
    two: { x: number; y: number } | null;
  };
  lastMouse: {
    x: number;
    y: number;
  } | null;
  isMouseDown: boolean;
}

const clampZoom = (zoom: number, width: number) => {
  const clamped = Math.max(1, Math.min(200000 / width, zoom));

  return Math.round(clamped * 1000) / 1000;
};

export const handleLoc = (
  { canvas }: Pick<CanvasInfo, 'canvas'>,
  state: State
) => {
  const locState: LocState = {
    lastTouches: {
      one: null,
      two: null,
    },
    lastMouse: null,
    isMouseDown: false,
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const { deltaY } = event;

    state.loc.zoom = clampZoom(
      state.loc.zoom + state.loc.zoom * deltaY * -0.01,
      canvas.width
    );
    emitter.emit('draw');
  };

  canvas.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('resize', () => {
    state.loc.zoom = clampZoom(state.loc.zoom, canvas.width);
  });

  const touchStart = (event: TouchEvent) => {
    const [one, two] = event.touches;

    if (one) {
      locState.lastTouches.one = {
        x: one.clientX,
        y: one.clientY,
      };
    }

    if (two) {
      locState.lastTouches.two = {
        x: two.clientX,
        y: two.clientY,
      };
    }
  };

  const touchMove = (event: TouchEvent) => {
    event.preventDefault();
    const [one, two] = event.touches;

    if (one) {
      if (two) {
        if (locState.lastTouches.one && locState.lastTouches.two) {
          const lastDistance = Math.sqrt(
            Math.pow(
              locState.lastTouches.one.x - locState.lastTouches.two.x,
              2
            ) +
              Math.pow(
                locState.lastTouches.one.y - locState.lastTouches.two.y,
                2
              )
          );
          const currentDistance = Math.sqrt(
            Math.pow(one.clientX - two.clientX, 2) +
              Math.pow(one.clientY - two.clientY, 2)
          );

          state.loc.zoom = clampZoom(
            state.loc.zoom +
              state.loc.zoom * (lastDistance - currentDistance) * -0.01,
            canvas.width
          );
          emitter.emit('draw');
        }

        locState.lastTouches.two = {
          x: two.clientX,
          y: two.clientY,
        };
      } else if (locState.lastTouches.one) {
        const diffX = (one.clientX - locState.lastTouches.one.x) * 2;
        const diffY = (one.clientY - locState.lastTouches.one.y) * 2;

        state.loc.x = Math.max(
          Math.min(
            state.loc.x + (diffX / state.loc.zoom) * 2,
            COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs * 0.5
          ),
          COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs * -0.5
        );

        state.loc.y = Math.max(
          Math.min(
            state.loc.y + (diffY / state.loc.zoom) * 2,
            COUNT_COLUMNS_PER_EPOCH * 0.5
          ),
          COUNT_COLUMNS_PER_EPOCH * -0.5
        );

        emitter.emit('draw');
      }

      locState.lastTouches.one = {
        x: one.clientX,
        y: one.clientY,
      };
    }
  };

  const touchEnd = (event: TouchEvent | Event) => {
    if (!('touches' in event)) {
      locState.lastTouches.one = null;
      locState.lastTouches.two = null;
    } else {
      const [one, two] = event.touches;
      if (one) {
        locState.lastTouches.one = {
          x: one.clientX,
          y: one.clientY,
        };
      } else {
        locState.lastTouches.one = null;
      }

      if (two) {
        locState.lastTouches.two = {
          x: two.clientX,
          y: two.clientY,
        };
      } else {
        locState.lastTouches.two = null;
      }
    }
  };

  canvas.addEventListener('touchstart', touchStart, { passive: false });
  canvas.addEventListener('touchmove', touchMove, { passive: false });
  canvas.addEventListener('touchend', touchEnd, { passive: false });
  canvas.addEventListener('touchcancel', touchEnd, { passive: false });
  canvas.addEventListener('touchleave', touchEnd, { passive: false });

  const mouseDown = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }

    locState.isMouseDown = true;
    event.preventDefault();

    locState.lastMouse = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const mouseMove = (event: MouseEvent) => {
    if (locState.lastMouse && locState.isMouseDown) {
      const diffX = event.clientX - locState.lastMouse.x;
      const diffY = event.clientY - locState.lastMouse.y;

      state.loc.x = Math.max(
        Math.min(
          state.loc.x + (diffX / state.loc.zoom) * 2,
          COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs * 0.5
        ),
        COUNT_BLOCKS_PER_EPOCH_ROW * state.countEpochs * -0.5
      );

      state.loc.y = Math.max(
        Math.min(
          state.loc.y + (diffY / state.loc.zoom) * 2,
          COUNT_COLUMNS_PER_EPOCH * 0.5
        ),
        COUNT_COLUMNS_PER_EPOCH * -0.5
      );
      emitter.emit('draw');
    }

    locState.lastMouse = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const mouseUp = () => {
    locState.isMouseDown = false;
    locState.lastMouse = null;
  };

  canvas.addEventListener('mousedown', mouseDown, { passive: false });
  canvas.addEventListener('mousemove', mouseMove, { passive: false });
  canvas.addEventListener('mouseup', mouseUp, { passive: false });
  canvas.addEventListener('mouseleave', mouseUp, { passive: false });
};

export const handleMouseLoc = (
  { canvas }: Pick<CanvasInfo, 'canvas'>,
  state: State
) => {
  const mouseMove = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();

    if (rect) {
      state.mouseLoc = {
        x: Math.max(Math.min(event.clientX - rect.left, rect.right), 0),
        y: Math.max(Math.min(event.clientY - rect.top, rect.bottom), 0),
      };
      emitter.emit('draw');
    }
  };

  const mouseLeave = () => {
    state.mouseLoc = null;
    emitter.emit('draw');
  };

  canvas.addEventListener('mousedown', mouseMove, { passive: false });
  canvas.addEventListener('mousemove', mouseMove, { passive: false });
  canvas.addEventListener('mouseleave', mouseLeave, { passive: false });
};
