import { TokenCredential } from "@azure/core-http";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

import {
  AccountSASPermissions,
  AccountSASResourceTypes,
  AccountSASServices,
  generateAccountSASQueryParameters,
  SASProtocol,
} from "../../src";
import { BlobServiceClient } from "../../src/BlobServiceClient";
import { SharedKeyCredential } from "../../src/credentials/SharedKeyCredential";
import { newPipeline } from "../../src/Pipeline";
import { extractConnectionStringParts } from "../../src/utils/utils.common";
import { env, getUniqueName, SimpleTokenCredential } from "./testutils.common";

dotenv.config({ path: "../.env" });

export * from "./testutils.common";

export function getGenericCredential(
  accountType: string,
  envSuffix: string = ""
): SharedKeyCredential {
  const accountNameEnvVar = `${accountType}ACCOUNT_NAME${envSuffix}`;
  const accountKeyEnvVar = `${accountType}ACCOUNT_KEY${envSuffix}`;

  let accountName: string | undefined;
  let accountKey: string | undefined;

  accountName = process.env[accountNameEnvVar];
  accountKey = process.env[accountKeyEnvVar];

  if (!accountName || !accountKey || accountName === "" || accountKey === "") {
    throw new Error(
      `${accountNameEnvVar} and/or ${accountKeyEnvVar} environment variables not specified.`
    );
  }

  return new SharedKeyCredential(accountName, accountKey);
}

export function getGenericBSU(
  accountType: string,
  accountNameSuffix: string = "",
  envSuffix: string = ""
): BlobServiceClient {
  if (env.STORAGE_CONNECTION_STRING.startsWith("UseDevelopmentStorage=true")) {
    return BlobServiceClient.fromConnectionString(getConnectionStringFromEnvironment());
  } else {
    const credential = getGenericCredential(accountType) as SharedKeyCredential;

    const pipeline = newPipeline(credential, {
      // Enable logger when debugging
      // logger: new ConsoleHttpPipelineLogger(HttpPipelineLogLevel.INFO)
    });
    const blobPrimaryURL = `https://${credential.accountName}${accountNameSuffix}.blob.core.windows.net/`;
    return new BlobServiceClient(blobPrimaryURL, pipeline);
  }
}

export function getTokenCredential(): TokenCredential {
  const accountTokenEnvVar = `ACCOUNT_TOKEN`;
  let accountToken: string | undefined;

  accountToken = process.env[accountTokenEnvVar];

  if (!accountToken || accountToken === "") {
    throw new Error(`${accountTokenEnvVar} environment variables not specified.`);
  }

  return new SimpleTokenCredential(accountToken);
}

export function getTokenBSU(): BlobServiceClient {
  const accountNameEnvVar = `ACCOUNT_NAME`;

  let accountName: string | undefined;

  accountName = process.env[accountNameEnvVar];

  if (!accountName || accountName === "") {
    throw new Error(`${accountNameEnvVar} environment variables not specified.`);
  }

  const credential = getTokenCredential();
  const pipeline = newPipeline(credential, {
    // Enable logger when debugging
    // logger: new ConsoleHttpPipelineLogger(HttpPipelineLogLevel.INFO)
  });
  const blobPrimaryURL = `https://${accountName}.blob.core.windows.net/`;
  return new BlobServiceClient(blobPrimaryURL, pipeline);
}

export function getBSU(): BlobServiceClient {
  return getGenericBSU("");
}

export function getAlternateBSU(): BlobServiceClient {
  return getGenericBSU("SECONDARY_", "-secondary");
}

// export DFS_ACCOUNT_NAME_OPTIONAL="account"
// export DFS_ACCOUNT_KEY_OPTIONAL="KEY"
export function getAdlsBSU(): BlobServiceClient {
  return getGenericBSU("DFS_", "", "_OPTIONAL");
}

export function getConnectionStringFromEnvironment(
  accountType: string = "",
  envSuffix: string = ""
): string {
  const connectionStringEnvVar = `${accountType}STORAGE_CONNECTION_STRING${envSuffix}`;
  const connectionString = process.env[connectionStringEnvVar];

  if (!connectionString) {
    throw new Error(`${connectionStringEnvVar} environment variables not specified.`);
  }

  return connectionString;
}

export function getAdlsConnectionStringFromEnvironment() {
  return getConnectionStringFromEnvironment("DFS_", "_OPTIONAL");
}

/**
 * Read body from downloading operation methods to string.
 * Work on both Node.js and browser environment.
 *
 * @param response Convenience layer methods response with downloaded body
 * @param length Length of Readable stream, needed for Node.js environment
 */
export async function bodyToString(
  response: {
    readableStreamBody?: NodeJS.ReadableStream;
    blobBody?: Promise<Blob>;
  },
  length?: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    response.readableStreamBody!.on("readable", () => {
      let chunk;
      chunk = response.readableStreamBody!.read(length);
      if (chunk) {
        resolve(chunk.toString());
      }
    });

    response.readableStreamBody!.on("error", reject);
  });
}

export async function createRandomLocalFile(
  folder: string,
  blockNumber: number,
  blockSize: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const destFile = path.join(folder, getUniqueName("tempfile."));
    const ws = fs.createWriteStream(destFile);
    let offsetInMB = 0;

    function randomValueHex(len = blockSize) {
      return crypto
        .randomBytes(Math.ceil(len / 2))
        .toString("hex") // convert to hexadecimal format
        .slice(0, len); // return required number of characters
    }

    ws.on("open", () => {
      // tslint:disable-next-line:no-empty
      while (offsetInMB++ < blockNumber && ws.write(randomValueHex())) {}
      if (offsetInMB >= blockNumber) {
        ws.end();
      }
    });

    ws.on("drain", () => {
      // tslint:disable-next-line:no-empty
      while (offsetInMB++ < blockNumber && ws.write(randomValueHex())) {}
      if (offsetInMB >= blockNumber) {
        ws.end();
      }
    });
    ws.on("finish", () => resolve(destFile));
    ws.on("error", reject);
  });
}

export function getSASConnectionStringFromEnvironment(
  accountType: string = "",
  envSuffix: string = ""
): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 5); // Skip clock skew with server

  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  const queueServiceClient = getGenericBSU(accountType, "", envSuffix);
  // By default, credential is always the last element of pipeline factories
  const factories = (queueServiceClient as any).pipeline.factories;
  const sharedKeyCredential = factories[factories.length - 1];

  const sas = generateAccountSASQueryParameters(
    {
      expiryTime: tmr,
      ipRange: { start: "0.0.0.0", end: "255.255.255.255" },
      permissions: AccountSASPermissions.parse("rwdlacup").toString(),
      protocol: SASProtocol.HTTPSandHTTP,
      resourceTypes: AccountSASResourceTypes.parse("sco").toString(),
      services: AccountSASServices.parse("btqf").toString(),
      startTime: now,
      version: "2016-05-31"
    },
    sharedKeyCredential as SharedKeyCredential
  ).toString();

  const blobEndpoint = extractConnectionStringParts(
    getConnectionStringFromEnvironment(accountType, envSuffix)
  ).url;

  return `BlobEndpoint=${blobEndpoint}/;QueueEndpoint=${blobEndpoint.replace(
    ".blob.",
    ".queue."
  )}/;FileEndpoint=${blobEndpoint.replace(
    ".queue.",
    ".file."
  )}/;TableEndpoint=${blobEndpoint.replace(".queue.", ".table.")}/;SharedAccessSignature=${sas}`;
}

export function getAdlsSASConnectionStringFromEnvironment() {
  return getSASConnectionStringFromEnvironment("DFS_", "_OPTIONAL");
}
