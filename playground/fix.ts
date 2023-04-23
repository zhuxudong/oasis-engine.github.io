/**
 * @title Fix
 * @category Animation
 */
import {
  AmbientLight,
  AssetType,
  BoundingBox,
  Camera,
  GLTFResource,
  Logger,
  MeshRenderer,
  PrimitiveMesh,
  UnlitMaterial,
  Vector3,
  WebGLEngine
} from "@galacean/engine";
import { OrbitControl, WireframeManager, WireframeManager } from "@galacean/engine-toolkit";
Logger.enable();
const engine = new WebGLEngine("canvas", {
  antialias: true,
  alpha: true
});
// engine
engine.canvas.resizeByClientSize();
const scene = engine.sceneManager.activeScene;
// scene.background.solidColor.set(0, 0, 0, 0);
engine.run();

// root
const root = scene.createRootEntity();

// camera
const cameraEntity = root.createChild("camera");
cameraEntity.addComponent(Camera);
cameraEntity.addComponent(OrbitControl).target.set(0, 0, 0);
cameraEntity.transform.position.set(0, 0, 1);

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

const wireframeManager = root.addComponent(WireframeManager);
// loadModel
engine.resourceManager
  .load<GLTFResource>({
    assetType: AssetType.Prefab,
    url: "https://mdn.alipayobjects.com/chain_myent/afts/file/ew1MRoLexJoAAAAAAAAAAAAADvN2AQBr#.gltf"
  })
  .then((resource) => {
    const { defaultSceneRoot, entities } = resource;

    root.addChild(defaultSceneRoot);
    console.log(resource);

    const renderers = defaultSceneRoot.getComponentsIncludeChildren(MeshRenderer, []);
    const boundingBox = renderers[0].bounds.clone();
    console.log(renderers);
    for (let i = renderers.length - 1; i > 0; i--) {
      const mesh = renderers[i].mesh;
      // if (mesh.name === "Bound") {
      // continue;
      // }
      BoundingBox.merge(boundingBox, renderers[i].bounds, boundingBox);
      wireframeManager.addRendererWireframe(renderers[i]);
    }

    const extent = new Vector3();
    boundingBox.getExtent(extent);
    console.log(boundingBox);
    const entity = root.createChild();
    const renderer = entity.addComponent(MeshRenderer);
    renderer.mesh = PrimitiveMesh.createCuboid(engine, extent.x * 2, extent.y * 2, extent.z * 2);
    const material = new UnlitMaterial(engine);
    material.isTransparent = true;
    material.baseColor.a = 0.5;
    renderer.setMaterial(material);
    console.log(extent);
  });
