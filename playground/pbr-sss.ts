/**
 * @title PBR SSS
 * @category Material
 */
import * as dat from "dat.gui";
import {
  AmbientLight,
  AssetType,
  BaseMaterial,
  Camera,
  Color,
  Entity,
  GLTFResource,
  Logger,
  MeshRenderer,
  PBRMaterial,
  PointLight,
  PrimitiveMesh,
  RenderTarget,
  Scene,
  Script,
  Shader,
  SkyBoxMaterial,
  Texture2D,
  UnlitMaterial,
  Vector2,
  WebGLEngine,
  WebGLMode
} from "oasis-engine";
import { OrbitControl } from "oasis-engine-toolkit";
const gui = new dat.GUI();
Logger.enable();

//-- create engine object
const engine = new WebGLEngine("canvas", { webGLMode: WebGLMode.Auto });
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const { background } = scene;
const rootEntity = scene.createRootEntity();
// background.solidColor.set(0, 0, 0, 1);

//Create camera
const cameraNode = rootEntity.createChild("camera_node");
cameraNode.transform.setPosition(0, 1.5, -1);
const camera = cameraNode.addComponent(Camera);
cameraNode.addComponent(OrbitControl).target.set(0, 1.5, 0);
camera.farClipPlane = 1000;
camera.enableFrustumCulling = false;

// Create sky
const sky = background.sky;
const skyMaterial = new SkyBoxMaterial(engine);
// background.mode = BackgroundMode.Sky;

sky.material = skyMaterial;
sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);

function guiToColor(gui: number[], color: Color) {
  color.set(gui[0] / 255, gui[1] / 255, gui[2] / 255, color.a);
}

function colorToGui(color: Color = new Color(1, 1, 1)): number[] {
  const v = [];
  v[0] = color.r * 255;
  v[1] = color.g * 255;
  v[2] = color.b * 255;
  return v;
}

