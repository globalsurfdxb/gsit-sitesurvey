import { GridFSBucket, MongoClient, type Collection, type Db, type ObjectId } from "mongodb";
import { ensureSeed } from "./seed";
import type { FormSchema, FormStatus, Membership, Role, SurveyStatus, Values } from "./types";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  /** Legacy values ("admin", "engineer") are migrated at start-up; read through normalizeRole(). */
  role: Role | "admin" | "engineer";
  /** Absent only on accounts from before departments existed (migrated at start-up). */
  memberships?: Membership[];
  passwordHash: string;
  createdAt: number;
}

export interface DepartmentDoc {
  _id: string; // slug, e.g. "elv"
  name: string;
  code: string;
  description: string;
  tone: string;
  iconName: string;
  createdAt: number;
}

export interface FormDoc {
  _id: string;
  departmentId: string;
  name: string;
  description: string;
  status: FormStatus;
  version: number;
  schema: FormSchema;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface SurveyDoc {
  _id: string; // client-generated UUID, so offline-created surveys need no id mapping
  ownerId: string;
  ownerName: string;
  /** Absent only on surveys from before departments existed (migrated at start-up). */
  departmentId: string;
  formId: string;
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
  /** Lets a department's lead open its members' photos. */
  departmentId?: string;
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
  g.__mongo!.ready ??= prepare(db).catch((e) => {
    g.__mongo!.ready = undefined; // retry on next request
    throw e;
  });
  await g.__mongo!.ready;
  return db;
}

async function prepare(db: Db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ "memberships.departmentId": 1 });
  await db.collection("surveys").createIndex({ ownerId: 1, updatedAt: -1 });
  await db.collection("surveys").createIndex({ departmentId: 1, updatedAt: -1 });
  await db.collection("forms").createIndex({ departmentId: 1 });
  await db.collection(`${FILES_BUCKET}.files`).createIndex({ "metadata.surveyId": 1 });
  await ensureSeed(db);
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}
export async function surveys(): Promise<Collection<SurveyDoc>> {
  return (await getDb()).collection<SurveyDoc>("surveys");
}
export async function departments(): Promise<Collection<DepartmentDoc>> {
  return (await getDb()).collection<DepartmentDoc>("departments");
}
export async function forms(): Promise<Collection<FormDoc>> {
  return (await getDb()).collection<FormDoc>("forms");
}
export async function filesBucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getDb(), { bucketName: FILES_BUCKET });
}
export async function fileDocs() {
  return (await getDb()).collection<{ _id: string; filename: string; length: number; metadata?: FileMeta }>(`${FILES_BUCKET}.files`);
}
