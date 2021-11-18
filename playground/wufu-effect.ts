/**
 * @title Wufu Effect
 * @category Material
 */
import { OrbitControl } from "@oasis-engine/controls";
import { LottieAnimation } from "@oasis-engine/lottie";
import * as dat from "dat.gui";
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  Camera,
  Entity,
  GLTFResource,
  Logger,
  MeshRenderer,
  PBRMaterial,
  PrimitiveMesh,
  SkyBoxMaterial,
  Texture2D,
  WebGLEngine
} from "oasis-engine";

const gui = new dat.GUI();

Logger.enable();
//-- create engine object
const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const { background } = scene;
const rootEntity = scene.createRootEntity();

// const directLightNode = rootEntity.createChild("dir_light");
// const directLightNode2 = rootEntity.createChild("dir_light2");
// directLightNode.addComponent(DirectLight);
// directLightNode2.addComponent(DirectLight);
// directLightNode.transform.setRotation(30, 0, 0);
// directLightNode2.transform.setRotation(-30, 180, 0);

//Create camera
const cameraNode = rootEntity.createChild("camera_node");
cameraNode.transform.setPosition(0, 0.3, 2);
cameraNode.addComponent(Camera);
const orbitControl = cameraNode.addComponent(OrbitControl);
orbitControl.target.setValue(0, 0.3, 0);

// Create sky
const sky = background.sky;
const skyMaterial = new SkyBoxMaterial(engine);
background.mode = BackgroundMode.Sky;

sky.material = skyMaterial;
sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);

engine.run();
engine.resourceManager
  .load<Entity>({
    urls: [
      "https://gw.alipayobjects.com/os/OasisHub/cf33a95d-30fe-40b4-bb6d-8d36650911ac/lottie.json",
      "https://gw.alipayobjects.com/os/OasisHub/90320db5-82ab-47a9-8bf7-5b86860d9349/lottie.atlas"
    ],
    type: "lottie"
  })
  .then((lottieEntity) => {
    rootEntity.addChild(lottieEntity);
    const lottie = lottieEntity.getComponent(LottieAnimation);
    // lottie.isLooping = true;
    lottie.play();
  });

engine.resourceManager
  // .load<GLTFResource>("https://gw.alipayobjects.com/os/OasisHub/440000381/9123/fu_05.gltf")
  .load<GLTFResource>("https://gw.alipayobjects.com/os/bmw-prod/ea889d82-6ed4-4eac-bf09-96cc1d9cb093.glb")
  .then((gltf) => {
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

    effectHDR();
    effectNormal(material);
  });

// hdr
async function effectHDR() {
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

  scene.ambientLight = ambientLightList.sky;
  skyMaterial.textureCubeMap = ambientLightList.sky.specularTexture;
  skyMaterial.textureDecodeRGBM = true;

  gui
    .add(
      {
        env: "sky"
      },
      "env",
      names
    )
    .onChange((v) => {
      scene.ambientLight = ambientLightList[v];
      skyMaterial.textureCubeMap = ambientLightList[v].specularTexture;
    });
}

// 磨砂
async function effectNormal(material) {
  const normalTexture = await engine.resourceManager.load<Texture2D>(
    "https://gw.alipayobjects.com/zos/OasisHub/a4d5aebe-043f-43e7-b3d7-b5d7f6376c32/26000030/0.6681844223860367.jpg"
  );
  material.normalTexture = normalTexture;
}
