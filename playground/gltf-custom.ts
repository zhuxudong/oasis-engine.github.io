/**
 * @title glTF custom
 * @category Animation
 */
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  Camera,
  DirectLight,
  GLTFBufferParser,
  GLTFEntityParser,
  GLTFMaterialParser,
  GLTFMeshParser,
  GLTFParser,
  GLTFPipeline,
  GLTFResource,
  GLTFSceneParser,
  GLTFTextureParser,
  GLTFValidator,
  PrimitiveMesh,
  SkyBoxMaterial,
  WebGLEngine,
  Logger,
  registerGLTFExtension,
  GLTFExtensionParser,
  IKHRMaterialsPbrSpecularGlossiness,
  GLTFParserContext,
  UnlitMaterial,
  GLTFExtensionMode,
  Material,
  PBRSpecularMaterial
} from "@galacean/engine";

Logger.enable();
//-- create engine object
const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const { ambientLight, background } = scene;
const rootEntity = scene.createRootEntity();

const directLightNode = rootEntity.createChild("dir_light");
const directLightNode2 = rootEntity.createChild("dir_light2");
directLightNode.addComponent(DirectLight);
directLightNode2.addComponent(DirectLight);
directLightNode.transform.setRotation(30, 0, 0);
directLightNode2.transform.setRotation(-30, 180, 0);

//Create camera
const cameraNode = rootEntity.createChild("camera_node");
cameraNode.transform.setPosition(0, 0, 1);
cameraNode.addComponent(Camera);
// cameraNode.addComponent(OrbitControl);

// Create sky
const sky = background.sky;
const skyMaterial = new SkyBoxMaterial(engine);
background.mode = BackgroundMode.Sky;

sky.material = skyMaterial;
sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);

@registerGLTFExtension("KHR_materials_pbrSpecularGlossiness", GLTFExtensionMode.AdditiveParse)
class UnityMaterialPluginParser extends GLTFExtensionParser {
  // createAndParse(context: GLTFParserContext, schema: IKHRMaterialsPbrSpecularGlossiness): Material {
  //   const { engine } = context.glTFResource;
  //   const yourCustomMaterial = new UnlitMaterial(engine);
  //   return yourCustomMaterial;
  // }

  additiveParse(
    context: GLTFParserContext,
    material: PBRSpecularMaterial,
    schema: IKHRMaterialsPbrSpecularGlossiness
  ): void {
    material.baseColor.set(1, 0, 0);
  }
}

Promise.all([
  engine.resourceManager
    .load<GLTFResource>({
      type: AssetType.Prefab,
      // url: "https://gw.alipayobjects.com/os/bmw-prod/150e44f6-7810-4c45-8029-3575d36aff30.gltf"
      url: "https://gw.alipayobjects.com/os/bmw-prod/3cf50452-0015-461e-a172-7ea1f8135e53.gltf", // specular
      params: {
        pipeline: new GLTFPipeline(
          GLTFBufferParser,
          // GLTFValidator,
          GLTFTextureParser,
          GLTFMaterialParser,
          GLTFMeshParser,
          GLTFEntityParser,
          // GLTFSkinParser,
          // GLTFAnimationParser,
          GLTFSceneParser
        )
      }
    })
    .then((gltf) => {
      const entity = rootEntity.createChild("");
      entity.addChild(gltf.defaultSceneRoot);
      console.log(gltf);
    }),
  // engine.resourceManager
  //   .load<Scene>({
  //     type: AssetType.Scene,
  //     url: "https://mdn.alipayobjects.com/oasis_be/afts/file/A*P9qpR6Gn36EAAAAAAAAAAAAADkp5AQ/1676974642558_scene.json"
  //   })
  //   .then((scene) => {
  //     engine.sceneManager.activeScene = scene;
  //   }),
  engine.resourceManager
    .load<AmbientLight>({
      type: AssetType.Env,
      url: "https://gw.alipayobjects.com/os/bmw-prod/f369110c-0e33-47eb-8296-756e9c80f254.bin"
    })
    .then((ambientLight) => {
      scene.ambientLight = ambientLight;
      skyMaterial.textureCubeMap = ambientLight.specularTexture;
      skyMaterial.textureDecodeRGBM = true;
    })
]).then(() => {
  engine.run();
});
