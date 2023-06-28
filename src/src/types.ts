export enum ResponseFunction {
  LATEST_BLOCK = 'latestBlock',
  BITMAPS_LENGTH = 'bitmapsLength',
  INSCRIBED_BITMAPS = 'inscribedBitmaps',
}

export interface BitmapsLengthResponse {
  args: [];
  call_id: string;
  error: string;
  func: ResponseFunction.BITMAPS_LENGTH;
  result: number;
}

export interface LatestBlockResponse {
  args: [];
  call_id: string;
  error: string;
  func: ResponseFunction.LATEST_BLOCK;
  result: number;
}

export interface InscribedBitmapsResponse {
  args: readonly number[];
  call_id: string;
  error: string;
  func: ResponseFunction.INSCRIBED_BITMAPS;
  result: {
    [i: number]: null | {
      id: string;
      number: string;
    };
  };
}

export type Response =
  | BitmapsLengthResponse
  | LatestBlockResponse
  | InscribedBitmapsResponse;

export interface CanvasInfo {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  backgroundColor: string | undefined;
}

export interface State {
  countTotalBlocks: number;
  countClaimedBlocks: number;
  countEpochs: number;
  loc: {
    zoom: number;
    x: number;
    y: number;
  };
  mouseLoc: { x: number; y: number } | null;
  claimed: Record<number, boolean>;
  requested: Record<number, number>;
}

export interface BitmapOptions {
  backgroundColor: string;
}
