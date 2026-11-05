import { GridFSBucket, MongoClient, type Collection, type Db, type ObjectId } from "mongodb";
import type { Role, SurveyStatus, Values } from "./types";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  createdAt: number;
}

export interface SurveyDoc {
  _id: string; // client-generated UUID, so offline-created surveys need no id mapping
  ownerId: string;
  ownerName: string;
  title: string;
  status: SurveyStatus;
  values: Values;
  rev: number;
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
}

export interface FileMeta {
  surveyId: string;
  ownerId: string;
  contentType: string;
}

export const FILES_BUCKET = "files";

// Reuse the client across hot reloads in dev and across requests in prod.
const g = globalThis as unknown as { __mongo?: { client: Promise<MongoClient>; ready?: Promise<void> } };

function client(): Promise<MongoClient> {
  if (!g.__mongo) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
    g.__mongo = { client: new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect() };
  }
  return g.__mongo.client;
}

export async function getDb(): Promise<Db> {
  const c = await client();
  const db = c.db(process.env.MONGODB_DB || "site_survey");
  g.__mongo!.ready ??= ensureIndexes(db).catch((e) => {
    g.__mongo!.ready = undefined; // retry on next request
    throw e;
  });
  await g.__mongo!.ready;
  return db;
}

async function ensureIndexes(db: Db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("surveys").createIndex({ ownerId: 1, updatedAt: -1 });
  await db.collection(`${FILES_BUCKET}.files`).createIndex({ "metadata.surveyId": 1 });
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}
export async function surveys(): Promise<Collection<SurveyDoc>> {
  return (await getDb()).collection<SurveyDoc>("surveys");
}
export async function filesBucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getDb(), { bucketName: FILES_BUCKET });
}
export async function fileDocs() {
  return (await getDb()).collection<{ _id: string; filename: string; length: number; metadata?: FileMeta }>(`${FILES_BUCKET}.files`);
}