Shader.create(
  "sss",
  `
attribute vec3 POSITION;
attribute vec2 TEXCOORD_0;

varying vec2 v_uv;

void main(){
    gl_Position = vec4( POSITION.xzy , 1.0);
    gl_Position.y *= -1.0;
    v_uv = TEXCOORD_0;
    v_uv.y = 1.0 - v_uv.y;
}
        
`,
  `
#define GOLDEN_RATIO 1.618033988749895
#define rcp(x) 1.0 / x
#define TWO_PI 6.2831855
#define Sq(x) x * x
#define HALF_MIN  5.96046448e-08
#define LOG2_E  1.4426950408889634
#define PI 3.1415926535897932384626433832795
#define saturate(x) clamp(x, 0.0, 1.0)
#define absEps(x) abs(x)+Epsilon
#define maxEps(x) max(x, Epsilon)
#define saturateEps(x) clamp(x, Epsilon, 1.0)

uniform sampler2D u_texture;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
uniform vec2 u_texSize;
uniform vec2 u_viewportSize;

varying vec2 v_uv;

vec2 Golden2dSeq(int i, float n) {
  return vec2(float(i)/n+(0.5/n), fract(float(i)*rcp(GOLDEN_RATIO)));
}

vec2 SampleDiskGolden(int i, int sampleCount) {
  vec2 f = Golden2dSeq(i, float(sampleCount));
  return vec2(sqrt(f.x), TWO_PI*f.y);
}

vec4 linearToGamma(vec4 linearIn){
  return vec4( pow(linearIn.rgb, vec3(1.0 / 2.2)), linearIn.a);
}

vec3 EvalBurleyDiffusionProfile(float r, vec3 S) {
  vec3 exp_13 = exp2(((LOG2_E*(-1.0/3.0))*r)*S);
  vec3 expSum = exp_13*(1.+exp_13*exp_13);
  return (S*rcp(8.*PI))*expSum;
}

vec2 SampleBurleyDiffusionProfile(float u, float rcpS) {
  u = 1.-u;
  float g = 1.+(4.*u)*(2.*u+sqrt(1.+(4.*u)*u));
  float n = exp2(log2(g)*(-1.0/3.0));
  float p = (g*n)*n;
  float c = 1.+p+n;
  float d = (3./LOG2_E*2.)+(3./LOG2_E)*log2(u);
  float x = (3./LOG2_E)*log2(c)-d;
  float rcpExp = ((c*c)*c)*rcp((4.*u)*((c*c)+(4.*u)*(4.*u)));
  float r = x*rcpS;
  float rcpPdf = (8.*PI*rcpS)*rcpExp;
  return vec2(r, rcpPdf);
}

vec3 ComputeBilateralWeight(float xy2, float z, float mmPerUnit, vec3 S, float rcpPdf) {
  float r = sqrt(xy2+(z*mmPerUnit)*(z*mmPerUnit));
  float area = rcpPdf;
  return EvalBurleyDiffusionProfile(r, S)*area;
}



void EvaluateSample(int i, int n, vec3 S, float d, vec3 centerPosVS, float mmPerUnit, float pixelsPerMm, float phase, inout vec3 totalIrradiance, inout vec3 totalWeight) {
  float scale = rcp(float(n));
  float offset = rcp(float(n))*0.5;
  float sinPhase, cosPhase;
  sinPhase = sin(phase);
  cosPhase = cos(phase);
  vec2 bdp = SampleBurleyDiffusionProfile(float(i)*scale+offset, d);
  float r = bdp.x;
  float rcpPdf = bdp.y;
  float phi = SampleDiskGolden(i, n).y;
  float sinPhi, cosPhi;
  sinPhi = sin(phi);
  cosPhi = cos(phi);
  float sinPsi = cosPhase*sinPhi+sinPhase*cosPhi;
  float cosPsi = cosPhase*cosPhi-sinPhase*sinPhi;
  vec2 vec = r*vec2(cosPsi, sinPsi);
  vec2 position;
  float xy2;
  position = v_uv + round((pixelsPerMm * r) * vec2(cosPsi, sinPsi)) * u_texSize;
  xy2 = r*r;
  vec4 textureSample = texture2D(u_texture2, position);
  float viewZ = texture2D(u_texture3, position).r;
  vec3 irradiance = textureSample.rgb;
  
      float relZ = viewZ-centerPosVS.z;
      vec3 weight = ComputeBilateralWeight(xy2, relZ, mmPerUnit, S, rcpPdf);
      totalIrradiance += weight*irradiance;
      totalWeight += weight;

}

void main(){
  vec4 color1 =  texture2D(u_texture, v_uv);
  vec4 color2 =  texture2D(u_texture2, v_uv);
  vec4 color3 =  texture2D(u_texture3, v_uv);

  if(color3.a < 1.0){
      gl_FragColor = color1 + color2;
      #ifndef OASIS_COLORSPACE_GAMMA
        gl_FragColor = linearToGamma(gl_FragColor);
      #endif
      return;
  }

  // --- start ---
  vec3 S = vec3(1.0, 1.0, 1.0); // 透明为1
  float d = 1.0; // 透明为1

  vec2 centerPosNDC = v_uv;
  vec2 cornerPosNDC = v_uv + 0.5 * u_texSize;
  vec3 centerPosVS = vec3(centerPosNDC * u_viewportSize, 1.0) * color3.r;
  vec3 cornerPosVS = vec3(cornerPosNDC * u_viewportSize, 1.0) * color3.r;
  float mmPerUnit = 400.0;
  float unitsPerMm = rcp(mmPerUnit);
  float unitsPerPixel = 2. * abs(cornerPosVS.x-centerPosVS.x);
  float pixelsPerMm = rcp(unitsPerPixel)*unitsPerMm;


  float phase = 0.;
  vec3 centerWeight = vec3(0.);
  vec3 totalIrradiance = vec3(0.);
  vec3 totalWeight = vec3(0.);

  for (int i = 0;i< 40;i++) {
      EvaluateSample(i, 40, S, d, centerPosVS, mmPerUnit, pixelsPerMm, phase, totalIrradiance, totalWeight);
  }

  totalWeight = max(totalWeight, HALF_MIN);

  // ---end ---

  gl_FragColor = color1 + vec4(totalIrradiance / totalWeight ,1.0);
  // gl_FragColor = vec4(color3.r);

  #ifndef OASIS_COLORSPACE_GAMMA
    gl_FragColor = linearToGamma(gl_FragColor);
  #endif
}
`
);

class SSSScript extends Script {
  private _renderTarget: RenderTarget;
  private _oldScene: Scene;
  private _newScene: Scene;

