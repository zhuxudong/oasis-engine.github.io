import {
  Entity,
  MeshRenderer,
  MeshTopology,
  ModelMesh,
  PBRMaterial,
  Vector2,
  Vector3,
  WebGLEngine
} from "oasis-engine";

export class CharManager {
  _charEntity: Entity;
  _scaleFactor: number;
  material: PBRMaterial;

  _renderer: MeshRenderer;
  _cameraDistance = 10;

  constructor(private _engine: WebGLEngine, public container: Entity) {
    const charEntity = container.createChild("char");
    this._charEntity = charEntity;
    const renderer = charEntity.addComponent(MeshRenderer);
    this._renderer = renderer;
    this.material = new PBRMaterial(this._engine);
    this._renderer.setMaterial(this.material);
  }

  hide3DChar() {
    this._charEntity.isActive = false;
  }

  show3DChar() {
    this._charEntity.isActive = true;
  }

  updateMesh(result: any) {
    const { normal, position, uv, indices } = result;
    const positionLen = position.length / 3;
    const positions = [];
    const normals = [];
    const uvs = [];

    for (let i = 0; i < positionLen; i++) {
      const positionVector = new Vector3(position[i * 3], position[i * 3 + 1], position[i * 3 + 2]);
      positions.push(positionVector);

      const normalVector = new Vector3(normal[i * 3], normal[i * 3 + 1], normal[i * 3 + 2]);
      normals.push(normalVector);

      const uvVector = new Vector2(uv[i * 2], uv[i * 2 + 1]);
      uvs.push(uvVector);
    }

    const engine = this._engine;
    const mesh = new ModelMesh(engine);

    mesh.setIndices(indices);
    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setUVs(uvs);
    mesh.addSubMesh(0, indices.length, MeshTopology.Triangles);
    mesh.uploadData(true);
    this._renderer.mesh = mesh;
  }

  initPosition(arCamera: any, widthRatio: number, heightRatio: number) {
    // const projectionMatrix = camera.projectionMatrix;
    const canvasWidth = this._engine.canvas.width * widthRatio;
    const canvasHeight = this._engine.canvas.height * heightRatio;

    const halfPlaneHeight = this._cameraDistance * (1 / arCamera.transform[5]) * 1.000001;

    const halfPlaneWidth = (halfPlaneHeight / canvasHeight) * canvasWidth;
    const scaleFactor = (halfPlaneWidth / canvasWidth) * 2;
    this._charEntity.transform.setPosition(-halfPlaneWidth, halfPlaneHeight, -this._cameraDistance);

    this._scaleFactor = scaleFactor;
  }
}
