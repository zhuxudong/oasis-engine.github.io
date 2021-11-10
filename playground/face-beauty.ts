/**
 * @title Face Beautiful
 * @category Advance
 */
import { OrbitControl } from "@oasis-engine/controls";
import "@oasis-engine/stats";
import * as dat from "dat.gui";
import {
  AssetType,
  Camera,
  CompareFunction,
  Entity,
  Logger,
  Material,
  MeshRenderer,
  PrimitiveMesh,
  RenderBufferDepthFormat,
  RenderColorTexture,
  RenderQueueType,
  RenderTarget,
  Script,
  Shader,
  Texture2D,
  TextureFilterMode,
  Vector2,
  Vector4,
  WebGLEngine
} from "oasis-engine";
Logger.enable();
const gui = new dat.GUI();

// Create engine object
const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const rootEntity = scene.createRootEntity();

// Create camera
const cameraEntity = rootEntity.createChild("camera_node");
cameraEntity.transform.setPosition(0, 0, 5);
cameraEntity.addComponent(Camera);
cameraEntity.addComponent(OrbitControl);
engine.run();

// 美颜

class FaceBeautyScript extends Script {
  rts: RenderTarget[] = [];
  bgMaterial: Material;
  mpVMaterial: Material;
  mpHMaterial: Material;
  varianceMaterial: Material;
  combineMaterial: Material;
  bgRenderer: MeshRenderer;

  width: number = 720;
  height: number = 1280;
  originTexture: Texture2D;

