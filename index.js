import "dotenv/config";

import fs from "node:fs";
import readline from "readline";
import { XMLParser } from "fast-xml-parser";
import { Pool } from "pg";

const FoldersToSearch = [
  {
    folderName: "frame",
    xmlName: "Frame.xml",
    xmlStartingPoint: "FrameData",
    localImgPath: "/root/site/sdga/frame",
  },
  {
    folderName: "plate",
    xmlName: "Plate.xml",
    xmlStartingPoint: "PlateData",
    localImgPath: "/root/site/sdga/nameplate/",
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

const ConnectionPool = new Pool({
  host: "localhost",
  user: "bway",
  port: 5432,
  database: "bwayTest",
  password: "1234",
  onConnect: () => {
    console.log("Script has connected to Database");
  },
});

function findLocalImageAsset(id, asset_path) {
  const contents = fs.readdirSync(asset_path);

  // check if id has less than 6 characters, add extra 0's if necessary

  for (let index = 0; index < contents.length; index++) {
    const element = contents[index];

    if (element.includes(String(id).padStart(6, "0")))
      return asset_path + element;
  }

  return undefined;
}

async function loadAssetTables() {
  const asset_versions = await ConnectionPool.query(
    "SELECT * FROM asset_versions",
  );
  const asset_types = await ConnectionPool.query("SELECT * FROM asset_types");

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

async function loadTitleRarityTable() {
  const title_types = await ConnectionPool.query("SELECT * FROM title_types");

  const types_map = new Map(
    title_types.rows.map((row) => [row.rarity, row.id]),
  );

  return types_map;
}

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

    const obtain_method = contents.normText
      ? contents.normText
      : "No Obtaining Method Specified";

    const upRequest = await ConnectionPool.query(
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

    const upRequest = await ConnectionPool.query(
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

const main = async () => {
  let { asset_versions, asset_types } = await loadAssetTables();
  let title_types = await loadTitleRarityTable();

  const title_path = process.env.OPT_PATH + "title";
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

  await ConnectionPool.end();
};

main();
