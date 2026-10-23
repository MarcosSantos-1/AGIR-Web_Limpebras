import { strict as assert } from "node:assert";
import { test } from "node:test";
import { verifyIdToken } from "../lib/firebase-admin";

test("token verification rejects invalid tokens without reading a service account file", async () => {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "diagnosticos-regression-test";
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "C:/missing-service-account-for-regression-test.json";
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    await assert.rejects(verifyIdToken("not-a-valid-token"), (error: unknown) => {
      assert.ok(error && typeof error === "object" && "code" in error);
      assert.equal(error.code, "auth/argument-error");
      return true;
    });
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const foreignToken = `${encode({ alg: "RS256", kid: "test-key" })}.${encode({ aud: "another-project", iss: "https://securetoken.google.com/another-project", sub: "test-user", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.invalid-signature`;
    await assert.rejects(verifyIdToken(foreignToken), (error: unknown) => {
      assert.ok(error && typeof error === "object" && "code" in error);
      assert.equal(error.code, "auth/argument-error");
      assert.match(String(error), /audience/);
      return true;
    });
  } finally {
    if (project === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID; else process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = project;
    if (credentials === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS; else process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials;
    if (inline === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON; else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = inline;
  }
});
