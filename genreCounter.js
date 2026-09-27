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

const path =
  "/home/baconway/Downloads/kdx 1.65/KanadeDX_1.65_No_MovieData/A000/";

for (let index = 0; index < FoldersToSearch.length; index++) {
  const element = FoldersToSearch[index];
  const path = `/home/baconway/Downloads/kdx 1.65/KanadeDX_1.65_No_MovieData/A000/${element.folderName}`;
  const path_contents = fs.readdirSync(path);

  for (let index = 0; index < path_contents.length; index++) {
    const contents = path_contents[index];
    if (contents.includes("Sort.xml")) continue;

    const xml_path = `${path}/${contents}/${element.xmlName}`;

    const parser = new XMLParser();
    const xml_contents = parser.parse(fs.readFileSync(xml_path));

    const asset_genre = xml_contents[element.xmlStartingPoint].genre.str;
    const asset_name = xml_contents[element.xmlStartingPoint].name.str;

    const assetUpdate = await UploadPool.query(
      "UPDATE asset_list SET genre = $1::text WHERE asset_name = $2::text",
      [asset_genre, asset_name],
    );

    console.log(
      assetUpdate.command,
      `ran for asset ${asset_name}, updated genre: ${asset_genre}`,
    );
  }

  console.log(`Update for ${element.folderName} completed`);
}

console.log("Update Complete!");

process.exit(0);
