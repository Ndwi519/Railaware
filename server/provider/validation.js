Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LiveTrainProgressSchema = exports.DiscoverTrainsSchema = void 0;
var _zod = require("zod");
const DiscoverTrainsSchema = exports.DiscoverTrainsSchema = _zod.z.object({
  success: _zod.z.boolean(),
  data: _zod.z.object({
    trains: _zod.z.array(_zod.z.object({
      train: _zod.z.object({
        number: _zod.z.union([_zod.z.string(), _zod.z.number()]).transform(String),
        name: _zod.z.string().optional()
      }),
      from: _zod.z.object({
        departure: _zod.z.string().optional()
      }).optional(),
      to: _zod.z.object({
        arrival: _zod.z.string().optional()
      }).optional()
    })).optional()
  }).optional()
});
const LiveTrainProgressSchema = exports.LiveTrainProgressSchema = _zod.z.object({
  success: _zod.z.boolean(),
  data: _zod.z.object({
    trainNumber: _zod.z.union([_zod.z.string(), _zod.z.number()]).transform(String).optional(),
    status: _zod.z.string().optional(),
    previousHalt: _zod.z.object({
      stationCode: _zod.z.string()
    }).optional(),
    nextHalt: _zod.z.object({
      stationCode: _zod.z.string()
    }).optional(),
    currentLocation: _zod.z.object({
      stationCode: _zod.z.string().optional(),
      segmentProgress: _zod.z.number().optional()
    }).optional(),
    lastUpdatedAt: _zod.z.string().optional(),
    isLive: _zod.z.boolean().optional()
  }).optional()
});