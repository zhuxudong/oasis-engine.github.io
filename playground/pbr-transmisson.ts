/**
 * @title PBR Transmission
 * @category Material
 */
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  Camera,
  Logger,
  MeshRenderer,
  PBRMaterial,
  PrimitiveMesh,
  RenderFace,
  Scene,
  SkyBoxMaterial,
  Texture2D,
  WebGLEngine
} from "@galacean/engine";
import { OrbitControl } from "@galacean/engine-toolkit-controls";
import * as dat from "dat.gui";

const gui = new dat.GUI();
Logger.enable();

WebGLEngine.create({
  canvas: "canvas",
  graphicDeviceOptions: {
    alpha: true
  }
}).then((engine) => {
  init(engine);
});
function init(engine: WebGLEngine) {
  // Create engine object
  engine.canvas.resizeByClientSize();

  engine.run();

  engine.resourceManager
    .load<Scene>({
      type: AssetType.Scene,
      // url: "https://mdn.alipayobjects.com/oasis_be/afts/file/A*PXxeS44EzXgAAAAAAAAAAAAADkp5AQ/scene.json"
      url: "https://mdn.alipayobjects.com/oasis_be/afts/file/A*1EjYTrsEX4EAAAAAAAAAAAAADkp5AQ/scene.json"
    })
    .then((scene) => {
      scene.getRootEntity(1)!.isActive = false;
      // scene.ambientLight.specularIntensity=0.3;
      // scene.ambientLight.diffuseIntensity=0.3;
      const camera = scene.getRootEntity(0);
      camera?.addComponent(OrbitControl).target.set(0, 1.3, 0);
      camera!.transform.position.z = 1.5;
      engine.sceneManager.activeScene = scene;
      const material = scene
        .getRootEntity(4)
        ?.findByName("MS_Eyeglass")
        .getComponent(MeshRenderer)
        .getMaterial() as PBRMaterial;

      const root = scene.createRootEntity();
      const entity = root.createChild();
      entity.transform.setPosition(0.25, 1.4, 0);
      const renderer = entity.addComponent(MeshRenderer);
      renderer.mesh = PrimitiveMesh.createSphere(engine, 0.1, 64);
      renderer.setMaterial(material);

      const entity2 = root.createChild();
      entity2.transform.setPosition(0.5, 1.4, 0);
      const renderer2 = entity2.addComponent(MeshRenderer);
      renderer2.mesh = PrimitiveMesh.createSphere(engine, 0.1, 64);
      renderer2.setMaterial(material);

      debugMaterial(material);
      changeIBL(engine);
    });
}

function changeIBL(engine: WebGLEngine) {
  const scene = engine.sceneManager.activeScene;
  const { background } = scene;
  // Create sky
  const sky = background.sky;
  const skyMaterial = new SkyBoxMaterial(engine);
  background.mode = BackgroundMode.Sky;

  sky.material = skyMaterial;
  sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);

  const originalAmbient = scene.ambientLight;
  skyMaterial.texture = originalAmbient.specularTexture;
  skyMaterial.textureDecodeRGBM = true;

  const envList = [
    "original",
    "video",
    "footPrint",
    "alps_field_1k",
    "autoshop_256",
    "belfast_sunset_256",
    "belfast_sunset_puresky_256",
    "blocky_photo_studio_1k",
    "brown_photostudio_02_1k",
    "canary_256",
    "christmas_256",
    "dresden_256",
    "hospital_room_1k",
    "kloppenheim_06_puresky_1k",
    "neuer_256",
    "studio_256",
    "zwinger_night_256"
  ];

  gui.add({ env: "original" }, "env", envList).onChange((v) => {
    let url = `/public/${v}.hdr.env`;
    if (v === "original") {
      scene.ambientLight = originalAmbient;
    } else {
      engine.resourceManager
        .load<AmbientLight>({
          type: AssetType.Env,
          url
        })
        .then((ambientLight) => {
          scene.ambientLight = ambientLight;
          skyMaterial.texture = ambientLight.specularTexture;
          skyMaterial.textureDecodeRGBM = true;
        });
    }
  });
}

async function debugMaterial(material: PBRMaterial) {
  const engine = material.engine;
  material.isTransparent = true;
  material.renderFace = RenderFace.Front;
  material.metallic = 0;
  material.roughness = 0;
  // material.baseTexture=null;
  const normalTexture = await engine.resourceManager.load<Texture2D>("/public/test.png");
  material.normalTexture = normalTexture;
  const debugInfo = {
    opacity: 1,
    color: [255, 255, 255],
    openTransmission: true,
    double: false
  };

  gui.add(material, "metallic", 0, 1, 0.01);
  gui.add(material, "roughness", 0, 1, 0.01);
  gui.add(material, "ior", 1, 5, 0.01);
  gui.add(debugInfo, "opacity", 0, 1, 0.01).onChange((value) => {
    material.baseColor.a = value;
  });

  gui.addColor(debugInfo, "color").onChange((v) => {
    // @ts-ignore
    material.baseColor.set(...v.map((v) => v / 255), debugInfo.opacity);
  });

  gui.add(debugInfo, "double").onChange((v) => {
    if (v) {
      material.renderFace = RenderFace.Double;
    } else {
      material.renderFace = RenderFace.Front;
    }
  });
}
