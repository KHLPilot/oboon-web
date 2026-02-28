#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IMPORT_DIR = path.join(ROOT, "data", "geo", "imports", "provinces");
const TARGET_GEOJSON = path.join(ROOT, "data", "geo", "skorea-provinces-2018-geo.json");

const FILE_TO_REGION_NAMES = {
  "seoul.gpkg": ["서울특별시"],
  "incheon.gpkg": ["인천광역시"],
  "busan.gpkg": ["부산광역시"],
  "daegu.gpkg": ["대구광역시"],
  "gwangju.gpkg": ["광주광역시"],
  "daejeon.gpkg": ["대전광역시"],
  "ulsan.gpkg": ["울산광역시"],
  "sejong.gpkg": ["세종특별자치시"],
  "gangwon.gpkg": ["강원특별자치도", "강원도"],
  "chungbuk.gpkg": ["충청북도"],
  "chungnam.gpkg": ["충청남도"],
  "jeonbuk.gpkg": ["전북특별자치도", "전라북도"],
  "jeonnam.gpkg": ["전라남도"],
  "gyeongbuk.gpkg": ["경상북도"],
  "gyeongnam.gpkg": ["경상남도"],
  "jeju.gpkg": ["제주특별자치도"],
};

const GYEONGGI_FILES = ["gyeonggi-south.gpkg", "gyeonggi_north.gpkg"];
const GYEONGGI_REGION_NAMES = ["경기도"];
const GYEONGGI_NORTH_REGION_NAMES = ["경기북부"];
const GYEONGGI_SOUTH_REGION_NAMES = ["경기남부"];
const SEOUL_GU_FILE_TO_REGION_NAME = {
  "gangnam.gpkg": "서울특별시 강남구",
  "gangdong.gpkg": "서울특별시 강동구",
  "gangbuk.gpkg": "서울특별시 강북구",
  "gangseo.gpkg": "서울특별시 강서구",
  "gwanak.gpkg": "서울특별시 관악구",
  "gwangjin.gpkg": "서울특별시 광진구",
  "guro.gpkg": "서울특별시 구로구",
  "geumcheon.gpkg": "서울특별시 금천구",
  "nowon.gpkg": "서울특별시 노원구",
  "dobong.gpkg": "서울특별시 도봉구",
  "dongdaemun.gpkg": "서울특별시 동대문구",
  "dongjak.gpkg": "서울특별시 동작구",
  "mapo.gpkg": "서울특별시 마포구",
  "seodaemun.gpkg": "서울특별시 서대문구",
  "secho.gpkg": "서울특별시 서초구",
  "seongdong.gpkg": "서울특별시 성동구",
  "seongbuk.gpkg": "서울특별시 성북구",
  "songpa.gpkg": "서울특별시 송파구",
  "yangcheon.gpkg": "서울특별시 양천구",
  "yeongdeungpo.gpkg": "서울특별시 영등포구",
  "yongsan.gpkg": "서울특별시 용산구",
  "eunpyeong.gpkg": "서울특별시 은평구",
  "jongno.gpkg": "서울특별시 종로구",
  "jung.gpkg": "서울특별시 중구",
  "jungnang.gpkg": "서울특별시 중랑구",
};

function sql(file, query) {
  return execFileSync("sqlite3", [file, query], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
  }).trim();
}

function getFeatureTable(file) {
  const rows = sql(
    file,
    "select table_name||'|'||srs_id from gpkg_contents where data_type='features' order by case when srs_id=4326 then 0 else 1 end, table_name;",
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    throw new Error(`No features table in ${file}`);
  }
  const [tableName, srsIdText] = rows[0].split("|");
  return { tableName, srsId: Number(srsIdText) };
}

function getGeomColumn(file, tableName) {
  const col = sql(
    file,
    `select column_name from gpkg_geometry_columns where table_name='${tableName}';`,
  );
  if (!col) {
    throw new Error(`No geometry column in ${file}:${tableName}`);
  }
  return col;
}

function deg(value) {
  return (value * Math.PI) / 180;
}

function rad(value) {
  return (value * 180) / Math.PI;
}

