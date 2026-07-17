import { z } from 'zod';

export const DiscoverTrainsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    trains: z.array(
      z.object({
        train: z.object({
          number: z.union([z.string(), z.number()]).transform(String),
          name: z.string().optional(),
        }),
        from: z.object({
          departure: z.string().optional(),
        }).optional(),
        to: z.object({
          arrival: z.string().optional(),
        }).optional(),
      })
    ).optional(),
  }).optional(),
});

export const LiveTrainProgressSchema = z.object({
  success: z.boolean(),
  data: z.object({
    trainNumber: z.union([z.string(), z.number()]).transform(String).optional(),
    status: z.string().optional(),
    previousHalt: z.object({
      stationCode: z.string(),
    }).optional(),
    nextHalt: z.object({
      stationCode: z.string(),
    }).optional(),
    currentLocation: z.object({
      stationCode: z.string().optional(),
      segmentProgress: z.number().optional(),
    }).optional(),
    lastUpdatedAt: z.string().optional(),
    isLive: z.boolean().optional(),
  }).optional(),
});
