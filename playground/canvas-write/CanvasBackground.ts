import {
  BlendFactor,
  BlendOperation,
  Material,
  MeshRenderer,
  RenderQueueType,
  Script,
  Shader,
  Texture2D
} from "oasis-engine";
import { createPlane } from "../utils";

export class CanvasBackground extends Script {
  private _texture: Texture2D;
  private _renderer: MeshRenderer;
  private _mtl: Material;
  private _canvas: any;
  private progressProperty = Shader.getPropertyByName("u_progress");

  onAwake() {
    const renderer = this.entity.addComponent(MeshRenderer);
    renderer.mesh = createPlane(this._engine);
    this._renderer = renderer;
    this._mtl = new Material(
      this._engine,
      Shader.create(
        "shodo-canvas",
        `
    attribute vec4 POSITION;
    attribute vec2 TEXCOORD_0;

    varying vec2 uv;

    uniform float u_progress;

    void main() {
      uv = TEXCOORD_0;
      gl_Position = vec4( POSITION.xy * u_progress, 0.999999, 1.0);
    }
    `,
        `
    uniform sampler2D tex;
    varying vec2 uv;

    void main() {
      vec4 color = texture2D(tex, uv);
      // if(color.r > 0.95) 

      
      // color.a=1.0-color.r;
      //color.r=0;


      gl_FragColor = color;

      
      // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    `
      )
    );
    this._mtl.renderQueueType = RenderQueueType.AlphaTest + 2;
    const { targetBlendState } = this._mtl.renderState.blendState;
    targetBlendState.enabled = true;
    targetBlendState.sourceColorBlendFactor = BlendFactor.SourceAlpha;
    targetBlendState.destinationColorBlendFactor = BlendFactor.OneMinusSourceAlpha;
    targetBlendState.sourceAlphaBlendFactor = BlendFactor.One;
    targetBlendState.destinationAlphaBlendFactor = BlendFactor.OneMinusSourceAlpha;
    targetBlendState.colorBlendOperation = BlendOperation.Add;
    targetBlendState.alphaBlendOperation = BlendOperation.Add;
    this._renderer.setMaterial(this._mtl);
  }

  onEnable() {
    this._renderer.enabled = true;
  }

  onDisable() {
    this._renderer.enabled = false;
  }

  initCanvas2D(canvas: any) {
    this._canvas = canvas;
    this._texture = new Texture2D(this._engine, canvas.width, canvas.height, undefined, false);
    this._mtl.shaderData.setTexture("tex", this._texture);
    this.setProgress(1);
  }

  setProgress(value: number) {
    this._mtl.shaderData.setFloat(this.progressProperty, value);
  }

  onUpdate() {
    if (this._canvas) {
      this._texture.setImageSource(this._canvas);
    }
  }
}
