// @ts-nocheck -- mongosh script: `db` is a global of the shell, unknown to TypeScript

/**
 * Schema of the database (mongosh script).
 *
 * Mounted into /docker-entrypoint-initdb.d of the mongo container,
 * so it runs automatically the first time the database starts (i.e. with an empty data volume).
 */

const target = db.getSiblingDB(process.env.DATABASE_NAME || "capitals");

// case-insensitive by default (applies to queries and to the unique indexes);
// `en`, as MongoDB has no `en_GB` collation (see /backend/src/_core/locale.ts)
const collation = { locale: "en", strength: 2 };

target.createCollection("capitals", {
    collation,
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "country", "latitude", "longitude", "capital"],
            additionalProperties: false,
            properties: {
                // id derived from country + name: UUIDv5 as 22 base62 characters in groups (see /backend/src/_core/ids.ts)
                _id: { bsonType: "string", pattern: "^[0-9A-Za-z]{7}-[0-9A-Za-z]{7}-[0-9A-Za-z]{8}$" },
                name: { bsonType: "string", minLength: 1 },
                country: { bsonType: "string", minLength: 1 },
                latitude: { bsonType: ["double", "int"], minimum: -90, maximum: 90 },
                longitude: { bsonType: ["double", "int"], minimum: -180, maximum: 180 },
                capital: { bsonType: "bool" },
                colour: { bsonType: "string", pattern: "^#[0-9a-f]{6}$" },
            },
        },
    },
});

// unique per (country, name): several cities per country and the same name in several countries are allowed
target.capitals.createIndex({ country: 1, name: 1 }, { unique: true });

// at most one capital per country (so among capitals, `country` is unique)
target.capitals.createIndex({ country: 1 }, { unique: true, partialFilterExpression: { capital: true } });
