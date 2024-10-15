/**
 * @title Post Process
 * @category Material
 */
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  BloomDownScaleMode,
  Camera,
  DirectLight,
  GLTFResource,
  Logger,
  MeshRenderer,
  PBRMaterial,
  PrimitiveMesh,
  ShadowType,
  SkyBoxMaterial,
  Texture2D,
  TonemappingMode,
  Vector3,
  WebGLEngine
} from "@galacean/engine";
import { ShaderLab } from "@galacean/engine-shader-lab";
import { OrbitControl, Stats } from "@galacean/engine-toolkit";
import * as dat from "dat.gui";
import vConsole from "vconsole";
new vConsole();
Logger.enable();
const gui = new dat.GUI();

const shaderLab = new ShaderLab();

WebGLEngine.create({
  canvas: "canvas",
  shaderLab
}).then((engine) => {
  window.onresize = () => {
    engine.canvas.resizeByClientSize();
  };
  engine.canvas.resizeByClientSize();

  const scene = engine.sceneManager.activeScene;
  const rootEntity = scene.createRootEntity();

  const cameraEntity = rootEntity.createChild("camera");
  const camera = cameraEntity.addComponent(Camera);
  cameraEntity.addComponent(Stats);
  camera.enableHDR = true;

  cameraEntity.transform.setPosition(0, 1, 10);
  const control = cameraEntity.addComponent(OrbitControl);

  const lightEntity = rootEntity.createChild();
  const light = lightEntity.addComponent(DirectLight);
  // lightEntity.transform.setRotation(-50, -30, 0);
  lightEntity.transform.setPosition(1, 1, 0);
  lightEntity.transform.lookAt(new Vector3(0));
  light.shadowType = ShadowType.Hard;
  light.shadowStrength = 2;

  engine.resourceManager
    .load<GLTFResource>({
      type: AssetType.GLTF,
      url: "https://gw.alipayobjects.com/os/bmw-prod/a1da72a4-023e-4bb1-9629-0f4b0f6b6fc4.glb"
    })
    .then((glTF) => {
      const entity = rootEntity.createChild();
      const mesh = PrimitiveMesh.createSphere(engine, 2, 64);
      // const mesh = PrimitiveMesh.createPlane(engine, 2, 2);
      const material = new PBRMaterial(engine);
      const renderer = entity.addComponent(MeshRenderer);
      renderer.mesh = mesh;
      renderer.setMaterial(material);
      material.roughness = 0;
      material.metallic = 1;
    });

  engine.resourceManager
    .load<AmbientLight>({
      type: AssetType.Env,
      url: "https://mdn.alipayobjects.com/oasis_be/afts/file/A*i93mQb39ON4AAAAAAAAAAAAADkp5AQ/ambient.bin"
      // url: "https://gw.alipayobjects.com/os/bmw-prod/89c54544-1184-45a1-b0f5-c0b17e5c3e68.bin" // sun_set
    })
    .then(async (ambientLight) => {
      scene.ambientLight = ambientLight;
      // Create sky
      const sky = scene.background.sky;
      const skyMaterial = new SkyBoxMaterial(engine);
      scene.background.mode = BackgroundMode.Sky;

      sky.material = skyMaterial;
      sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);
      skyMaterial.texture = ambientLight.specularTexture;
      skyMaterial.textureDecodeRGBM = true;

      // test post process
      camera.enablePostProcess = true;
      // camera.enableHDR = true;
      // camera.msaaSamples = 4;

      const bloomEffect = scene._postProcessManager._bloomEffect;
      const tonemappingEffect = scene._postProcessManager._tonemappingEffect;

      bloomEffect.enabled = true;
      tonemappingEffect.enabled = true;
      tonemappingEffect.mode = TonemappingMode.ACES;

      bloomEffect.dirtIntensity = 0;

      const debugInfo = {
        tint: [255, 255, 255],
        downScale: "Half",
        mode: "ACES",
        test: false
      };

      const cameraFolder = gui.addFolder("camera");
      cameraFolder.open();
      cameraFolder.add(camera, "enablePostProcess");
      cameraFolder.add(camera, "enableHDR");
      cameraFolder.add(camera, "msaaSamples", 0, 8);
      const bloomFolder = gui.addFolder("Bloom");
      bloomFolder.open();
      bloomFolder.add(bloomEffect, "enabled");
      bloomFolder.add(bloomEffect, "highQualityFiltering");
      bloomFolder.add(bloomEffect, "threshold", 0, 2, 0.01);
      bloomFolder.add(bloomEffect, "scatter", 0, 1, 0.01);
      bloomFolder.add(bloomEffect, "intensity", 0, 10, 0.01);
      bloomFolder.add(bloomEffect, "dirtIntensity", 0, 10, 0.01);
      bloomFolder.add(debugInfo, "downScale", ["Half", "Quarter"]).onChange((v) => {
        bloomEffect.downScale = v === "Half" ? BloomDownScaleMode.Half : BloomDownScaleMode.Quarter;
      });

      bloomFolder.addColor(debugInfo, "tint").onChange((v) => {
        bloomEffect.tint.copyFromArray(v).scale(1 / 255);
        bloomEffect.tint.a = 1;
      });

      const dirtTexture = await engine.resourceManager.load<Texture2D>({
        type: AssetType.Texture2D,
        url: "https://mdn.alipayobjects.com/huamei_dmxymu/afts/img/A*tMeTQ4Mx60oAAAAAAAAAAAAADuuHAQ/original"
      });
      bloomEffect.dirtTexture = dirtTexture;

      const toneFolder = gui.addFolder("Tonemapping");
      toneFolder.open();
      toneFolder.add(tonemappingEffect, "enabled");
      toneFolder.add(debugInfo, "mode", ["Neutral", "ACES"]).onChange((v) => {
        switch (v) {
          case "Neutral":
            tonemappingEffect.mode = TonemappingMode.Neutral;
            break;
          case "ACES":
            tonemappingEffect.mode = TonemappingMode.ACES;
            break;
        }
      });

      toneFolder.add(debugInfo, "test").onChange((v) => {
        tonemappingEffect.test = !!v;
      });
    }),
    engine.run();
});
