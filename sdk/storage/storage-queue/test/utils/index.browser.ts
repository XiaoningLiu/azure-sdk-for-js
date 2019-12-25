import { AnonymousCredential } from "../../src/credentials/AnonymousCredential";
import { newPipeline } from "../../src/Pipeline";
import { QueueServiceClient } from "../../src/QueueServiceClient";

export * from "./testutils.common";

export function getGenericQSU(
  _accountType: string,
  _accountNameSuffix: string = ""
): QueueServiceClient {
  const accountSAS =
    "sv=2016-05-31&sig=SL1tiZVonWXUNfh93EQHCpz5DKYSeie5%2F7jeyK58yeI%3D&st=2018-12-17T06%3A10%3A39Z&se=2020-12-17T06%3A10%3A39Z&srt=sco&ss=bfqt&sp=racupwdl"; // `${accountType}ACCOUNT_SAS`;

  const credentials = new AnonymousCredential();
  const pipeline = newPipeline(credentials, {
    // Enable logger when debugging
    // logger: new ConsoleHttpPipelineLogger(HttpPipelineLogLevel.INFO)
  });
  const filePrimaryURL = `http://127.0.0.1:10001/devstoreaccount1?${accountSAS}`;
  return new QueueServiceClient(filePrimaryURL, pipeline);
}

export function getQSU(): QueueServiceClient {
  return getGenericQSU("");
}

export function getAlternateQSU(): QueueServiceClient {
  return getGenericQSU("SECONDARY_", "-secondary");
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
  // tslint:disable-next-line:variable-name
  _length?: number
): Promise<string> {
  const blob = await response.blobBody!;
  return blobToString(blob);
}

export async function blobToString(blob: Blob): Promise<string> {
  const fileReader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    fileReader.onloadend = (ev: any) => {
      resolve(ev.target!.result);
    };
    fileReader.onerror = reject;
    fileReader.readAsText(blob);
  });
}

export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const fileReader = new FileReader();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    fileReader.onloadend = (ev: any) => {
      resolve(ev.target!.result);
    };
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(blob);
  });
}

export function arrayBufferEqual(buf1: ArrayBuffer, buf2: ArrayBuffer): boolean {
  if (buf1.byteLength !== buf2.byteLength) {
    return false;
  }

  const uint8Arr1 = new Uint8Array(buf1);
  const uint8Arr2 = new Uint8Array(buf2);

  for (let i = 0; i <= uint8Arr1.length; i++) {
    if (uint8Arr1[i] !== uint8Arr2[i]) {
      return false;
    }
  }

  return true;
}

export function isIE(): boolean {
  const sAgent = window.navigator.userAgent;
  const Idx = sAgent.indexOf("MSIE");

  // If IE, return version number.
  if (Idx > 0) {
    return true;
  } else if (navigator.userAgent.match(/Trident\/7\./)) {
    // IE 11
    return true;
  } else {
    return false;
  } // It is not IE
}

// Mock a Browser file with specified name and size
export function getBrowserFile(name: string, size: number): File {
  const uint8Arr = new Uint8Array(size);
  for (let j = 0; j < size; j++) {
    uint8Arr[j] = Math.floor(Math.random() * 256);
  }

  // IE11 & Edge doesn't support create File using var file = new File([binary], name);
  // We leverage Blob() to mock a File

  const file = new Blob([uint8Arr]) as any;
  file.name = name;
  return file;
}

export function getSASConnectionStringFromEnvironment(): string {
  const env = (window as any).__env__;
  return `BlobEndpoint=https://${env.ACCOUNT_NAME}.blob.core.windows.net/;QueueEndpoint=https://${
    env.ACCOUNT_NAME
  }.queue.core.windows.net/;FileEndpoint=https://${
    env.ACCOUNT_NAME
  }.file.core.windows.net/;TableEndpoint=https://${
    env.ACCOUNT_NAME
  }.table.core.windows.net/;SharedAccessSignature=${env.ACCOUNT_SAS.substring(1)}`;
  // env.ACCOUNT_SAS.substring(1) - to remove the `?` in ACCOUNT_SAS
  // SAS Connection String doesn't have `?` in the `SharedAccessSignature`
}
