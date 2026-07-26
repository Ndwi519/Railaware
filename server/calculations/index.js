Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "buildCorridorStationIndex", {
  enumerable: true,
  get: function () {
    return _stationIndex.buildCorridorStationIndex;
  }
});
Object.defineProperty(exports, "calculatePolylineLengthMetres", {
  enumerable: true,
  get: function () {
    return _polyline.calculatePolylineLengthMetres;
  }
});
Object.defineProperty(exports, "calculateUserSegmentFraction", {
  enumerable: true,
  get: function () {
    return _segmentFraction.calculateUserSegmentFraction;
  }
});
Object.defineProperty(exports, "computeEtaSeconds", {
  enumerable: true,
  get: function () {
    return _eta.computeEtaSeconds;
  }
});
Object.defineProperty(exports, "filterNoise", {
  enumerable: true,
  get: function () {
    return _noise.filterNoise;
  }
});
Object.defineProperty(exports, "findNearestCorridorPoint", {
  enumerable: true,
  get: function () {
    return _nearestCorridor.findNearestCorridorPoint;
  }
});
Object.defineProperty(exports, "haversineMetres", {
  enumerable: true,
  get: function () {
    return _haversine.haversineMetres;
  }
});
Object.defineProperty(exports, "interpolatePosition", {
  enumerable: true,
  get: function () {
    return _noise.interpolatePosition;
  }
});
Object.defineProperty(exports, "projectPointOntoCorridor", {
  enumerable: true,
  get: function () {
    return _projection.projectPointOntoCorridor;
  }
});
Object.defineProperty(exports, "selectBoundingStations", {
  enumerable: true,
  get: function () {
    return _stationSelection.selectBoundingStations;
  }
});
var _haversine = require("./haversine.js");
var _eta = require("./eta.js");
var _noise = require("./noise.js");
var _projection = require("./projection.js");
var _stationIndex = require("./station-index.js");
var _stationSelection = require("./station-selection.js");
var _polyline = require("./polyline.js");
var _nearestCorridor = require("./nearest-corridor.js");
var _segmentFraction = require("./segment-fraction.js");