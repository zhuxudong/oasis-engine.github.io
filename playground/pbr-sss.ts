/**
 * @title PBR SSS
 * @category Material
 */
import * as dat from "dat.gui";
import {
  AmbientLight,
  AssetType,
  Camera,
  Color,
  DirectLight,
  GLTFResource,
  Logger,
  Material,
  MeshRenderer,
  PBRMaterial,
  PointLight,
  PrimitiveMesh,
  SkyBoxMaterial,
  Texture2D,
  UnlitMaterial,
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
cameraNode.transform.setPosition(0, 1.5, 1);
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

Promise.all([
  engine.resourceManager
    .load<GLTFResource>({
      type: AssetType.Prefab,
      // url: "https://gw.alipayobjects.com/os/bmw-prod/2f1b04ef-8679-4328-a750-508267664efb.gltf"
      url: "https://gw.alipayobjects.com/os/OasisHub/694000414/8777/YouthMaleNormal_Clothes_Default.gltf"
    })
    .then((gltf) => {
      console.log(gltf);

      const { defaultSceneRoot, materials } = gltf;
      rootEntity.addChild(defaultSceneRoot);
      const faceMaterial = materials[6] as PBRMaterial;

      // const renderers = [];
      // defaultSceneRoot.getComponentsIncludeChildren(MeshRenderer, renderers);
      // renderers.forEach((renderer) => {
      //   const material: PBRMaterial = renderer.getMaterial();
      //   const texture = material.baseTexture;
      //   const newMaterial = new UnlitMaterial(engine);
      //   newMaterial.baseTexture = texture;
      //   renderer.setMaterial(newMaterial);
      // });

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
          // faceMaterial.baseColor.set(227 / 255, 170 / 255, 141 / 255, 1);
          faceMaterial.baseColor.set(1, 1, 1, 1);

          faceMaterial.subsurfaceColor.set(1, 58 / 255, 0, 1);

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
    .load<AmbientLight>({
      type: AssetType.Env,
      url: "https://gw.alipayobjects.com/os/bmw-prod/e1576160-17ec-49b3-ab58-270db1810aba.bin"
    })
    .then((ambientLight) => {
      scene.ambientLight = ambientLight;
      skyMaterial.textureCubeMap = ambientLight.specularTexture;
      skyMaterial.textureDecodeRGBM = true;
      ambientLight.specularIntensity = ambientLight.diffuseIntensity = 0.5;

      const folder = gui.addFolder("HDR");
      folder.open();
      folder.add({ intensity: ambientLight.specularIntensity }, "intensity", 0, 1, 0.01).onChange((v) => {
        ambientLight.specularIntensity = ambientLight.diffuseIntensity = v;
      });
    })
]).then(() => {
  engine.run();
});
// 直接光
const mainLightEntity = rootEntity.createChild("mainLight");
const mainLight = mainLightEntity.addComponent(DirectLight);
const purpleLightEntity = rootEntity.createChild("purpleLight");
const purpleLight = purpleLightEntity.addComponent(DirectLight);
const subLightEntity = rootEntity.createChild("subLight");
const subLight = subLightEntity.addComponent(PointLight);

mainLightEntity.transform.setRotation(-8, 0, 0);
purpleLightEntity.transform.setRotation(0, 210, 0);
subLightEntity.transform.setPosition(-0.032, 1.911, 0.136);
mainLight.intensity = 0.55;
purpleLight.intensity = 0.15;
purpleLight.color.set(189 / 255, 16 / 255, 224 / 255, 1);
subLight.intensity = 0.4;
subLight.distance = 4;

gui.add({ light: true }, "light").onChange((open) => {
  if (open) {
    mainLight.intensity = 0.55;
    purpleLight.intensity = 0.15;
    subLight.intensity = 0.4;
  } else {
    mainLight.intensity = 0;
    purpleLight.intensity = 0;
    subLight.intensity = 0;
  }
});