  constructor(entity: Entity) {
    super(entity);
    let { width, height } = this.engine.canvas;
    const renderColorTexture = new Texture2D(this.engine, width, height);
    const renderColorTexture2 = new Texture2D(this.engine, width, height);
    const renderColorTexture3 = new Texture2D(this.engine, width, height);
    const renderTarget = new RenderTarget(this.engine, width, height, [
      renderColorTexture,
      renderColorTexture2,
      renderColorTexture3
    ]);

    const newScene = new Scene(engine);
    const screenEntity = newScene.createRootEntity("screen");
    const screenRenderer = screenEntity.addComponent(MeshRenderer);
    const material = new BaseMaterial(engine, Shader.find("sss"));

    screenRenderer.mesh = PrimitiveMesh.createPlane(engine, 2, 2);
    screenRenderer.setMaterial(material);
    material.shaderData.setTexture("u_texture", renderColorTexture);
    material.shaderData.setTexture("u_texture2", renderColorTexture2);
    material.shaderData.setTexture("u_texture3", renderColorTexture3);
    material.shaderData.setVector2("u_texSize", new Vector2(1 / width, 1 / height));
    material.shaderData.setVector2(
      "u_viewportSize",
      new Vector2(Math.tan(camera.fieldOfView / 2) * camera.aspectRatio, Math.tan(camera.fieldOfView / 2))
    );

    this._renderTarget = renderTarget;
    this._newScene = newScene;
    this._oldScene = this.scene;
  }

  onBeginRender(camera: Camera) {
    camera.renderTarget = this._renderTarget;
  }

  onEndRender(camera: Camera) {
    camera.renderTarget = null;
    this.engine.sceneManager.activeScene = this._newScene;
    camera.render();
    this.engine.sceneManager.activeScene = this._oldScene;
  }
}

cameraNode.addComponent(SSSScript);

