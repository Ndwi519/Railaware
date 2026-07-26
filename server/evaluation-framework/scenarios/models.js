const { z } = require('zod');

const TruthSchema = z.object({
  location: z.object({ lat: z.number(), lng: z.number() }),
  speedKmph: z.number().optional(),
  groundTruthAwarenessState: z.enum(['UNKNOWN', 'DISTANT', 'DEPARTED_STATION', 'APPROACHING_STATION', 'AT_STATION'])
});

const ProviderPayloadSchema = z.object({
  delayMinutes: z.number().default(0),
  status: z.enum(['running', 'at-station', 'departed', 'unknown']),
  currentLocation: z.object({
    stationCode: z.string(),
    sequence: z.number(),
    status: z.string(),
    isHalt: z.boolean().optional(),
    isActualPosition: z.boolean().optional()
  }).optional(),
  previousHalt: z.object({
    stationCode: z.string(),
    sequence: z.number().optional(),
    distance: z.number().optional()
  }).optional(),
  nextHalt: z.object({
    stationCode: z.string(),
    sequence: z.number().optional(),
    distance: z.number().optional()
  }).optional(),
  segmentProgress: z.number().optional(),
  validationErrors: z.array(z.string()).default([])
});

const TickSchema = z.object({
  timeOffsetMs: z.number(),
  truth: TruthSchema,
  providerData: ProviderPayloadSchema.optional(),
  userLocation: z.object({ lat: z.number(), lng: z.number() })
});

const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  trainTarget: z.string(),
  corridorData: z.any().optional(), // Injected into MockDiscoveryService
  ticks: z.array(TickSchema)
});

module.exports = {
  ScenarioSchema,
  TickSchema,
  TruthSchema,
  ProviderPayloadSchema
};
