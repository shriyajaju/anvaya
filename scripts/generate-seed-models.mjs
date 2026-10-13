import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public/seed-models");

function box(width, height, depth) {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const positions = [
    -x, -y, -z, x, -y, -z, x, y, -z, -x, y, -z,
    -x, -y, z, x, -y, z, x, y, z, -x, y, z,
  ];
  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    3, 2, 6, 3, 6, 7,
    0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2,
  ];
  return { positions, indices };
}

function prism(width, height, depth) {
  const x = width / 2;
  const z = depth / 2;
  const positions = [
    -x, 0, -z,
    x, 0, -z,
    0, height, -z,
    -x, 0, z,
    x, 0, z,
    0, height, z,
  ];
  const indices = [
    0, 1, 2,
    3, 5, 4,
    0, 3, 4, 0, 4, 1,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
  ];
  return { positions, indices };
}

function glb({ positions, indices }) {
  const pos = Float32Array.from(positions);
  const idx = Uint16Array.from(indices);
  const posBuf = Buffer.from(pos.buffer);
  const idxBuf = Buffer.from(idx.buffer);
  const posPad = (4 - (posBuf.length % 4)) % 4;
  const bin = Buffer.concat([
    posBuf,
    Buffer.alloc(posPad),
    idxBuf,
    Buffer.alloc((4 - ((posBuf.length + posPad + idxBuf.length) % 4)) % 4),
  ]);
  const idxOffset = posBuf.length + posPad;
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[i + axis]);
      max[axis] = Math.max(max[axis], positions[i + axis]);
    }
  }

  const json = JSON.stringify({
    asset: { version: "2.0", generator: "anvaya-seed-models" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
        min,
        max,
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: indices.length,
        type: "SCALAR",
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBuf.length, target: 34963 },
    ],
    buffers: [{ byteLength: bin.length }],
  });

  const jsonBuf = Buffer.from(json);
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.write("JSON", 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.write("BIN\0", 4);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]);
}

const models = {
  "existing-remains": box(4, 1.2, 3),
  "roof-prism": prism(2.4, 1.1, 2),
  lintel: box(2.2, 0.28, 0.35),
  "frieze-band": box(2.2, 0.18, 0.12),
  "cistern-cover": box(1.4, 0.12, 1.4),
};

mkdirSync(outDir, { recursive: true });
for (const [name, mesh] of Object.entries(models)) {
  const file = glb(mesh);
  const path = join(outDir, `${name}.glb`);
  writeFileSync(path, file);
  console.log(`${name}.glb ${file.length}`);
}
