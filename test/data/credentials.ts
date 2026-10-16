/**
 * Credentials for the public practice application.
 *
 * These are published by the target site itself and grant nothing — they exist
 * so the login form has something to accept. Real projects read secrets from a
 * secret store (AWS SSM, Vault) at runtime and never commit them; the override
 * below keeps that habit visible even where it is not strictly required.
 */
export const credentials = {
    valid: {
        username: process.env.APP_USERNAME ?? 'tomsmith',
        password: process.env.APP_PASSWORD ?? 'SuperSecretPassword!',
    },
    basicAuth: {
        username: 'admin',
        password: 'admin',
    },
} as const;
