const fs = require('fs');
const path = require('path');
const { indexOverpassElements } = require('../server/corridor-resolver/corridor-graph.js');

const rawData = fs.readFileSync(path.join(__dirname, '../server/fixtures/ndls_success.json'), 'utf-8');
const data = JSON.parse(rawData);

const { ways } = indexOverpassElements(data.elements);

const way1 = ways.get(1317674192);
const way2 = ways.get(77366984);

console.log("Way 1317674192 nodes:", way1 ? way1.nodeIds : 'not found');
console.log("Way 77366984 nodes:", way2 ? way2.nodeIds : 'not found');

if (way1 && way2) {
    const shared = way1.nodeIds.filter(n => way2.nodeIds.includes(n));
    console.log("Shared nodes:", shared);
}