function buildEpsg5179ToWgs84() {
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const b = a * (1 - f);
  const e2 = 1 - (b * b) / (a * a);
  const ep2 = (a * a - b * b) / (b * b);
  const k0 = 0.9996;
  const lon0 = deg(127.5);
  const lat0 = deg(38.0);
  const x0 = 1000000.0;
  const y0 = 2000000.0;

  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const A0 = 1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256;
  const A2 = (3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024;
  const A4 = (15 * e4) / 256 + (45 * e6) / 1024;
  const A6 = (35 * e6) / 3072;

  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;

  function M(phi) {
    return a * (A0 * phi - A2 * Math.sin(2 * phi) + A4 * Math.sin(4 * phi) - A6 * Math.sin(6 * phi));
  }

  const M0 = M(lat0);

  return function toWgs84(x, y) {
    const M1 = M0 + (y - y0) / k0;
    const mu = M1 / (a * A0);

    const phi1 =
      mu +
      j1 * Math.sin(2 * mu) +
      j2 * Math.sin(4 * mu) +
      j3 * Math.sin(6 * mu) +
      j4 * Math.sin(8 * mu);

    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const tanPhi1 = Math.tan(phi1);

    const C1 = ep2 * cosPhi1 * cosPhi1;
    const T1 = tanPhi1 * tanPhi1;
    const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
    const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
    const D = (x - x0) / (N1 * k0);

    const D2 = D * D;
    const D3 = D2 * D;
    const D4 = D2 * D2;
    const D5 = D4 * D;
    const D6 = D4 * D2;

    const lat =
      phi1 -
      (N1 * tanPhi1) /
        R1 *
        (D2 / 2 -
          ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D4) / 24 +
          ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D6) / 720);

    const lon =
      lon0 +
      (D -
        ((1 + 2 * T1 + C1) * D3) / 6 +
        ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D5) / 120) /
        cosPhi1;

    return [rad(lon), rad(lat)];
  };
}

const transform5179 = buildEpsg5179ToWgs84();

function envelopeBytes(envelopeIndicator) {
  if (envelopeIndicator === 0) return 0;
  if (envelopeIndicator === 1) return 32;
  if (envelopeIndicator === 2 || envelopeIndicator === 3) return 48;
  if (envelopeIndicator === 4) return 64;
  throw new Error(`Unsupported envelope indicator: ${envelopeIndicator}`);
}

function parseWkbGeometry(buffer, offset = 0) {
  let p = offset;
  const endian = buffer.readUInt8(p);
  p += 1;
  const little = endian === 1;

  const readUInt32 = () => {
    const v = little ? buffer.readUInt32LE(p) : buffer.readUInt32BE(p);
    p += 4;
    return v;
  };
  const readDouble = () => {
    const v = little ? buffer.readDoubleLE(p) : buffer.readDoubleBE(p);
    p += 8;
    return v;
  };

  const rawType = readUInt32();
  let hasZ = false;
  let hasM = false;
  let type = rawType;
  if (type >= 3000) {
    type -= 3000;
    hasZ = true;
    hasM = true;
  } else if (type >= 2000) {
    type -= 2000;
    hasM = true;
  } else if (type >= 1000) {
    type -= 1000;
    hasZ = true;
  }
  const pointStride = 16 + (hasZ ? 8 : 0) + (hasM ? 8 : 0);

  function readPoint() {
    const x = readDouble();
    const y = readDouble();
    if (hasZ) p += 8;
    if (hasM) p += 8;
    return [x, y];
  }

  function readRing() {
    const n = readUInt32();
    const ring = new Array(n);
    for (let i = 0; i < n; i += 1) {
      ring[i] = readPoint();
    }
    return ring;
  }

  if (type === 3) {
    const ringCount = readUInt32();
    const rings = new Array(ringCount);
    for (let i = 0; i < ringCount; i += 1) {
      rings[i] = readRing();
    }
    return { geometry: { type: "Polygon", coordinates: rings }, offset: p, pointStride };
  }

  if (type === 6) {
    const polyCount = readUInt32();
    const polygons = [];
    for (let i = 0; i < polyCount; i += 1) {
      const parsed = parseWkbGeometry(buffer, p);
      p = parsed.offset;
      if (parsed.geometry.type !== "Polygon") {
        throw new Error(`MultiPolygon child is not Polygon: ${parsed.geometry.type}`);
      }
      polygons.push(parsed.geometry.coordinates);
    }
    return {
      geometry: { type: "MultiPolygon", coordinates: polygons },
      offset: p,
      pointStride,
    };
  }

  throw new Error(`Unsupported WKB geometry type: ${type} (raw=${rawType})`);
}

function parseGpkgGeomHex(hex) {
  const buf = Buffer.from(hex, "hex");
  if (buf.length < 8 || buf.toString("ascii", 0, 2) !== "GP") {
    throw new Error("Invalid GeoPackage geometry header");
  }
  const flags = buf.readUInt8(3);
  const envelopeIndicator = (flags >> 1) & 0x07;
  const little = (flags & 0x01) === 1;
  const srsId = little ? buf.readInt32LE(4) : buf.readInt32BE(4);
  const wkbOffset = 8 + envelopeBytes(envelopeIndicator);
  const parsed = parseWkbGeometry(buf, wkbOffset);
  return { srsId, geometry: parsed.geometry };
}

