/**
 * @title Post Process
 * @category Material
 */
import {
  AmbientLight,
  AssetType,
  Camera,
  GLTFResource,
  Layer,
  Material,
  MeshRenderer,
  PrimitiveMesh,
  RenderTarget,
  Script,
  Shader,
  Texture2D,
  Vector2,
  WebGLEngine
} from "@galacean/engine";
import { OrbitControl } from "@galacean/engine-toolkit";
import * as dat from "dat.gui";

const gui = new dat.GUI();

WebGLEngine.create({ canvas: "canvas" }).then((engine) => {
  engine.canvas.resizeByClientSize();
  const scene = engine.sceneManager.activeScene;
  const rootEntity = scene.createRootEntity();

  const cameraEntity = rootEntity.createChild("camera");
  const camera = cameraEntity.addComponent(Camera);
  const bloom = cameraEntity.addComponent(BloomScript);
  cameraEntity.transform.setPosition(0, 0, 5);
  cameraEntity.addComponent(OrbitControl);

  engine.resourceManager
    .load<GLTFResource>("https://gw.alipayobjects.com/os/bmw-prod/a1da72a4-023e-4bb1-9629-0f4b0f6b6fc4.glb")
    .then((gltf) => {
      const defaultSceneRoot = gltf.instantiateSceneRoot();
      rootEntity.addChild(defaultSceneRoot);
    });

  engine.resourceManager
    .load<AmbientLight>({
      type: AssetType.Env,
      url: "https://gw.alipayobjects.com/os/bmw-prod/f369110c-0e33-47eb-8296-756e9c80f254.bin"
    })
    .then((ambientLight) => {
      scene.ambientLight = ambientLight;
    }),
    engine.run();

  gui.add(bloom, "threshold", 0, 1, 0.01);
  gui.add(bloom, "exposure", 0, 2, 0.01);
  gui.add(bloom, "bloomWeight", 0, 2, 0.01);
});

const vertex = `
attribute vec3 POSITION;
attribute vec2 TEXCOORD_0;

varying vec2 v_uv;

void main(){
  gl_Position = vec4( POSITION.xzy , 1.0);
  gl_Position.y *= -1.0;
  v_uv = TEXCOORD_0;
}
`;

const blitVertex = `
attribute vec3 POSITION;
attribute vec2 TEXCOORD_0;

varying vec2 v_uv;

void main(){
  gl_Position = vec4( POSITION.xzy , 1.0);
  v_uv = TEXCOORD_0;
}
`;

const highlight = `
uniform sampler2D u_texture;
uniform float u_threshold;
uniform float u_exposure;

varying vec2 v_uv;

float getLuminance(vec3 color){
    return clamp(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0., 1.);
}
void main(){
    gl_FragColor = texture2D(u_texture, v_uv);
    float luma = getLuminance(gl_FragColor.rgb * u_exposure);
    gl_FragColor.rgb *= step(u_threshold, luma);
}
`;

const blur = `
varying vec2 v_uv;

uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform bool u_down;


void main(){
  if(u_down){
      vec4 d = u_texSize.xyxy * vec4(-1.0, -1.0, 1.0, 1.0);
      vec3 s = texture2D(u_texture, v_uv).rgb * 4.0;

      s += texture2D(u_texture, v_uv + d.xy).rgb;
      s += texture2D(u_texture, v_uv + d.zy).rgb;
      s += texture2D(u_texture, v_uv + d.xw).rgb;
      s += texture2D(u_texture, v_uv + d.zw).rgb;

      gl_FragColor.rgb = s  * 0.125;
  } else{
      vec4 d = u_texSize.xyxy * vec4(-1.0, -1.0, 1.0, 1.0);
      vec4 d2 = u_texSize.xyxy * vec4(2.0, -2.0, 0.0, 0.0);
      vec3 s = vec3(0);

      s += texture2D(u_texture, v_uv + d.xy).rgb * 2.0;
      s += texture2D(u_texture, v_uv + d.zy).rgb * 2.0;
      s += texture2D(u_texture, v_uv + d.xw).rgb * 2.0;
      s += texture2D(u_texture, v_uv + d.zw).rgb * 2.0;

      s += texture2D(u_texture, v_uv + d2.zx).rgb;
      s += texture2D(u_texture, v_uv + d2.zy).rgb;
      s += texture2D(u_texture, v_uv + d2.yz).rgb;
      s += texture2D(u_texture, v_uv + d2.xz).rgb;

      gl_FragColor.rgb = s  * 0.0833;
  }
 
}
`;

const merge = `
uniform sampler2D u_texture;
uniform sampler2D u_blurTexture;
uniform float u_bloomWeight;

varying vec2 v_uv;

void main(void){
    gl_FragColor = texture2D(u_texture, v_uv);
    vec3 blurred = texture2D(u_blurTexture, v_uv).rgb;
    gl_FragColor.rgb += (blurred.rgb * u_bloomWeight); 
}
`;

