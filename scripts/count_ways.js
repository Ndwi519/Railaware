const fs = require('fs');
const path = require('path');
const { indexOverpassElements } = require('../server/corridor-resolver/corridor-graph.js');

const rawData = fs.readFileSync(path.join(__dirname, '../server/fixtures/ndls_success.json'), 'utf-8');
const data = JSON.parse(rawData);

const { ways } = indexOverpassElements(data.elements);
console.log(`Total ways: ${ways.size}`);
