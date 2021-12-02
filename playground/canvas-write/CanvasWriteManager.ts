import { WebGLEngine, EventDispatcher, Entity } from "oasis-engine";
import { image2path } from "../image2path";
import { CanvasBackground } from "./CanvasBackground";
import { StrokeEngine } from "./StrokeEngine";

export class CanvasWriteManager extends EventDispatcher {
  public static StrokeOperation = {
    Stroke: 0,
  };
  private strokeHistory = [];
  private isInStroke = false;
  private strokeBeginTime = null;
  private isLocked = false;
  private currentStroke = [];
  private onStrokeEnd: Function;
  private onStrokeMove: Function;
  private widthRatio: number;
  private heightRatio: number;
  strokeEngine: StrokeEngine;
  private canvasBackground: CanvasBackground;
  private _strokeData = [];

  get bounds() {
    return this.strokeEngine.bounds;
  }

  get strokeData() {
    return this._strokeData;
  }

  constructor(
    engine: WebGLEngine,
    private canvas2D: HTMLCanvasElement,
    private domElement: HTMLElement,
    container: Entity
  ) {
    super(engine);
    const canvas = canvas2D;
    this.strokeEngine = new StrokeEngine(canvas);
    if (!this.domElement) {
      this.domElement = engine.canvas._webCanvas;
    }

    this.widthRatio = canvas.width / this.domElement.clientWidth;
    this.heightRatio = canvas.height / this.domElement.clientHeight;
    this.strokeEngine.setRatio(this.widthRatio, this.heightRatio);

    this.canvasBackground = container.addComponent(CanvasBackground);
    this.canvasBackground.initCanvas2D(canvas2D);
  }

  lock() {
    this.isLocked = true;
  }

  unlock() {
    this.isLocked = false;
  }

  selectBrush(image: HTMLImageElement) {
    if (this.isLocked) return;

    this.strokeEngine.setBrush(image);
    this.endStroke();
  }

  clear() {
    this.strokeEngine.clear();
    this._strokeData = [];
    this.canvasBackground.setProgress(1);
  }

  hide() {
    this.canvasBackground.enabled = false;
  }

  show() {
    this.canvasBackground.enabled = true;
    this.canvasBackground.entity.transform.setScale(1, 1, 1);
  }

  setOnStrokeEnd(func: Function) {
    this.onStrokeEnd = func;
  }

  setOnStrokeMove(func: Function) {
    this.onStrokeMove = func;
  }

  toCurveData(scaleFactor: number, brushColor: string) {
    // @ts-ignore
    // const polygons =  JSON.parse(this.canvas2D.toCurveData("geojson", 1, 1)).features.map(
    //   (polygon) => {
    //     return polygon.geometry.coordinates;
    //   }
    // );
    // console.log(polygons);
    // return polygons;
    return image2path(this.canvas2D, scaleFactor, brushColor);
  }

  start() {
    let isMouseDown = false;

    const { offsetLeft, offsetTop } = this.domElement;

    const widthRatio = this.widthRatio;
    const heightRatio = this.heightRatio;

    const onStart = (e: any) => {
      if (this.isLocked) return;
      e.preventDefault();
      isMouseDown = true;

      this.beginStroke();
      const x = (e.pageX - offsetLeft) * widthRatio;
      const y = (e.pageY - offsetTop) * heightRatio;

      this.addStrokePosition(x, y);
      this._strokeData.push([
        [x, y, new Date().valueOf() - this.strokeBeginTime],
      ]);
    };

    const onDraw = (e: any) => {
      if (this.isLocked) return;

      e.preventDefault();
      e.stopPropagation(), e.touches && (e = e.touches[0]);
      if (!isMouseDown) return;

      const x = (e.pageX - offsetLeft) * widthRatio;
      const y = (e.pageY - offsetTop) * heightRatio;

      this.addStrokePosition(x, y);
      if (!this._strokeData.length) {
        this._strokeData.push([]);
      }
      this._strokeData[this._strokeData.length - 1].push([
        x,
        y,
        new Date().valueOf() - this.strokeBeginTime,
      ]);
    };
    const onEnd = (e: any) => {
      if (this.isLocked) return;
      e.preventDefault();
      if (!isMouseDown) return;
      isMouseDown = false;

      this.endStroke();
    };

    // @ts-ignore
    this.domElement.addEventListener("mousedown", onStart, false);
    this.domElement.addEventListener("mousemove", onDraw, false);
    this.domElement.addEventListener("mouseup", onEnd, false);
  }

  private clearHistory() {
    if (this.isLocked) return;

    this.endStroke();
    this.strokeHistory = [];
    this.strokeEngine.clear();

    return this;
  }

  public beginStroke() {
    if (this.isLocked) return;

    this.dispatch("first-start");

    this.endStroke();

    this.isInStroke = true;
    this.strokeBeginTime = new Date().valueOf();
    this.currentStroke = [];
    this.strokeEngine.beginStroke();

    return this;
  }

  public endStroke() {
    if (this.isLocked) return;

    if (!this.isInStroke) return;

    this.strokeHistory.push({
      O: CanvasWriteManager.StrokeOperation.Stroke,
      D: this.currentStroke.map(function (e) {
        return { X: e.x, Y: e.y, T: e.t, P: e.p };
      }), // convert format
    });
    this.isInStroke = false;
    this.currentStroke = null;
    this.strokeEngine.endStroke();

    this.onStrokeEnd && this.onStrokeEnd();

    return this;
  }

  public addStrokePosition(x: number, y: number, pressure?: boolean) {
    if (this.isLocked) return;

    const pos = {
      x: x,
      y: y,
      t: new Date().valueOf() - this.strokeBeginTime,
      p: pressure,
    };
    this.currentStroke.push(pos);
    this.strokeEngine.addStrokePosition(pos);
    this.strokeEngine.draw();

    this.onStrokeMove && this.onStrokeMove();

    return this;
  }
}