Shader.create("bloom_highlight", blitVertex, highlight);
Shader.create("bloom_blur", blitVertex, blur);
Shader.create("bloom_merge", vertex, merge);

export class BloomScript extends Script {
  screenRT: RenderTarget;
  highlightRT: RenderTarget;
  blurRTs: RenderTarget[] = [];
  bloomRenderer: MeshRenderer;
  highlightMaterial: Material;
  blurMaterial: Material;
  mergeMaterial: Material;
  blurCount: number;
  tempVector2: Vector2 = new Vector2();
  width: number;
  height: number;

  private _threshold: number = 0.5;
  private _exposure: number = 1;
  private _bloomWeight: number = 2;

  get threshold() {
    return this._threshold;
  }

  set threshold(value: number) {
    this.highlightMaterial.shaderData.setFloat("u_threshold", value);
    this._threshold = value;
  }

  get exposure() {
    return this._exposure;
  }

  set exposure(value: number) {
    this.highlightMaterial.shaderData.setFloat("u_exposure", value);
    this._exposure = value;
  }

  get bloomWeight() {
    return this._bloomWeight;
  }

  set bloomWeight(value: number) {
    this.mergeMaterial.shaderData.setFloat("u_bloomWeight", value);
    this._bloomWeight = value;
  }

  onAwake() {
    const engine = this.engine;
    const { width, height } = engine.canvas;
    this.width = width;
    this.height = height;

    this.screenRT = new RenderTarget(engine, width, height, new Texture2D(engine, width, height));
    this.highlightRT = new RenderTarget(engine, width, height, new Texture2D(engine, width, height));

    this.blurCount = Math.min(16, Math.floor(Math.log2(Math.min(width, height))) - 7); // min 128
    for (let i = 0; i < this.blurCount; i++) {
      const w = width >> (i + 1);
      const h = height >> (i + 1);
      this.blurRTs[i] = new RenderTarget(engine, w, h, new Texture2D(engine, w, h));
    }

    this.highlightMaterial = new Material(engine, Shader.find("bloom_highlight"));
    this.blurMaterial = new Material(engine, Shader.find("bloom_blur"));
    this.mergeMaterial = new Material(engine, Shader.find("bloom_merge"));

    this.threshold = this._threshold;
    this.exposure = this._exposure;
    this.bloomWeight = this._bloomWeight;

    this.blurMaterial.shaderData.setVector2("u_texSize", this.tempVector2);

    const bloomEntity = this.entity.createChild("bloom");
    bloomEntity.layer = Layer.Layer1;
    this.bloomRenderer = bloomEntity.addComponent(MeshRenderer);
    this.bloomRenderer.mesh = PrimitiveMesh.createPlane(engine, 2, 2);
  }

  onBeginRender(camera: Camera): void {
    camera.renderTarget = this.screenRT;
  }

  onEndRender(camera: Camera): void {
    const originalCullingMask = camera.cullingMask;

    this.bloomRenderer.enabled = true;
    camera.cullingMask = Layer.Layer1;
    this.bloomRenderer.setMaterial(this.highlightMaterial);
    this.highlightMaterial.shaderData.setTexture("u_texture", this.screenRT.getColorTexture()!);

    camera.renderTarget = this.highlightRT;
    camera.render();

    this.bloomRenderer.setMaterial(this.blurMaterial);
    this.blurMaterial.shaderData.setInt("u_down", 1);
    for (let i = 0; i < this.blurCount; i++) {
      const lastRenderTarget = i === 0 ? this.highlightRT : this.blurRTs[i - 1];
      this.blurMaterial.shaderData.setTexture("u_texture", lastRenderTarget.getColorTexture()!);
      this.tempVector2.set(1 / (this.width >> (i + 1)), 1 / (this.height >> (i + 1)));
      camera.renderTarget = this.blurRTs[i];
      camera.render();
    }

    this.blurMaterial.shaderData.setInt("u_down", 0);
    for (let i = this.blurCount - 2; i >= 0; i--) {
      const lastRenderTarget = this.blurRTs[i + 1];
      this.blurMaterial.shaderData.setTexture("u_texture", lastRenderTarget.getColorTexture()!);
      this.tempVector2.set(1 / (this.width >> (i + 1)), 1 / (this.height >> (i + 1)));
      camera.renderTarget = this.blurRTs[i];
      camera.render();
    }

    this.bloomRenderer.setMaterial(this.mergeMaterial);
    this.mergeMaterial.shaderData.setTexture("u_texture", this.screenRT.getColorTexture()!);
    this.mergeMaterial.shaderData.setTexture("u_blurTexture", this.blurRTs[0].getColorTexture()!);
    camera.renderTarget = null;
    camera.render();

    // revert
    camera.cullingMask = originalCullingMask;
    this.bloomRenderer.enabled = false;
  }
}
