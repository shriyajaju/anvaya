import { z } from "zod";

export const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_STUDIO_URL: z.string().url(),
  NEXT_PUBLIC_VISITOR_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
});

export const publicEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STUDIO_URL: z.string().url(),
  NEXT_PUBLIC_VISITOR_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
