/**
 * @title Wufu Effect
 * @category Material
 */
import { OrbitControl } from "@oasis-engine/controls";
import { extrudePolygon } from "geometry-extrude";
import * as dat from "dat.gui";
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  Camera,
  GLTFResource,
  Logger,
  MeshRenderer,
  PBRMaterial,
  PrimitiveMesh,
  SkyBoxMaterial,
  Texture2D,
  WebGLEngine
} from "oasis-engine";
import { image2path } from "./image2path";
import { CharManager } from "./CharManager";
import { load } from "cheerio";
import { resolveOnChange } from "antd/lib/input/Input";

const gui = new dat.GUI();

Logger.enable();
//-- create engine object
const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const { background } = scene;
const rootEntity = scene.createRootEntity();

//Create camera
const cameraNode = rootEntity.createChild("camera_node");
cameraNode.transform.setPosition(0, 0.3, 20);
const camera = cameraNode.addComponent(Camera);
camera.enableFrustumCulling = false;
camera.farClipPlane = 1000000;
const orbitControl = cameraNode.addComponent(OrbitControl);
orbitControl.target.setValue(0, 0.3, 0);

// Create sky
const sky = background.sky;
const skyMaterial = new SkyBoxMaterial(engine);
background.mode = BackgroundMode.Sky;

sky.material = skyMaterial;
sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);

async function load3D() {
  const gltf = await engine.resourceManager
    // .load<GLTFResource>("https://gw.alipayobjects.com/os/OasisHub/440000381/9123/fu_05.gltf")
    .load<GLTFResource>("https://gw.alipayobjects.com/os/bmw-prod/ea889d82-6ed4-4eac-bf09-96cc1d9cb093.glb");

  const { defaultSceneRoot, materials } = gltf;
  // const material = materials[0] as PBRMaterial;
  const entity = rootEntity.createChild();

  entity.addChild(defaultSceneRoot);
  // entity.transform.setRotation(90, 0, 0);

  const material = new PBRMaterial(engine);
  defaultSceneRoot.findByName("福字").getComponent(MeshRenderer).setMaterial(material);

  material.baseColor.setValue(1, 1, 1, 1);
  material.metallic = 1;
  material.roughness = 0;

  material.tilingOffset.setValue(10, 10, 0, 0);

  gui.add(material, "metallic", 0, 1, 0.01);
  gui.add(material, "roughness", 0, 1, 0.01);
  gui.addColor({ baseColor: [255, 255, 255] }, "baseColor").onChange((v) => {
    material.baseColor.setValue(v[0] / 255, v[1] / 255, v[2] / 255, 1);
  });

  const normalTexture = await engine.resourceManager.load<Texture2D>(
    "https://gw.alipayobjects.com/zos/OasisHub/a4d5aebe-043f-43e7-b3d7-b5d7f6376c32/26000030/0.6681844223860367.jpg"
  );
  material.normalTexture = normalTexture;

  gui
    .add(
      {
        normalTexture: true
      },
      "normalTexture"
    )
    .onChange((v) => {
      if (v) {
        material.normalTexture = normalTexture;
      } else {
        material.normalTexture = null;
      }
    })
    .name("法线贴图");
  return entity;
}

// hdr
async function effectHDR(folder) {
  const envList = {
    sunset: "https://gw.alipayobjects.com/os/bmw-prod/34986a5b-fa16-40f1-83c8-1885efe855d2.bin",
    // pisa: "https://gw.alipayobjects.com/os/bmw-prod/258a783d-0673-4b47-907a-da17b882feee.bin",
    // foot: "https://gw.alipayobjects.com/os/bmw-prod/f369110c-0e33-47eb-8296-756e9c80f254.bin",
    sky: "https://gw.alipayobjects.com/os/bmw-prod/1eb9dec0-d872-4c2a-b2cb-6d009692305c.bin"
  };
  const ambientLightList: Record<string, AmbientLight> = {};
  const names = Object.keys(envList);

  const envs = await engine.resourceManager.load(
    names.map((name) => {
      return {
        type: AssetType.Env,
        url: envList[name]
      };
    })
  );
  envs.forEach((env: AmbientLight, index) => {
    const name = names[index];
    ambientLightList[name] = env;
  });

  scene.ambientLight = ambientLightList.sunset;
  // skyMaterial.textureCubeMap = ambientLightList.sky.specularTexture;
  // skyMaterial.textureDecodeRGBM = true;

  folder
    .add(
      {
        env: "sunset"
      },
      "env",
      names
    )
    .onChange((v) => {
      scene.ambientLight = ambientLightList[v];
      // skyMaterial.textureCubeMap = ambientLightList[v].specularTexture;
    });
}

