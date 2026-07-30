const { findNearestCorridorPoint } = require('../server/calculations/nearest-corridor.js');

const point = { lat: 10.00010, lng: 20.00110 };
const corridors = [
    { id: '1', geometry: [[10.00000, 20.00000], [10.00000, 20.00100]] },
    { id: '2', geometry: [[10.00000, 20.00100], [10.00000, 20.00200]] }
];

console.log("Nearest corridor:", findNearestCorridorPoint(point, corridors));
