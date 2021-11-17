/**
 * @title Face BlendShape
 * @category Animation
 */
import { OrbitControl } from "@oasis-engine/controls";
import * as dat from "dat.gui";
import {
  Camera,
  DirectLight,
  GLTFResource,
  Logger,
  SkinnedMeshRenderer,
  SystemInfo,
  Vector3,
  WebGLEngine
} from "oasis-engine";
const gui = new dat.GUI();

Logger.enable();
const engine = new WebGLEngine("canvas");
engine.canvas.width = window.innerWidth * SystemInfo.devicePixelRatio;
engine.canvas.height = window.innerHeight * SystemInfo.devicePixelRatio;
const scene = engine.sceneManager.activeScene;
const rootEntity = scene.createRootEntity();

// camera
const cameraEntity = rootEntity.createChild("camera_node");
cameraEntity.transform.position = new Vector3(0, 1, 5);
cameraEntity.addComponent(Camera);
cameraEntity.addComponent(OrbitControl).target = new Vector3(0, 1, 0);

const lightNode = rootEntity.createChild("light_node");
lightNode.addComponent(DirectLight).intensity = 1.0;
lightNode.transform.lookAt(new Vector3(0, 0, 1));
lightNode.transform.rotate(new Vector3(-45, -135, 0));

engine.resourceManager
  .load<GLTFResource>("https://gw.alipayobjects.com/os/OasisHub/440000381/7322/yuanlian.gltf")
  .then((asset) => {
    const { defaultSceneRoot } = asset;
    rootEntity.addChild(defaultSceneRoot);
    const skinMeshRenderer = defaultSceneRoot.findByName("18_35").getComponent(SkinnedMeshRenderer);

    const guiData = {
      b1: 0,
      b2: 0,
      b3: 0,
      b4: 0
    };

    gui
      .add(guiData, "b1", 0, 1)
      .onChange((value: number) => {
        skinMeshRenderer.blendShapeWeights[0] = value;
      })
      .name("权重1");
    gui
      .add(guiData, "b2", 0, 1)
      .onChange((value: number) => {
        skinMeshRenderer.blendShapeWeights[1] = value;
      })
      .name("权重2");
    gui
      .add(guiData, "b3", 0, 1)
      .onChange((value: number) => {
        skinMeshRenderer.blendShapeWeights[2] = value;
      })
      .name("权重3");
    gui
      .add(guiData, "b4", 0, 1)
      .onChange((value: number) => {
        skinMeshRenderer.blendShapeWeights[3] = value;
      })
      .name("权重4");
  });

engine.run();