async function debugMaterial(material: PBRMaterial) {
  material.baseColor.setValue(1, 1, 1, 1);
  material.metallic = 1;
  material.roughness = 0;

  material.tilingOffset.setValue(10, 10, 0, 0);

  const folder = gui.addFolder("调试材质");
  folder.add(material, "metallic", 0, 1, 0.01);
  folder.add(material, "roughness", 0, 1, 0.01);
  folder.addColor({ baseColor: [255, 255, 255] }, "baseColor").onChange((v) => {
    material.baseColor.setValue(v[0] / 255, v[1] / 255, v[2] / 255, 1);
  });

  const normalTexture = await engine.resourceManager.load<Texture2D>(
    "https://gw.alipayobjects.com/zos/OasisHub/a4d5aebe-043f-43e7-b3d7-b5d7f6376c32/26000030/0.6681844223860367.jpg"
  );
  material.normalTexture = normalTexture;

  folder
    .add(
      {
        normalTexture: true
      },
      "normalTexture"
    )
    .onChange((v) => {
      if (v) {
        material.normalTexture = normalTexture;
      } else {
        material.normalTexture = null;
      }
    })
    .name("法线贴图");

  return folder;
}

async function loadImages() {
  const imageUrls = {
    1: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*0__bQqWbofcAAAAAAAAAAAAAARQnAQ",
    2: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*P5fxTotZoW8AAAAAAAAAAAAAARQnAQ",
    3: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*E3pkSY0kgLsAAAAAAAAAAAAAARQnAQ",
    4: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*iOayQrPWEWcAAAAAAAAAAAAAARQnAQ",
    5: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*KXkGT5mgjk4AAAAAAAAAAAAAARQnAQ"
  };

  return Promise.all(
    [1, 2, 3, 4, 5].map((index) => {
      return new Promise((resolve) => {
        const image = new Image();
        image.src = imageUrls[index];
        image.crossOrigin = "anonymous";
        image.onload = () => {
          resolve(image);
        };
      });
    })
  );
}

async function convert(canvas, image) {
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const data = await image2path(canvas, 0.01, "black");

  const result = extrudePolygon(data, config);
  // 更新 mesh
  charManager.updateMesh(result);
  charManager._charEntity.isActive = true;
}

const config = {
  depth: 1,
  bevelSize: 0.1,
  bevelSegments: 1,
  smoothSide: false,
  smoothBevel: false
};

const charManager = new CharManager(engine, rootEntity);
charManager._charEntity.isActive = false;
// charManager._charEntity.transform.setScale(0.01, 0.01, 0.01);
charManager._charEntity.transform.setPosition(-4, 4, 0);

// Run
engine.run();
init();

async function init() {
  const images = await loadImages();
  let currentImage = images[0];
  // load3D();

  const canvas = document.createElement("canvas");
  const { width, height } = engine.canvas;
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("style", "position:absolute;top:0;left:0;background:transparent;pointer-events:none");
  document.body.appendChild(canvas);

  convert(canvas, currentImage);

  // debug
  gui
    .add({ image: "1" }, "image", [1, 2, 3, 4, 5])
    .onChange(async (index) => {
      currentImage = images[index - 1];
      convert(canvas, currentImage);
    })
    .name("五福字体");

  gui
    .add({ show: true }, "show")
    .onChange((v) => {
      if (v) {
        document.body.appendChild(canvas);
      } else {
        document.body.removeChild(canvas);
      }
    })
    .name("显示2D字体");

  gui.add(config, "depth", 0, 1, 0.01).onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config, "bevelSize", 0, 0.5, 0.01).onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config, "bevelSegments", 0, 10, 1).onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config, "smoothSide").onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config, "smoothBevel").onChange(() => {
    convert(canvas, currentImage);
  });

  const folder = await debugMaterial(charManager.material);
  await effectHDR(folder);
}
