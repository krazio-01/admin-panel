const required = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);

    return value;
};

const requiredInProduction = (name: string): string | undefined =>
    process.env.NODE_ENV === 'production' ? required(name) : process.env[name];

export const getEnv = () => ({
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: required('MONGODB_URI'),
    APP_URL: required('APP_URL'),
    FIELD_ENCRYPTION_KEY: required('FIELD_ENCRYPTION_KEY'),
    FIELD_ENCRYPTION_KEY_ID: process.env.FIELD_ENCRYPTION_KEY_ID || 'v1',
    SESSION_SECRET: required('SESSION_SECRET'),
    SMTP_HOST: required('SMTP_HOST'),
    SMTP_PORT: Number(required('SMTP_PORT')),
    SMTP_USER: required('SMTP_USER'),
    SMTP_PASS: required('SMTP_PASS'),
    EMAIL_FROM: required('EMAIL_FROM'),
    EMAIL_DAILY_LIMIT: Number(process.env.EMAIL_DAILY_LIMIT || 400),
    TRUSTED_PROXY_HOPS: Number(process.env.TRUSTED_PROXY_HOPS || 1),
    UPSTASH_REDIS_REST_URL: requiredInProduction('UPSTASH_REDIS_REST_URL'),
    UPSTASH_REDIS_REST_TOKEN: requiredInProduction('UPSTASH_REDIS_REST_TOKEN'),
    TURNSTILE_SECRET_KEY: requiredInProduction('TURNSTILE_SECRET_KEY'),
    TURNSTILE_SITE_KEY: requiredInProduction('TURNSTILE_SITE_KEY'),
});

export type Env = ReturnType<typeof getEnv>;
