#!/usr/bin/env node
// Swaps schema.prisma provider from sqlite → postgresql for production builds.
// Run: node scripts/use-postgres.js
// Revert: node scripts/use-postgres.js --revert

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const revert = process.argv.includes('--revert');

if (revert) {
  schema = schema.replace(/provider = "postgresql"/, 'provider = "sqlite"');
  console.log('Reverted schema to sqlite');
} else {
  schema = schema.replace(/provider = "sqlite"/, 'provider = "postgresql"');
  console.log('Swapped schema to postgresql (production)');
}

fs.writeFileSync(schemaPath, schema);
