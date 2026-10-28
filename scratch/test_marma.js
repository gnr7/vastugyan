import { calculateMarmaSthan, calculatePolygonCentroid } from '../js/geometry.js';

const polygon = [
  { x: 100, y: 100 },
  { x: 500, y: 100 },
  { x: 500, y: 500 },
  { x: 100, y: 500 }
];

const centroid = calculatePolygonCentroid(polygon);
const marma0 = calculateMarmaSthan(polygon, centroid, 0);
console.log('Rotation 0deg:');
console.log('Lines count:', marma0.lines.length);
console.log('Points count:', marma0.marmaPoints.length);
console.log('Points:', marma0.marmaPoints.map(p => `${p.name}: (${Math.round(p.x)}, ${Math.round(p.y)})`));

const marma25 = calculateMarmaSthan(polygon, centroid, 25);
console.log('\nRotation 25deg:');
console.log('Lines count:', marma25.lines.length);
console.log('Points count:', marma25.marmaPoints.length);
console.log('Center point at 25deg:', Math.round(marma25.marmaPoints[0].x), Math.round(marma25.marmaPoints[0].y));
console.log('Centroid:', Math.round(centroid.x), Math.round(centroid.y));
console.log('Center matches centroid:', Math.round(marma25.marmaPoints[0].x) === Math.round(centroid.x) && Math.round(marma25.marmaPoints[0].y) === Math.round(centroid.y));
