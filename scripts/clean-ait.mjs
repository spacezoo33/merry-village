import { rm } from 'node:fs/promises';

// Never allow a previous build's package to pass artifact existence checks.
await rm(new URL('../merry-village.ait', import.meta.url), { force: true });
