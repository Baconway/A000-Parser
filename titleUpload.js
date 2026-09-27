import "dotenv/config";

import fs from "node:fs";

import { parentPort } from "node:worker_threads";
import { XMLParser } from "fast-xml-parser";
import { Pool } from "pg";

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

async function loadTitleRarityTable() {
  const title_types = await UploadPool.query("SELECT * FROM title_types");
  const asset_versions = await UploadPool.query("SELECT * FROM asset_versions");

  const types_map = new Map(
    title_types.rows.map((row) => [row.rarity, row.id]),
  );
  const version_map = new Map(
    asset_versions.rows.map((row) => [row.version_id, row.id]),
  );

  return { title_types: types_map, asset_versions: version_map };
}

async function extractFromTitleXML(xml_str, asset_versions, title_types) {
  const parser = new XMLParser();
  const contents = parser.parse(xml_str)["TitleData"];

  try {
    const version = contents.releaseTagName
      ? contents.releaseTagName.str.slice(3, 7)
      : undefined;
    const asset_name = contents.name.str;
    const asset_game_id = String(contents.name.id).padStart(6, "0");
    const obtain_method = contents.normText
      ? contents.normText
      : "No Obtaining Method Specified";
    const rarity = contents.rareType;

    const upRequest = await UploadPool.query(
      "INSERT INTO title_list (asset_game_id, asset_name, obtain_method, rarity, version_added) VALUES ($1, $2, $3, $4, $5)",
      [
        asset_game_id,
        asset_name,
        obtain_method,
        title_types.get(rarity),
        asset_versions.get(version),
      ],
    );

    console.log(
      "added title",
      asset_name,
      "id:",
      asset_game_id,
      "rarity",
      rarity,
    );
  } catch (error) {
    console.log(error);
  }
}

parentPort.on("message", async (bundle_path) => {
  try {
    let { title_types, asset_versions } = await loadTitleRarityTable();

    const title_path = bundle_path + "title";
    const title_Contents = fs.readdirSync(title_path);

    for (let index = 0; index < title_Contents.length; index++) {
      const element = title_Contents[index];

      if (element.includes("Sort.xml")) continue;

      const xml_file = title_path + "/" + element + "/Title.xml";
      const xml_contents = fs.readFileSync(xml_file);

      await extractFromTitleXML(
        xml_contents.toString("utf-8"),
        asset_versions,
        title_types,
      );
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