Promise.all([
  engine.resourceManager
    .load<GLTFResource>("https://gw.alipayobjects.com/os/OasisHub/440001735/9384/head%2525202.gltf")
    .then((gltf) => {
      console.log(gltf);

      const { defaultSceneRoot, materials } = gltf;
      rootEntity.addChild(defaultSceneRoot);
      const faceMaterial = materials[3] as PBRMaterial;
      defaultSceneRoot.transform.rotate(0, 180, 0);

      // SSS
      engine.resourceManager
        .load<Texture2D>({
          type: AssetType.Texture2D,
          url: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*iAMbTblxLkcAAAAAAAAAAAAAARQnAQ"
          // url: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*hBHDTqcLKrMAAAAAAAAAAAAAARQnAQ"
        })
        .then((texture) => {
          faceMaterial.thicknessTexture = texture;
          faceMaterial.subsurface = 1;
          faceMaterial.baseColor.set(198 / 255, 160 / 255, 122 / 255, 1);
          faceMaterial.subsurfaceColor.set(214 / 255, 109 / 255, 82 / 255, 1);

          const color = colorToGui(faceMaterial.baseColor);
          const subcolor = colorToGui(faceMaterial.subsurfaceColor);
          const debugInfo = {
            color,
            colorR: color[0],
            colorG: color[1],
            colorB: color[2],
            subcolor,
            subcolorR: subcolor[0],
            subcolorG: subcolor[1],
            subcolorB: subcolor[2],
            useTexture: true
          };

          const folderBase = gui.addFolder("base");
          folderBase
            .addColor(debugInfo, "color")
            .onChange((v) => {
              guiToColor(v, faceMaterial.baseColor);
            })
            .listen();
          folderBase
            .add(debugInfo, "colorR", 0, 255)
            .onChange((v) => {
              faceMaterial.baseColor.r = v / 255;
              debugInfo.color[0] = v;
            })
            .name("R");
          folderBase
            .add(debugInfo, "colorG", 0, 255)
            .onChange((v) => {
              faceMaterial.baseColor.g = v / 255;
              debugInfo.color[1] = v;
            })
            .name("G");
          folderBase
            .add(debugInfo, "colorB", 0, 255)
            .onChange((v) => {
              faceMaterial.baseColor.b = v / 255;
              debugInfo.color[2] = v;
            })
            .name("B");
          folderBase.add(faceMaterial, "metallic", 0, 1, 0.01);
          folderBase.add(faceMaterial, "roughness", 0, 1, 0.01);

          const folderSub = gui.addFolder("subsurface");
          folderSub.add(faceMaterial, "subsurface", 0, 1, 0.01);
          folderSub
            .addColor(debugInfo, "subcolor")
            .onChange((v) => {
              guiToColor(v, faceMaterial.subsurfaceColor);
            })
            .listen();
          folderSub
            .add(debugInfo, "subcolorR", 0, 255)
            .onChange((v) => {
              faceMaterial.subsurfaceColor.r = v / 255;
              debugInfo.subcolor[0] = v;
            })
            .name("R");
          folderSub
            .add(debugInfo, "subcolorG", 0, 255)
            .onChange((v) => {
              faceMaterial.subsurfaceColor.g = v / 255;
              debugInfo.subcolor[1] = v;
            })
            .name("G");
          folderSub
            .add(debugInfo, "subcolorB", 0, 255)
            .onChange((v) => {
              faceMaterial.subsurfaceColor.b = v / 255;
              debugInfo.subcolor[2] = v;
            })
            .name("B");

          folderBase.open();
          folderSub.open();
        });
    }),
  // 灯光
  engine.resourceManager
    .load<GLTFResource>({
      type: AssetType.Prefab,
      url: "https://gw.alipayobjects.com/os/bmw-prod/963e8950-d5ec-4da8-9a8b-f75e322f483d.glb"
    })
    .then((gltf) => {
      const { lights, defaultSceneRoot } = gltf;
      const pointLight1 = lights[0] as PointLight;
      const pointLight2 = lights[1] as PointLight;
      const pointLight3 = lights[2] as PointLight;
      defaultSceneRoot.transform.rotate(0, 180, 0);
      pointLight1.intensity = 1;
      pointLight2.intensity = 0.3;
      pointLight3.intensity = 0.3;
      console.log(lights, gltf);
      rootEntity.addChild(defaultSceneRoot);
      const renderer1 = pointLight1.entity.addComponent(MeshRenderer);
      const renderer2 = pointLight2.entity.addComponent(MeshRenderer);
      const renderer3 = pointLight3.entity.addComponent(MeshRenderer);
      const material = new UnlitMaterial(engine);
      renderer1.mesh = renderer2.mesh = renderer3.mesh = PrimitiveMesh.createSphere(engine, 0.3, 32);
      renderer1.setMaterial(material);
      renderer2.setMaterial(material);
      renderer3.setMaterial(material);

      const debugInfo = {
        color1: colorToGui(pointLight1.color),
        color2: colorToGui(pointLight2.color),
        color3: colorToGui(pointLight3.color)
      };
      const folder1 = gui.addFolder("light1");
      folder1.add(pointLight1, "enabled");
      folder1.add(pointLight1, "intensity", 0, 1, 0.01);
      folder1
        .addColor(debugInfo, "color1")
        .onChange((v) => {
          guiToColor(v, pointLight1.color);
        })
        .name("color");

      const folder2 = gui.addFolder("light2");
      folder2.add(pointLight2, "enabled");
      folder2.add(pointLight2, "intensity", 0, 1, 0.01);
      folder2
        .addColor(debugInfo, "color2")
        .onChange((v) => {
          guiToColor(v, pointLight2.color);
        })
        .name("color");

      const folder3 = gui.addFolder("light3");
      folder3.add(pointLight3, "enabled");
      folder3.add(pointLight3, "intensity", 0, 1, 0.01);
      folder3
        .addColor(debugInfo, "color1")
        .onChange((v) => {
          guiToColor(v, pointLight3.color);
        })
        .name("color");
    }),
  engine.resourceManager
    .load<AmbientLight>({
      type: AssetType.Env,
      url: "https://gw.alipayobjects.com/os/bmw-prod/62ea8222-22ec-4113-b487-fa9bed009c89.bin"
    })
    .then((ambientLight) => {
      scene.ambientLight = ambientLight;
      skyMaterial.textureCubeMap = ambientLight.specularTexture;
      skyMaterial.textureDecodeRGBM = true;
      ambientLight.specularIntensity = ambientLight.diffuseIntensity = 0.5;

      const folder = gui.addFolder("HDR");
      folder.open();
      folder.add({ intensity: ambientLight.specularIntensity }, "intensity", 0, 5, 0.01).onChange((v) => {
        ambientLight.specularIntensity = ambientLight.diffuseIntensity = v;
      });
    })
]).then(() => {
  engine.run();
});
