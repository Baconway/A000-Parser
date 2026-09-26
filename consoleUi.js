import readline from "node:readline/promises";
import { readdirSync } from "node:fs";
import { Worker } from "node:worker_threads";

const path_reader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const UploadScripts = [
  { path: "./assetUpload.js", type: "Asset" },
  { path: "./titleUpload.js", type: "title" },
];

const init_app = async () => {
  let bundle_path;

  while (!bundle_path) {
    try {
      bundle_path = await path_reader.question("A000 Path: ");
      const checkValidity = readdirSync(bundle_path);
    } catch (error) {
      console.log("Input was not a path");
      bundle_path = undefined;
    }
  }

  console.log("Path was valid, upload starting!");

  for (let index = 0; index < UploadScripts.length; index++) {
    const scriptPath = UploadScripts[index].path;
    const scriptType = UploadScripts[index].type;

    const UploadWorkerPromise = await new Promise((resolve, reject) => {
      const UploadWorker = new Worker(scriptPath);

      UploadWorker.postMessage(bundle_path);

      UploadWorker.on("message", (value) => {
        console.log(scriptType + " " + value);
        resolve(scriptType);
      });
    });

    console.log(`Type ${scriptType} being uploaded`);
  }

  path_reader.close();
};

init_app();