function transformCoords(coords, srsId) {
  if (srsId === 4326) return coords;
  if (srsId !== 5179) throw new Error(`Unsupported SRS ${srsId}`);
  return coords.map(([x, y]) => transform5179(x, y));
}

function transformGeometry(geometry, srsId) {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => transformCoords(ring, srsId)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => transformCoords(ring, srsId)),
      ),
    };
  }
  throw new Error(`Unsupported geometry type ${geometry.type}`);
}

function toMultiPolygon(geometry) {
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  if (geometry.type === "Polygon") return [geometry.coordinates];
  throw new Error(`Unsupported geometry for merge: ${geometry.type}`);
}

function collectMultiPolygonCoordinates(gpkgFileName) {
  const file = path.join(IMPORT_DIR, gpkgFileName);
  const { tableName, srsId: tableSrsId } = getFeatureTable(file);
  const geomCol = getGeomColumn(file, tableName);
  const lines = sql(
    file,
    `select hex("${geomCol}") from "${tableName}" where "${geomCol}" is not null;`,
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`No geometries in ${gpkgFileName}`);
  }

  const merged = [];
  for (const line of lines) {
    const parsed = parseGpkgGeomHex(line);
    const srsId = Number.isFinite(parsed.srsId) ? parsed.srsId : tableSrsId;
    const transformed = transformGeometry(parsed.geometry, srsId);
    merged.push(...toMultiPolygon(transformed));
  }
  return merged;
}

function replaceGeometryByNames(featureCollection, regionNames, multiPolygonCoords) {
  const features = featureCollection.features ?? [];
  const target = features.find((feature) => {
    const name = feature?.properties?.name?.trim();
    return Boolean(name && regionNames.includes(name));
  });
  if (!target) {
    throw new Error(`Target region not found: ${regionNames.join(", ")}`);
  }
  target.geometry = {
    type: "MultiPolygon",
    coordinates: multiPolygonCoords,
  };
}

function upsertFeatureByName(featureCollection, regionName, multiPolygonCoords) {
  const features = featureCollection.features ?? [];
  const found = features.find(
    (feature) => feature?.properties?.name?.trim() === regionName,
  );
  if (found) {
    found.geometry = { type: "MultiPolygon", coordinates: multiPolygonCoords };
    return;
  }
  features.push({
    type: "Feature",
    properties: { name: regionName },
    geometry: { type: "MultiPolygon", coordinates: multiPolygonCoords },
  });
  featureCollection.features = features;
}

function main() {
  const target = JSON.parse(readFileSync(TARGET_GEOJSON, "utf8"));

  for (const [fileName, regionNames] of Object.entries(FILE_TO_REGION_NAMES)) {
    const coords = collectMultiPolygonCoordinates(fileName);
    replaceGeometryByNames(target, regionNames, coords);
    console.log(`updated ${regionNames[0]} from ${fileName} polygons=${coords.length}`);
  }

  const gyeonggiSouthCoords = collectMultiPolygonCoordinates("gyeonggi-south.gpkg");
  const gyeonggiNorthCoords = collectMultiPolygonCoordinates("gyeonggi_north.gpkg");
  const gyeonggiCoords = [...gyeonggiSouthCoords, ...gyeonggiNorthCoords];
  replaceGeometryByNames(target, GYEONGGI_REGION_NAMES, gyeonggiCoords);
  upsertFeatureByName(target, GYEONGGI_NORTH_REGION_NAMES[0], gyeonggiNorthCoords);
  upsertFeatureByName(target, GYEONGGI_SOUTH_REGION_NAMES[0], gyeonggiSouthCoords);
  console.log(`updated 경기도 from ${GYEONGGI_FILES.join(" + ")} polygons=${gyeonggiCoords.length}`);
  console.log(`upserted 경기북부 polygons=${gyeonggiNorthCoords.length}`);
  console.log(`upserted 경기남부 polygons=${gyeonggiSouthCoords.length}`);

  for (const [fileName, regionName] of Object.entries(SEOUL_GU_FILE_TO_REGION_NAME)) {
    const coords = collectMultiPolygonCoordinates(fileName);
    upsertFeatureByName(target, regionName, coords);
    console.log(`upserted ${regionName} from ${fileName} polygons=${coords.length}`);
  }

  writeFileSync(TARGET_GEOJSON, JSON.stringify(target));
  console.log(`wrote ${TARGET_GEOJSON}`);
}

main();
