import { Engine, ModelMesh, Vector2, Vector3 } from "oasis-engine";

declare const my: any;

export const wait = async (time) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

export function createPlane(engine: Engine): ModelMesh {
  const mesh = new ModelMesh(engine);
  mesh.isGCIgnored = true;
  const indices = new Uint8Array([1, 2, 0, 1, 3, 2]);

  const positions: Vector3[] = new Array(4);
  const uvs: Vector2[] = new Array(4);

  for (let i = 0; i < 4; ++i) {
    positions[i] = new Vector3();
    uvs[i] = new Vector2(i % 2, 1 - ((i * 0.5) | 0));
  }
  positions[0].setValue(-1, -1, 1);
  positions[1].setValue(1, -1, 1);
  positions[2].setValue(-1, 1, 1);
  positions[3].setValue(1, 1, 1);

  mesh.setPositions(positions);
  mesh.setUVs(uvs);
  mesh.setIndices(indices);

  mesh.uploadData(false);
  mesh.addSubMesh(0, indices.length);
  return mesh;
}

// TODO 需要特定的包才可用
export function showFuCard(cardId) {
  return new Promise((resolve, reject) => {
    my.call("AlipayNewYearNebulaPlugin.showFuCard", {
      showFuCard: cardId, //  -----base64之后的新pb序列化的字符串 (必选)*
      sourceType: "airFu", // ----来源类型,用于区分来源，并且进行埋点统计(必选)
      success: (res) => {
        resolve(res);
      },
      fail: (e) => {
        reject(e);
      },
    });
  });
}

export function clipCanvasToBase64(
  canvasSrc: HTMLCanvasElement,
  canvasDest: HTMLCanvasElement,
  bounds: number[],
  useWhiteBackground: boolean = true
) {
  const srcWidth = bounds[2] - bounds[0];
  const srcHeight = bounds[3] - bounds[1];
  const ctx = canvasDest.getContext("2d");
  ctx.clearRect(0, 0, canvasDest.width, canvasDest.height);
  if (useWhiteBackground) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasDest.width, canvasDest.height);
  }

  const [distX, distY, distWidth, distHeight] = getDistDimension(
    srcWidth,
    srcHeight,
    canvasDest.width,
    canvasDest.height
  );

  ctx.drawImage(
    canvasSrc,
    bounds[0],
    bounds[1],
    srcWidth,
    srcHeight,
    distX,
    distY,
    distWidth,
    distHeight
  );

  // @ts-ignore
  return canvasDest.context.toDataURL("image/png", 0.5);
}

export function getDistDimension(
  sw: number,
  sh: number,
  dw: number,
  dh: number
): [number, number, number, number] {
  const sa = sw / sh;
  const ta = dw / dh;
  if (sa > ta) {
    const h = dw / sa;
    const dy = (dh - h) / 2;
    return [0, dy, dw, h];
  }
  const w = dh * sa;
  const dx = (dw - w) / 2;
  return [dx, 0, w, dh];
}

// 福气广场前置参数：省份名称、模型url、size、maxSize、系统
declare const startupParams: {
  provinceName: string;
  provinceFuData: string;
  provinceSize: number;
  provinceMaxSize: number;
};
export async function fetchSquareInfos() {
  const platform = await getPlatform();

  const infos = {
    provinceTitle: `来自${startupParams.provinceName || "浙江省"}的福字`,
    provinceFuData:
      startupParams.provinceFuData ||
      "https://gw.alipayobjects.com/os/bmw-prod/ea889d82-6ed4-4eac-bf09-96cc1d9cb093.glb",
    provinceSize: startupParams.provinceSize || 5,
    provinceMaxSize: startupParams.provinceMaxSize || 20,
    isIOS: platform === "iOS",
  };
  return infos;
}

export async function getPlatform() {
  return new Promise((resolve, reject) => {
    my.getSystemInfo({
      success: (res: any) => {
        resolve(res.platform);
      },
    });
  });
}