  constructor(entity: Entity) {
    super(entity);
    // const width = engine.canvas.width;
    // const height = engine.canvas.height;

    // this.rts[0] = new RenderTarget(
    //   engine,
    //   this.width,
    //   this.height,
    //   new RenderColorTexture(engine, this.width, this.height),
    //   RenderBufferDepthFormat.Depth
    // );

    for (let i = 0; i < 3; i++) {
      this.rts[i] = new RenderTarget(
        engine,
        this.width,
        this.height,
        new RenderColorTexture(engine, this.width, this.height),
        RenderBufferDepthFormat.Depth
      );
    }

    const vertex = `
attribute vec3 POSITION;
attribute vec2 TEXCOORD_0;

varying vec2 v_uv;

void main(){
    gl_Position = vec4( POSITION.xz , 1.0, 1.0);
    gl_Position.y *= -1.0;
    v_uv = TEXCOORD_0;
}
`;

    const frag = `
  uniform sampler2D inputImageTexture;
  varying vec2 v_uv;

  void main(){
    gl_FragColor = texture2D(inputImageTexture, v_uv);
  }
`;

    const bilateralVs = `
attribute vec3 POSITION;
attribute vec2 TEXCOORD_0;

uniform float texelWidthOffset;
uniform float texelHeightOffset;

varying vec2 blurCoordinates[9];

void main()
{
    gl_Position = vec4(POSITION.xz, 1.0, 1.0);
    gl_Position.y *= -1.0;
    vec2 texcoord = TEXCOORD_0;
    texcoord.y = 1.0 - texcoord.y;
    vec2 singleStepOffset = vec2(texelWidthOffset, texelHeightOffset);
    singleStepOffset = singleStepOffset * 2.0;
    blurCoordinates[0] = texcoord;
    blurCoordinates[1] = texcoord + singleStepOffset * 1.500000;
    blurCoordinates[2] = texcoord - singleStepOffset * 1.500000;
    blurCoordinates[3] = texcoord + singleStepOffset * 4.500000;
    blurCoordinates[4] = texcoord - singleStepOffset * 4.500000;
    blurCoordinates[5] = texcoord + singleStepOffset * 7.500000;
    blurCoordinates[6] = texcoord - singleStepOffset * 7.500000;
    blurCoordinates[7] = texcoord + singleStepOffset * 10.500000;
    blurCoordinates[8] = texcoord - singleStepOffset * 10.500000;
}`;

    const bilateralVFs = `
uniform sampler2D inputImageTexture;
varying vec2 blurCoordinates[9];
void main()
{
    vec3 sum = vec3(0.0);
    vec3 c = vec3(0.0);
    float sum_weight = 0.0;
    float weight = 0.0;
    float tolerance_factor = 7.0;
    float dist = 0.0;
    vec3 center = texture2D(inputImageTexture, blurCoordinates[0]).xyz;
    weight = 0.058823;
    sum += center*weight;
    sum_weight+=weight;
    for(int i=1; i<9;i++)
    {
        c = texture2D(inputImageTexture, blurCoordinates[i]).xyz;
        dist = distance(center, c);
        dist = min(dist*dist * tolerance_factor, 1.0);
        weight = 0.117647058823529 * (1.0 - dist); 
        sum_weight += weight; 
        sum += weight*c;
    }
    gl_FragColor = vec4(sum/sum_weight,sum_weight);
    // gl_FragColor = vec4(1,0,0,1);
}
`;

    const bilateralHFs = `
uniform sampler2D inputImageTexture;
varying vec2 blurCoordinates[9];

void main()
{
    vec3 sum = vec3(0.0);
    vec4 c = vec4(0.0);
    float sum_weight = 0.0;
    float weight = 0.0;
    float tolerance_factor = 7.0;
    float dist = 0.0;
    vec3 center = texture2D(inputImageTexture, blurCoordinates[0]).xyz;
    weight = 0.05882353;
    sum += center*weight;
    sum_weight+=weight;
    for(int i=1; i<9;i++)
    {
        c = texture2D(inputImageTexture, blurCoordinates[i]);
        dist = distance(center, c.xyz);
        dist = min(dist*dist * tolerance_factor, 1.0); 
        weight = 0.117647058823529 * (1.0 - dist)*c.a; 
        sum_weight += weight; 
        sum += weight*c.xyz;
    }
    gl_FragColor = vec4(sum/sum_weight,1.0);
}`;

    const varianceVs = `
attribute vec3 POSITION;
attribute vec2 TEXCOORD_0;

uniform vec2 texelSizeOffset;

varying vec2 blurCoordinates[9];

void main()
{
    gl_Position = vec4(POSITION.xz, 1.0, 1.0);
    gl_Position.y *= -1.0;
    vec2 texcoord = TEXCOORD_0;
    texcoord.y = 1.0 - texcoord.y;
    float width  = texelSizeOffset.x * 2.0;
    float height = texelSizeOffset.y * 2.0;
    vec2 step1 = vec2(width, height)*1.5;
    vec2 step2 = vec2(width, height)*3.0;
    blurCoordinates[0] = texcoord;
    blurCoordinates[1] = texcoord + vec2(step1.x,  step1.y);
    blurCoordinates[2] = texcoord + vec2(-step1.x, step1.y);
    blurCoordinates[3] = texcoord + vec2(step1.x, -step1.y);
    blurCoordinates[4] = texcoord + vec2(-step1.x,-step1.y);
    blurCoordinates[5] = texcoord + vec2(step2.x, 0);
    blurCoordinates[6] = texcoord + vec2(-step2.x,0);
    blurCoordinates[7] = texcoord + vec2(0,-step2.y);
    blurCoordinates[8] = texcoord + vec2(0, step2.y);
}
`;

    const varianceFs = `
uniform sampler2D inputImageTexture;
varying vec2 blurCoordinates[9];

void main()
{
    vec3 p = vec3(0.0);
    vec3 mp = vec3(0.0);
    vec3 mp2 = vec3(0.0);
    for(int i=0; i<9;i++){
        p = texture2D(inputImageTexture, blurCoordinates[i]).xyz;
        mp += p;
        mp2 += p*p;
    }
    mp *= 0.111111;
    mp2 *= 0.111111;
    float eps = 0.0045;
    vec3 cov = mp2-mp*mp;
    vec3 a = vec3(1.0)-cov/(cov+vec3(eps));
    gl_FragColor = vec4(a,1.0);
}
`;

    const combineVs = `
attribute vec3 POSITION;
attribute vec2 TEXCOORD_0;

uniform vec2 texelSizeOffset;

varying vec2 textureCoordinate;
varying vec2 blurCoordinates[4];

void main()
{
    gl_Position = vec4(POSITION.xz, 1.0, 1.0);
    gl_Position.y *= -1.0;
    textureCoordinate = TEXCOORD_0;
    textureCoordinate.y = 1.0 - textureCoordinate.y;
    float texelWidthOffset = texelSizeOffset.x;
    float texelHeightOffset = texelSizeOffset.y;
    blurCoordinates[0] = textureCoordinate + vec2(texelWidthOffset*0.5,texelHeightOffset*0.5);
    blurCoordinates[1] = textureCoordinate + vec2(-texelWidthOffset*0.5,texelHeightOffset*0.5);
    blurCoordinates[2] = textureCoordinate + vec2(texelWidthOffset*0.5,-texelHeightOffset*0.5);
    blurCoordinates[3] = textureCoordinate + vec2(-texelWidthOffset*0.5,-texelHeightOffset*0.5);
}
`;

    const combineFs = `
uniform sampler2D inputImageTexture; // origin image
uniform sampler2D mp_tex;//mean tex
uniform sampler2D a_tex;//variance tex

uniform sampler2D whiteLutTex;//whiten skin
uniform sampler2D contrastLutTex;//mouth lip detection

// (texelWidthOffset, texelHeightOffset)
uniform vec2 texelSizeOffset;
// (smoothLevel, whiteLevel, sharpLevel, contrastLevel)
uniform vec4 beautyLevel0;
    
varying vec2 textureCoordinate;
varying vec2 blurCoordinates[4];
precision lowp float;
vec3 gaussianBlur3()
{
    vec3 color = vec3(0.0);
    color+=texture2D(inputImageTexture, blurCoordinates[0]).xyz;
    color+=texture2D(inputImageTexture, blurCoordinates[1]).xyz;
    color+=texture2D(inputImageTexture, blurCoordinates[2]).xyz;
    color+=texture2D(inputImageTexture, blurCoordinates[3]).xyz;
    return color*0.25;
}

vec3 lut(sampler2D tex, vec3 p)
{
    vec3 textureColor = p;
    float blueColor = textureColor.b * 63.0;
    vec2 quad1;
    quad1.y = floor(floor(blueColor) * 0.125);
    quad1.x = floor(blueColor) - (quad1.y * 8.0);
    vec2 quad2;
    quad2.y = floor(ceil(blueColor) *0.125);
    quad2.x = ceil(blueColor) - (quad2.y * 8.0);
    vec2 texPos1;
    texPos1.x = (quad1.x * 0.125) + 0.00097656 + (0.12305 * textureColor.r);
    texPos1.y = (quad1.y * 0.125) + 0.00097656 + (0.12305 * textureColor.g);
    vec2 texPos2;
    texPos2.x = (quad2.x * 0.125) + 0.00097656 + (0.12305 * textureColor.r);
    texPos2.y = (quad2.y * 0.125) + 0.00097656 + (0.12305 * textureColor.g);
    vec3 newColor1 = texture2D(tex, texPos1).xyz;
    vec3 newColor2 = texture2D(tex, texPos2).xyz;
    vec3 newColor = mix(newColor1, newColor2, fract(blueColor));
    return newColor;
    // return texture2D(tex, textureCoordinate).rgb;
}

vec3 soft_light(vec3 a, vec3 b){
    return (vec3(1.0)-2.0*b)*a*a+2.0*a*b;
}

vec3 rgb2hsv(vec3 c)
{
     vec4 K = vec4(0.0, -0.33333, 0.66667, -1.0);
     vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
     vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
     float d = q.x - min(q.w, q.y);
     float e = 1.0e-10;
     vec3 r = vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    return r;
}

vec3 hsv2rgb(vec3 c)
{
     vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
     vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
     vec3 r = c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    return r;
}

vec3 changeSV(vec3 rgb, float s, float v)
{
     vec3 hsv = rgb2hsv(rgb);
    hsv.y = clamp(hsv.y*s,0.0,1.0);
    hsv.z = clamp(hsv.z*v,0.0,1.0);
    return hsv2rgb(hsv);
}
vec3 RGBtoHSL(vec3 c) {
    vec4 K = vec4(0.0, -0.33333, 0.66667, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float cmin = min(q.w, q.y);
    float d = q.x - cmin;
    float l = (q.x+cmin)*0.5;
    float e = 1.0e-10;
    float s = d / (1.0 - abs(q.x+cmin - 1.0) + e);
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), s, l);
}

float get_smooth_range_sigmoid(float h, float l, float lm, float rm, float r)
{
    
    float left = 1.0/(1.0+exp(-8.0/(lm-l)*(h-(lm+l)/2.0)));     
    float right = 1.0-1.0/(1.0+exp(-8.0/(r-rm)*(h-(rm+r)/2.0)));    
    return min(left,right);
}
vec3 skin_detection(vec3 rgb){
     float skin = 1.0;
     float mouth = 0.0;
     float tooth = 0.0;
     float r_b = rgb.r-rgb.b;
    skin = clamp(r_b*10.0,0.0,1.0);
     float l = clamp((rgb.r-0.4)*3.0,0.0,1.0);
    skin = clamp(skin+l,0.0,1.0);
    tooth = clamp(((rgb.b+rgb.g)*0.5-0.27)*5.0,0.0,1.0);
    return vec3(skin,mouth,tooth);
}
vec3 beautify()
{
    //smooth
    vec3 p = texture2D(inputImageTexture, textureCoordinate).xyz;
    vec3 mp = texture2D(mp_tex, textureCoordinate).xyz;
    vec3 a = texture2D(a_tex, textureCoordinate).xyz; 
    float skin_color = clamp((p.r-0.25)*4.0,0.0,1.0);
    vec3 final = p;
    vec3 gau = gaussianBlur3();
    vec3 diff = p-gau;
    vec3 imDiff = clamp((mp - p) * 1.4, 0.0, 0.3);
    imDiff = min(final + imDiff, 1.0);
    // skin detection
    vec3 detection = skin_detection(gau);
    //mopi 
    final = mix(final, mp, beautyLevel0.x*a*detection.x);
    //detail
    if(beautyLevel0.z >= 0.01)
    {
        float detail_thr = 0.01;
        float c = step(detail_thr,length(diff));
        vec3 contour = vec3(c*diff.g);
        final = final + beautyLevel0.z*3.0 * contour;
        final = clamp(final,0.0,1.0);
    }
    //white
    if(beautyLevel0.y >= 0.01)
    {
        vec3 white = lut(whiteLutTex, final);
        final = mix(final, white, beautyLevel0.y);
        // final = white;
    }
    //contrast
    if(beautyLevel0.w >= 0.03)
    {
        vec3 contrast = lut(contrastLutTex, final);
        final = mix(final, contrast, beautyLevel0.w);
    }
    return final;
}

void main()
{
    gl_FragColor.xyz = beautify();
    gl_FragColor.w = 1.0;
}
`;

    const bgMaterial = new Material(engine, Shader.create("bg", vertex, frag));
    const mpVMaterial = new Material(engine, Shader.create("bilateral-V", bilateralVs, bilateralVFs));
    const mpHMaterial = new Material(engine, Shader.create("bilateral-H", bilateralVs, bilateralHFs));
    const varianceMaterial = new Material(engine, Shader.create("variance", varianceVs, varianceFs));
    const combineMaterial = new Material(engine, Shader.create("combine", combineVs, combineFs));
    const bgEntity = rootEntity.createChild("ar-bg");
    const bgRenderer = bgEntity.addComponent(MeshRenderer);
    bgRenderer.mesh = PrimitiveMesh.createPlane(engine, 2, 2);

    bgMaterial.renderState.depthState.compareFunction = CompareFunction.LessEqual;
    mpVMaterial.renderState.depthState.compareFunction = CompareFunction.LessEqual;
    mpHMaterial.renderState.depthState.compareFunction = CompareFunction.LessEqual;
    varianceMaterial.renderState.depthState.compareFunction = CompareFunction.LessEqual;
    combineMaterial.renderState.depthState.compareFunction = CompareFunction.LessEqual;

    bgMaterial.renderQueueType = RenderQueueType.AlphaTest + 1;
    mpVMaterial.renderQueueType = RenderQueueType.AlphaTest + 1;
    mpHMaterial.renderQueueType = RenderQueueType.AlphaTest + 1;
    varianceMaterial.renderQueueType = RenderQueueType.AlphaTest + 1;
    combineMaterial.renderQueueType = RenderQueueType.AlphaTest + 1;

    mpVMaterial.shaderData.setFloat("texelWidthOffset", 0);
    mpVMaterial.shaderData.setFloat("texelHeightOffset", 1 / this.height);
    mpHMaterial.shaderData.setFloat("texelWidthOffset", 1 / this.width);
    mpHMaterial.shaderData.setFloat("texelHeightOffset", 0);
    varianceMaterial.shaderData.setVector2("texelSizeOffset", new Vector2(1 / this.width, 1 / this.height));
    combineMaterial.shaderData.setVector2("texelSizeOffset", new Vector2(1 / this.width, 1 / this.height));
    combineMaterial.shaderData.setVector4("beautyLevel0", new Vector4(0.7, 0.4, 0.4, 0.15));

    engine.resourceManager
      .load([
        {
          type: AssetType.Texture2D,
          url: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*nUVnRLmYT80AAAAAAAAAAAAAARQnAQ"
        },
        {
          type: AssetType.Texture2D,
          url: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*T0WtRbU00Z4AAAAAAAAAAAAAARQnAQ"
        },
        {
          type: AssetType.Texture2D,
          url: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*POuMSKKVJaEAAAAAAAAAAAAAARQnAQ"
        }
      ])
      .then((res: Texture2D[]) => {
        // @ts-ignore
        // hack: make texture no mipmap
        res[1]._mipmap = false;
        res[1].filterMode = TextureFilterMode.Point;
        res[1].filterMode = TextureFilterMode.Bilinear;
        // @ts-ignore
        res[2]._mipmap = false;
        res[2].filterMode = TextureFilterMode.Point;
        res[2].filterMode = TextureFilterMode.Bilinear;
        this.originTexture = res[0];
        // bgMaterial.shaderData.setTexture("inputImageTexture", res[0]);
        combineMaterial.shaderData.setTexture("whiteLutTex", res[1]);
        combineMaterial.shaderData.setTexture("contrastLutTex", res[2]);
      });

    this.bgMaterial = bgMaterial;
    this.mpVMaterial = mpVMaterial;
    this.mpHMaterial = mpHMaterial;
    this.varianceMaterial = varianceMaterial;
    this.combineMaterial = combineMaterial;
    this.bgRenderer = bgRenderer;
  }

