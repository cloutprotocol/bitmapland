import { emitter } from './emitter';

export const setupCanvas = (parent: HTMLElement) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get canvas context');
  }

  const parentRect = parent.getBoundingClientRect();

  canvas.width = parentRect.width;
  canvas.height = parentRect.height;

  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.cursor = 'move';

  const onResize = () => {
    const rect = parent.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    emitter.emit('draw');
  };

  window.addEventListener('resize', onResize);

  parent.appendChild(canvas);

  return {
    canvas,
    context,
  };
};
