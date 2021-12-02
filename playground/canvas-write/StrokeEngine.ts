export interface Point {
  x: number;
  y: number;
}

export class StrokeEngine {
  velocityPressureCoff = 10;
  public canvasContext: CanvasRenderingContext2D;
  private backgroundImage = null;
  private bufferingSize = 4;
  private strokeBuffer = [];
  private previousPosition = null;
  private previousBrushSize = null;
  private previousVelocity = 0;
  private previousDistance = 0;
  private expectedNextPosition = null;
  private accelerate = 0;
  private onImageCreated: Function;
  private width = 0;
  private height = 0;
  private widthRatio = 1;
  private heightRatio = 1;
  private _bounds = [Infinity, Infinity, -Infinity, -Infinity];
  minSize = 10;
  maxSize = 40;

  get bounds() {
    return this._bounds;
  }

  constructor(private canvas: HTMLCanvasElement, private currentBrushImage?: HTMLImageElement) {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.canvasContext = this.canvas.getContext("2d");

    this.onImageCreated = function (canvas) {};

    this.clear();
  }

  setBrush(image: HTMLImageElement) {
    this.currentBrushImage = image;
  }

  toDataURL(type: string) {
    return this.getImage().toDataURL(type || "image/png");
  }

  clear() {
    this._bounds = [Infinity, Infinity, -Infinity, -Infinity];
    this.canvasContext.clearRect(0, 0, this.width, this.height);
  }

  setRatio(ratioWidth: number, ratioHeight: number) {
    this.widthRatio = ratioWidth;
    this.heightRatio = ratioHeight;
  }

  getImage() {
    // create background canvas
    var tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = this.width;
    tmpCanvas.height = this.height;
    var ctx = tmpCanvas.getContext("2d");

    // set background
    if (this.backgroundImage) {
      ctx.drawImage(this.backgroundImage, 0, 0, this.backgroundImage.width, this.backgroundImage.height);
    } else {
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    }
    // draw composited canvas
    ctx.drawImage(this.canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);

    // callback
    if (this.onImageCreated) {
      this.onImageCreated(tmpCanvas);
    }

    return tmpCanvas;
  }

  beginStroke() {
    this.strokeBuffer = [];
    this.previousPosition = null;
    this.previousBrushSize = null;
    this.previousVelocity = 0;
    this.previousDistance = 0;
    this.expectedNextPosition = null;
    this.accelerate = 0;
  }

  addStrokePosition(pos) {
    this.strokeBuffer.push(pos);
  }

  endStroke() {
    if (this.accelerate > 1) {
      // はらい
      var pos = {
        x: this.expectedNextPosition.x,
        y: this.expectedNextPosition.y,
        t: this.accelerate / (this.previousDistance * this.previousVelocity) + this.previousPosition.t,
        p: this.previousPosition.p * Math.min(this.accelerate / (this.previousDistance * this.previousVelocity), 1)
      };
      for (var i = 0, n = this.bufferingSize; i < n; i++) {
        this.strokeBuffer.push(pos);
      }
      this.draw();
    }
  }

  getInterlatePos(p0: Point, p1: Point, moveLen: number): Point {
    const x = p0.x + (p1.x - p0.x) * moveLen;
    const y = p0.y + (p1.y - p0.y) * moveLen;

    return { x: x, y: y };
  }

  private getDistance(p0: Point, p1: Point) {
    const distance = (p1.x - p0.x) * (p1.x - p0.x) + (p1.y - p0.y) * (p1.y - p0.y);
    return distance == 0 ? distance : Math.sqrt(distance);
  }

  getBufferedCurrentPosition() {
    var pos = { x: 0, y: 0, t: 0, p: 0 };
    var bufferingSize = Math.min(this.bufferingSize, this.strokeBuffer.length);

    if (bufferingSize == 0) return null;

    for (var i = 1; i < bufferingSize + 1; i++) {
      var p = this.strokeBuffer[this.strokeBuffer.length - i];
      pos.x += p.x;
      pos.y += p.y;
      pos.t += p.t;
      pos.p += p.p;
    }

    pos.x /= bufferingSize;
    pos.y /= bufferingSize;
    pos.t /= bufferingSize;
    pos.p /= bufferingSize;

    return pos;
  }

  spline(x0: number, x1: number, v0: number, v1: number, t: number) {
    return (
      (2 * x0 - 2 * x1 + v0 + v1) * Math.pow(t, 3) + (-3 * x0 + 3 * x1 - 2 * v0 - v1) * Math.pow(t, 2) + v0 * t + x0
    );
  }

  draw() {
    const pos: any = this.getBufferedCurrentPosition();
    if (pos == null) return;

    if (this.previousPosition == null) this.previousPosition = pos;

    // ---- stroke setup
    const t = pos.t - this.previousPosition.t;
    const distance = this.getDistance(pos, this.previousPosition);
    const velocity = distance / Math.max(1, t);
    const accelerate = this.previousVelocity == 0 ? 0 : velocity / this.previousVelocity;

    const curve = function (t: number, b: number, c: number, d: number) {
      return (c * t) / d + b;
    };

    let brushSize = Math.max(
      this.minSize,
      curve(velocity, this.maxSize, -this.maxSize - this.minSize, this.velocityPressureCoff)
    );
    if (pos.p > 0) {
      // Has pressure value
      brushSize = Math.max(this.minSize, this.maxSize * pos.p);
    }

    //
    pos.s = brushSize;

    const ctx = this.canvasContext;

    this.drawStroke(ctx, this.previousPosition, pos, brushSize, distance);

    this.accelerate = accelerate;
    this.expectedNextPosition = this.getInterlatePos(this.previousPosition, pos, 1 + this.accelerate);
    this.previousPosition = pos;
    this.previousBrushSize = brushSize;
    this.previousVelocity = velocity;
    this.previousDistance = distance;
  }

  drawStroke(ctx: CanvasRenderingContext2D, startPos: Point, endPos: Point, brushSize: number, distance: number) {
    let t = 0;
    const brushDelta = brushSize - this.previousBrushSize;

    const widthRatio = this.widthRatio;
    const heightRatio = this.heightRatio;
    while (t < 1) {
      const brushSizeCur = Math.min(this.previousBrushSize + brushDelta * t, this.maxSize);
      const brushSizeWidth = brushSizeCur * widthRatio;
      const brushSizeHeight = brushSizeCur * heightRatio;
      const pos = this.getInterlatePos(startPos, endPos, t);
      const visible = brushSizeWidth > 1 && brushSizeHeight > 1;

      if (Math.random() > 0.2 && visible) {
        const jitter = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 1.2);
        const px = pos.x - brushSizeWidth / 2 + jitter;
        const py = pos.y - brushSizeHeight / 2 + jitter;

        const minX = px;
        const minY = py;
        const maxX = px + brushSizeWidth;
        const maxY = py + brushSizeWidth;
        this._bounds[0] = Math.min(this._bounds[0], minX);
        this._bounds[1] = Math.min(this._bounds[1], minY);
        this._bounds[2] = Math.max(this._bounds[2], maxX);
        this._bounds[3] = Math.max(this._bounds[3], maxY);

        ctx.drawImage(this.currentBrushImage, px, py, brushSizeWidth, brushSizeHeight);
        //console.log('drawImage: brushSize=%d, startPos.p=%d, endPos.p=%d, %d, %d, %d, %d', brushSize, startPos.p, endPos.p, px, py, brushSizeCur, brushSizeCur);
      }
      t += 1 / distance;
    }
  }
}