  onBeginRender(camera: Camera): void {
    // if (!this.enabled) {
    //   this.bgRenderer.setMaterial(this.bgMaterial);
    //   camera.renderTarget = null;
    //   return;
    // }
    // this.bgRenderer.setMaterial(this.bgMaterial);
    // camera.renderTarget = this.rts[0];
    // camera.render();
    // const originOutput = this.rts[0].getColorTexture();

    // bilateral V
    this.mpVMaterial.shaderData.setTexture("inputImageTexture", this.originTexture);
    this.bgRenderer.setMaterial(this.mpVMaterial);
    camera.renderTarget = this.rts[0];
    camera.render();

    // bilateral H
    this.mpHMaterial.shaderData.setTexture("inputImageTexture", this.rts[0].getColorTexture());
    this.bgRenderer.setMaterial(this.mpHMaterial);
    camera.renderTarget = this.rts[1];
    camera.render();
    const bilateralOutput = this.rts[1].getColorTexture();

    // variance
    this.varianceMaterial.shaderData.setTexture("inputImageTexture", this.originTexture);
    this.bgRenderer.setMaterial(this.varianceMaterial);
    camera.renderTarget = this.rts[2];
    camera.render();
    const varianceOutput = this.rts[2].getColorTexture();

    this.combineMaterial.shaderData.setTexture("inputImageTexture", this.originTexture);
    this.combineMaterial.shaderData.setTexture("mp_tex", bilateralOutput);
    this.combineMaterial.shaderData.setTexture("a_tex", varianceOutput);
    this.bgRenderer.setMaterial(this.combineMaterial);

    camera.renderTarget = null;
  }
}

const script = cameraEntity.addComponent(FaceBeautyScript);

gui
  .add({ test: true }, "test")
  .onChange((v) => {
    script.enabled = v;
  })
  .name("美颜");
