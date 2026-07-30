const fs = require('fs');
const path = require('path');
const { indexOverpassElements } = require('../server/corridor-resolver/corridor-graph.js');
const { projectPointOntoCorridor } = require('../server/calculations/projection.js');

const rawData = fs.readFileSync(path.join(__dirname, '../server/fixtures/ndls_success.json'), 'utf-8');
const data = JSON.parse(rawData);

const { nodeCoords, ways } = indexOverpassElements(data.elements);

let minSpacing = Infinity;
let count = 0;

const waysArray = Array.from(ways.values());

for (let i = 0; i < waysArray.length; i++) {
    for (let j = i + 1; j < waysArray.length; j++) {
        const wayA = waysArray[i];
        const wayB = waysArray[j];
        
        // Pick mid-point of way A
        const midIdx = Math.floor(wayA.nodeIds.length / 2);
        const pt = nodeCoords.get(wayA.nodeIds[midIdx]);
        if (!pt) continue;

        const coordsB = wayB.nodeIds.map(n => nodeCoords.get(n)).filter(Boolean);
        if (coordsB.length < 2) continue;

        const proj = projectPointOntoCorridor(pt, coordsB);
        if (proj && proj.crossTrackDistanceMetres > 0.5 && proj.crossTrackDistanceMetres < 50) {
            if (proj.crossTrackDistanceMetres < minSpacing) {
                minSpacing = proj.crossTrackDistanceMetres;
            }
            if (proj.crossTrackDistanceMetres < 10) {
                count++;
            }
        }
    }
}

console.log(`Min spacing found: ${minSpacing.toFixed(2)} m`);
console.log(`Pairs with < 10m spacing: ${count}`);
