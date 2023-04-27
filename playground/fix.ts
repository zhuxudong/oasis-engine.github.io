/**
 * @title Fix
 * @category Animation
 */
import {
  AmbientLight,
  AssetType,
  Camera,
  GLTFResource,
  Logger,
  WebGLEngine,
  PBRMaterial,
  RenderFace
} from "@galacean/engine";
Logger.enable();

WebGLEngine.create({ canvas: "canvas" }).then((engine) => {
  engine.canvas.resizeByClientSize();
  const scene = engine.sceneManager.activeScene;
  // scene.background.solidColor.set(0, 0, 0, 0);
  engine.run();

  // root
  const root = scene.createRootEntity();

  // camera
  const cameraEntity = root.createChild("camera");
  cameraEntity.addComponent(Camera);
  // cameraEntity.addComponent(OrbitControl).target.set(0, 0, 0);
  cameraEntity.transform.position.set(0, 1, 3);

  // env
  engine.resourceManager
    .load<AmbientLight>({
      type: AssetType.Env,
      url: "https://gw.alipayobjects.com/os/bmw-prod/67b05052-ecf8-46f1-86ff-26d9abcc83ea.bin"
    })
    .then((ambientLight) => {
      ambientLight.diffuseIntensity = 0.5;
      ambientLight.specularIntensity = 0.5;
      scene.ambientLight = ambientLight;
    });

  // loadModel
  engine.resourceManager
    .load<GLTFResource>("https://gw.alipayobjects.com/os/H5App-BJ/1669174661711-gltf/female_character/scene/scene.gltf")
    .then((resource) => {
      root.addChild(resource.defaultSceneRoot);
      const materials = resource.materials;
      materials?.forEach((m) => {
        // m.renderFace = RenderFace.Front;
        // m.isTransparent = true;
        // m.baseColor.a = 0.5;
      });
    });
});
