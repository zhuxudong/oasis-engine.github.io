/**
 * @title Wufu Effect
 * @category Material
 */
import { OrbitControl } from "@oasis-engine/controls";
import * as dat from "dat.gui";
import { extrudePolygon } from "geometry-extrude";
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  Camera,
  Logger,
  PBRMaterial,
  PrimitiveMesh,
  SkyBoxMaterial,
  Texture2D,
  WebGLEngine
} from "oasis-engine";
import { CanvasWriteManager } from "./canvas-write/CanvasWriteManager";
import { CharManager } from "./CharManager";
import { image2path } from "./image2path";

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

// debug
const envList = {
  sunset: "https://gw.alipayobjects.com/os/bmw-prod/34986a5b-fa16-40f1-83c8-1885efe855d2.bin",
  // pisa: "https://gw.alipayobjects.com/os/bmw-prod/258a783d-0673-4b47-907a-da17b882feee.bin",
  // foot: "https://gw.alipayobjects.com/os/bmw-prod/f369110c-0e33-47eb-8296-756e9c80f254.bin",
  sky: "https://gw.alipayobjects.com/os/bmw-prod/1eb9dec0-d872-4c2a-b2cb-6d009692305c.bin"
};

const imageUrls = {
  1: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*8EdbQYDC0PUAAAAAAAAAAAAAARQnAQ",
  2: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*P5fxTotZoW8AAAAAAAAAAAAAARQnAQ",
  3: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*E3pkSY0kgLsAAAAAAAAAAAAAARQnAQ",
  4: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*iOayQrPWEWcAAAAAAAAAAAAAARQnAQ",
  5: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*KXkGT5mgjk4AAAAAAAAAAAAAARQnAQ"
};

const config = {
  brushConfig: {
    brushImage: "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*AdsLRaoSVM8AAAAAAAAAAAAAARQnAQ",
    minSize: 10,
    maxSize: 40,
    velocityPressureCoff: 10
  },
  extrudeConfig: {
    depth: 1,
    bevelSize: 0.1,
    bevelSegments: 1,
    smoothSide: false,
    smoothBevel: false
  },
  materialConfig: {
    metallic: 1,
    roughness: 0,
    baseColor: [255, 255, 255],
    normalTexture: true
  },
  hdrConfig: {
    url: "sunset",
    intensity: 1
  }
};

const charManager = new CharManager(engine, rootEntity);
charManager._charEntity.isActive = false;
charManager._charEntity.transform.setScale(0.01, 0.01, 0.01);
charManager._charEntity.transform.setPosition(-4, 4, 0);

const canvas = document.createElement("canvas");
const { width, height } = engine.canvas;
canvas.width = width;
canvas.height = height;
canvas.setAttribute("style", "position:absolute;top:0;left:0;background:transparent;pointer-events:none");
document.body.appendChild(canvas);

let currentImage;

const canvasWriteManager = new CanvasWriteManager(engine, canvas, engine.canvas._webCanvas, rootEntity);
canvasWriteManager.hide();

// hdr
async function effectHDR(folder) {
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
    .add(config.hdrConfig, "url", names)
    .onChange((v) => {
      scene.ambientLight = ambientLightList[v];
      // skyMaterial.textureCubeMap = ambientLightList[v].specularTexture;
    })
    .name("IBL");

  folder.add(config.hdrConfig, "intensity", 0, 10, 0.01).onChange((v) => {
    envs.forEach((env: AmbientLight) => {
      env.specularIntensity = v;
      env.diffuseIntensity = v;
    });
  });
}

async function debugMaterial(material: PBRMaterial) {
  material.baseColor.setValue(1, 1, 1, 1);
  material.metallic = 1;
  material.roughness = 0;

  material.tilingOffset.setValue(10, 10, 0, 0);

  const folder = gui.addFolder("调试材质");

  folder.add(config.materialConfig, "metallic", 0, 1, 0.01).onChange((v) => {
    material.metallic = v;
  });
  folder.add(config.materialConfig, "roughness", 0, 1, 0.01).onChange((v) => {
    material.roughness = v;
  });
  folder.addColor(config.materialConfig, "baseColor").onChange((v) => {
    material.baseColor.setValue(v[0] / 255, v[1] / 255, v[2] / 255, 1);
  });

  const normalTexture = await engine.resourceManager.load<Texture2D>(
    "https://gw.alipayobjects.com/zos/OasisHub/a4d5aebe-043f-43e7-b3d7-b5d7f6376c32/26000030/0.6681844223860367.jpg"
  );
  material.normalTexture = normalTexture;

  folder
    .add(config.materialConfig, "normalTexture")
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

async function convert(canvas, image?: HTMLImageElement) {
  if (image) {
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
  }

  const data = await image2path(canvas, 1, "black");

  const result = extrudePolygon(data, {
    ...config.extrudeConfig,
    depth: config.extrudeConfig.depth / 0.01,
    bevelSize: config.extrudeConfig.bevelSize / 0.01
  });
  // 更新 mesh
  charManager.updateMesh(result);
  charManager._charEntity.isActive = true;
}

async function getBase64(file): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      resolve(reader.result as string);
    };
    reader.onerror = function (error) {
      console.log("Error: ", error);
    };
  });
}

