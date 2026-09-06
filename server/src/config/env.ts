import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno ${name}. Copia .env.example a .env.`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  jwtSecret: required('JWT_SECRET', 'livora-dev-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  corsOrigin: (process.env.CORS_ORIGIN ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  stream: {
    provider: (process.env.STREAM_PROVIDER ?? 'mock') as 'mock' | 'agora' | 'livekit',
    agoraAppId: process.env.AGORA_APP_ID ?? '',
    agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE ?? '',
    livekitUrl: process.env.LIVEKIT_URL ?? '',
    livekitApiKey: process.env.LIVEKIT_API_KEY ?? '',
    livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? '',
  },
};

export const isProduction = env.nodeEnv === 'production';
