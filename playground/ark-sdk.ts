/**
 * @title Ark SDK
 * @category Animation
 */
import { AssetType, Camera, Loader, Logger, Scene, WebGLEngine } from "@galacean/engine";
import { OrbitControl } from "@galacean/engine-toolkit";
import { ArkComponent, Mouth, screenshotSchema } from "@galacean/engine-ark";
import * as dat from "dat.gui";
Loader.registerClass("ArkComponent", ArkComponent);
Loader.registerClass("TTSAComponent", ArkComponent);
const gui = new dat.GUI();
Logger.enable();

const engine = new WebGLEngine("canvas", { alpha: true });
init(engine);
function init(engine: WebGLEngine) {
  engine.canvas.resizeByClientSize();
  engine.resourceManager
    .load<Scene>({
      type: AssetType.Scene,
      url: "https://mdn.alipayobjects.com/oasis_be/afts/file/A*e1QmRqCAgFsAAAAAAAAAAAAADkp5AQ/scene.json"
    })
    .then(async (scene) => {
      engine.sceneManager.activeScene = scene;
      engine.run();
      // return;
      const root = scene.getRootEntity(4);
      // @ts-ignore
      const ark: ArkComponent = root?.findByName("Female")?.addComponent(ArkComponent);

      // add OrbitControl
      const cameras: Camera[] = [];
      for (let i = 0, length = scene.rootEntitiesCount; i < length; i++) {
        scene.getRootEntity(i)?.getComponentsIncludeChildren(Camera, cameras);
        if (cameras.length) break;
      }
      cameras[0].entity.addComponent(OrbitControl).target.set(0, 1, 0);
      // SDK
      await Promise.all([
        ark.addMouth("/Assets/Char/Female/Model/ANI/KX/mouth_A", Mouth.A),
        ark.addMouth("/Assets/Char/Female/Model/ANI/KX/mouth_E", Mouth.E),
        ark.addMouth("/Assets/Char/Female/Model/ANI/KX/mouth_I", Mouth.I),
        ark.addMouth("/Assets/Char/Female/Model/ANI/KX/mouth_O", Mouth.O),
        ark.addMouth("/Assets/Char/Female/Model/ANI/KX/mouth_U", Mouth.U),
        ark.addAnimation("/Assets/Char/Female/Model/ANI/DZ/idle", "idle")
      ]);

      // const { layerIndex, state } = await ark.addAnimation("/Assets/Char/Female/Model/ANI/DZ/ANI_dz_gx.fbx");
      // /Assets/Char/Female/Model/ANI/DZ/ANI_dz_gx.fbx
      // ark.animator.play(state.name, layerIndex);
      ark.animator.play("idle");
      const debug = {
        A: 0,
        E: 0,
        I: 0,
        O: 0,
        U: 0
      };

      gui.add(debug, "A", 0, 1, 0.01).onChange((value) => {
        ark.playMouth(Mouth.A, value);
      });
      gui.add(debug, "E", 0, 1, 0.01).onChange((value) => {
        ark.playMouth(Mouth.E, value);
      });
      gui.add(debug, "I", 0, 1, 0.01).onChange((value) => {
        ark.playMouth(Mouth.I, value);
      });
      gui.add(debug, "O", 0, 1, 0.01).onChange((value) => {
        ark.playMouth(Mouth.O, value);
      });
      gui.add(debug, "U", 0, 1, 0.01).onChange((value) => {
        ark.playMouth(Mouth.U, value);
      });

      engine.run();
    });
}
