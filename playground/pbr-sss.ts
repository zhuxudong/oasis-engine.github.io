/**
 * @title PBR SSS
 * @category Material
 */
import * as dat from "dat.gui";
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  Camera,
  Color,
  GLTFResource,
  Logger,
  MeshRenderer,
  PBRMaterial,
  PointLight,
  PrimitiveMesh,
  SkyBoxMaterial,
  Texture2D,
  UnlitMaterial,
  WebGLEngine
} from "oasis-engine";
import { OrbitControl } from "oasis-engine-toolkit";
const gui = new dat.GUI();
Logger.enable();

//-- create engine object
const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const { background } = scene;
const rootEntity = scene.createRootEntity();
background.solidColor.set(0, 0, 0, 1);

//Create camera
const cameraNode = rootEntity.createChild("camera_node");
cameraNode.transform.setPosition(0, 1.5, -1);
const camera = cameraNode.addComponent(Camera);
cameraNode.addComponent(OrbitControl).target.set(0, 1.5, 0);
camera.farClipPlane = 1000;

// Create sky
const sky = background.sky;
const skyMaterial = new SkyBoxMaterial(engine);
background.mode = BackgroundMode.Sky;

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
      url: "https://gw.alipayobjects.com/os/bmw-prod/46d53ed8-a52b-4b70-9e29-d5ecaeef7e35.bin"
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
