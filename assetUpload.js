import "dotenv/config";

import fs from "node:fs";

import { parentPort } from "node:worker_threads";
import { XMLParser } from "fast-xml-parser";
import { Pool } from "pg";

const FoldersToSearch = [
  {
    folderName: "frame",
    xmlName: "Frame.xml",
    xmlStartingPoint: "FrameData",
    localImgPath: "/root/site/sdga/frame/",
  },
  {
    folderName: "plate",
    xmlName: "Plate.xml",
    xmlStartingPoint: "PlateData",
    localImgPath: "/root/site/sdga/plate/",
  },
  {
    folderName: "icon",
    xmlName: "Icon.xml",
    xmlStartingPoint: "IconData",
    localImgPath: "/root/site/sdga/icon/",
  },
  {
    folderName: "chara",
    xmlName: "Chara.xml",
    xmlStartingPoint: "CharaData",
    localImgPath: "/root/site/sdga/chara/",
  },
];

const UploadPool = new Pool({
  host: process.env.HOST,
  user: process.env.DB_USER,
  port: Number(process.env.PORT),
  database: process.env.DB,
  password: process.env.PASSWORD,
  onConnect: () => {
    console.log("Script has connected to Database");
  },
});

async function loadAssetPropertyTables() {
  const asset_versions = await UploadPool.query("SELECT * FROM asset_versions");
  const asset_types = await UploadPool.query("SELECT * FROM asset_types");

  const version_map = new Map(
    asset_versions.rows.map((row) => [row.version_id, row.id]),
  );
  const types_map = new Map(
    asset_types.rows.map((row) => [row.internal_name, row.id]),
  );

  return {
    asset_versions: version_map,
    asset_types: types_map,
  };
}

function findLocalImageAsset(id, asset_path) {
  const contents = fs.readdirSync(asset_path);

  for (let index = 0; index < contents.length; index++) {
    const element = contents[index];

    if (element.includes(String(id).padStart(6, "0"))) return element;
  }

  return undefined;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function extractFromXML(
  xml_str,
  startingPoint,
  asset_type,
  asset_versions,
  asset_types,
  localImgPath,
) {
  const parser = new XMLParser();
  const contents = parser.parse(xml_str)[startingPoint];

  try {
    const version = contents.releaseTagName
      ? contents.releaseTagName.str.slice(3, 7)
      : 0;
    const asset_name = contents.name.str;
    const asset_game_id = String(contents.name.id).padStart(6, "0");

    const obtain_method = contents.normText;

    const upRequest = await UploadPool.query(
      "INSERT INTO asset_list (asset_game_id, asset_name, obtain_method, version_added, asset_type, asset_local_path) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        asset_game_id,
        asset_name,
        obtain_method,
        asset_versions.get(version),
        asset_types.get(asset_type),
        findLocalImageAsset(asset_game_id, localImgPath),
      ],
    );

    console.log(
      "added asset",
      startingPoint,
      "name:",
      asset_name,
      "id:",
      asset_game_id,
    );
  } catch (error) {
    console.log(error);
  }
}

parentPort.on("message", async (bundle_path) => {
  try {
    let { asset_versions, asset_types } = await loadAssetPropertyTables();

    for (let i = 0; i < FoldersToSearch.length; i++) {
      const folder = FoldersToSearch[i].folderName;
      const opt_path = bundle_path;

      const FolderPath = opt_path + folder;
      const FolderContents = fs.readdirSync(FolderPath);

      for (let k = 0; k < FolderContents.length; k++) {
        const FolderChild = FolderContents[k];

        if (FolderChild.includes("Sort.xml")) continue;
        const XML_file = FoldersToSearch[i].xmlName;
        const XML_Path = FolderPath + "/" + FolderChild + "/" + XML_file;

        const XML_Details = fs.readFileSync(XML_Path);

        const startingPoint = FoldersToSearch[i].xmlStartingPoint;
        const localImgPath = FoldersToSearch[i].localImgPath;

        await extractFromXML(
          XML_Details.toString("utf-8"),
          startingPoint,
          folder,
          asset_versions,
          asset_types,
          localImgPath,
        );
      }
    }

    UploadPool.end();
    parentPort.postMessage("Upsert completed!");
    process.exit(0);
  } catch (error) {
    console.log("Upsert failed, error: ", error);
    parentPort.postMessage({});
    process.exit(1);
  }
});
