#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET = path.join(ROOT, "data", "geo", "skorea-provinces-2018-geo.json");
const PRECISION = 6;

const FACTOR = 10 ** PRECISION;

function roundCoord(value) {
  return Math.round(value * FACTOR) / FACTOR;
}

function simplifyRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;

  const out = [];
  let prevX = Number.NaN;
  let prevY = Number.NaN;

  for (const point of ring) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const x = roundCoord(Number(point[0]));
    const y = roundCoord(Number(point[1]));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x === prevX && y === prevY) continue;
    out.push([x, y]);
    prevX = x;
    prevY = y;
  }

  if (out.length === 0) return ring;

  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    out.push([first[0], first[1]]);
  }

  if (out.length < 4) return ring;
  return out;
}

function optimizeGeometry(geometry) {
  if (!geometry || typeof geometry !== "object") return geometry;

  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: (geometry.coordinates || []).map((ring) => simplifyRing(ring)),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: (geometry.coordinates || []).map((poly) =>
        (poly || []).map((ring) => simplifyRing(ring)),
      ),
    };
  }

  return geometry;
}

function main() {
  const raw = readFileSync(TARGET, "utf8");
  const json = JSON.parse(raw);

  const features = Array.isArray(json.features) ? json.features : [];
  for (const feature of features) {
    feature.geometry = optimizeGeometry(feature.geometry);
  }

  writeFileSync(TARGET, JSON.stringify(json));
  const beforeBytes = Buffer.byteLength(raw);
  const afterBytes = Buffer.byteLength(JSON.stringify(json));
  const delta = beforeBytes - afterBytes;
  const savedRatio = beforeBytes > 0 ? (delta / beforeBytes) * 100 : 0;

  console.log(`optimized: ${path.relative(ROOT, TARGET)}`);
  console.log(`before: ${beforeBytes} bytes`);
  console.log(`after:  ${afterBytes} bytes`);
  console.log(`saved:  ${delta} bytes (${savedRatio.toFixed(2)}%)`);
}

main();
