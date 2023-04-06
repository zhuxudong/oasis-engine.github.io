/**
 * @title HDR Background
 * @category Scene
 */
import { OrbitControl } from "@oasis-engine-toolkit/controls";
import {
  AssetType,
  BackgroundMode,
  Camera,
  Logger,
  PrimitiveMesh,
  SkyBoxMaterial,
  TextureCube,
  Vector3,
  WebGLEngine
} from "oasis-engine";
Logger.enable();
const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const rootEntity = scene.createRootEntity();

// Create camera
const cameraNode = rootEntity.createChild("camera_node");
cameraNode.transform.position = new Vector3(0, 0, 3);
const camera = cameraNode.addComponent(Camera);
cameraNode.addComponent(OrbitControl);
camera.fieldOfView = 65;

// Create sky
const sky = scene.background.sky;
const skyMaterial = new SkyBoxMaterial(engine);
scene.background.mode = BackgroundMode.Sky;
sky.material = skyMaterial;
sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);

engine.resourceManager
  .load<TextureCube>({
    type: AssetType.HDR,
    url: "https://gw.alipayobjects.com/os/bmw-prod/b578946a-8a25-4543-8161-fa92f92ae1ac.bin"
    // url: "https://gw.alipayobjects.com/os/bmw-prod/10c5d68d-8580-4bd9-8795-6f1035782b94.bin"
  })
  .then((texture) => {
    skyMaterial.textureCubeMap = texture;
    engine.run();
  });