async function uploadImage() {
  const input = document.createElement("input");

  input.type = "file";
  document.body.appendChild(input);
  input.setAttribute("style", "position:absolute;bottom:0;left:0;opacity:0;cursor:pointer;width:200px;height:42px");

  const label = document.createElement("div");
  document.body.appendChild(label);
  label.innerHTML = "点我上传白底黑字的福字";
  label.setAttribute("style", "position:absolute;bottom:0;left:0;padding:10px;background:red;pointer-events:none");

  input.onchange = async () => {
    const file = input.files[0];
    const base64 = await getBase64(file);
    const image = new Image();
    image.onload = () => {
      currentImage = image;
      convert(canvas, currentImage);
    };
    image.src = base64;
    image.crossOrigin = "anonymous";
  };
}

// Run
engine.run();
init();

async function init() {
  const images = await loadImages();
  currentImage = images[0];

  convert(canvas, currentImage);

  const image = new Image();
  image.src = "https://gw.alipayobjects.com/mdn/rms_7c464e/afts/img/A*3tgoSbuGc_MAAAAAAAAAAAAAARQnAQ";
  image.crossOrigin = "anonymous";
  image.onload = () => {
    canvasWriteManager.selectBrush(image);
  };

  // debug
  gui
    .add(config.brushConfig, "brushImage")
    .onChange((v) => {
      const image = new Image();
      image.onload = () => {
        canvasWriteManager.selectBrush(image);
      };
      image.src = v;
      image.crossOrigin = "anonymous";
    })
    .name("笔刷图片");
  gui.add(config.brushConfig, "minSize", 0, 100, 1).onChange((v) => {
    canvasWriteManager.strokeEngine.minSize = v;
  });

  gui.add(config.brushConfig, "maxSize", 0, 100, 1).onChange((v) => {
    canvasWriteManager.strokeEngine.maxSize = v;
  });
  gui
    .add(config.brushConfig, "velocityPressureCoff", 0, 100, 1)
    .onChange((v) => {
      canvasWriteManager.strokeEngine.velocityPressureCoff = v;
    })
    .name("压速");

  gui
    .add(
      {
        start2D: () => {
          orbitControl.enabled = false;
          canvasWriteManager.clear();
          canvasWriteManager.unlock();
          canvasWriteManager.start();
          canvasWriteManager.show();
          document.body.appendChild(canvas);
        }
      },
      "start2D"
    )
    .name("书写2D");

  gui
    .add(
      {
        clear: () => {
          canvasWriteManager.clear();
        }
      },
      "clear"
    )
    .name("清空");
  gui
    .add(
      {
        finish: async () => {
          orbitControl.enabled = true;
          canvasWriteManager.lock();
          canvasWriteManager.hide();
          currentImage = null;
          await convert(canvas);
          document.body.removeChild(canvas);
        }
      },
      "finish"
    )
    .name("结束书写");

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

  gui.add(config.extrudeConfig, "depth", 0, 1, 0.01).onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config.extrudeConfig, "bevelSize", 0, 1, 0.01).onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config.extrudeConfig, "bevelSegments", 0, 10, 1).onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config.extrudeConfig, "smoothSide").onChange(() => {
    convert(canvas, currentImage);
  });
  gui.add(config.extrudeConfig, "smoothBevel").onChange(() => {
    convert(canvas, currentImage);
  });

  const folder = await debugMaterial(charManager.material);
  await effectHDR(folder);

  gui
    .add(
      {
        output: async () => {
          const json = config;
          json.hdrConfig.url = envList[json.hdrConfig.url];
          if (json.materialConfig.normalTexture) {
            // @ts-ignore
            json.materialConfig.normalTexture =
              "https://gw.alipayobjects.com/zos/OasisHub/a4d5aebe-043f-43e7-b3d7-b5d7f6376c32/26000030/0.6681844223860367.jpg";
          } else {
            delete json.materialConfig.normalTexture;
          }
          json.materialConfig.baseColor[0] /= 255;
          json.materialConfig.baseColor[1] /= 255;
          json.materialConfig.baseColor[2] /= 255;
          const string = JSON.stringify(JSON.stringify(json));
          console.log(string);

          await navigator.clipboard.writeText(string);
        }
      },
      "output"
    )
    .name("点我复制数据，粘贴给我");

  uploadImage();
}
