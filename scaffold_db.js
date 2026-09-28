import "dotenv/config";

import { readdirSync, readFileSync } from "node:fs";
import { Pool } from "pg";

const init_db_path = "init_db_tables";

const keys_scaffolds = [
  "asset_types.sql",
  "asset_versions.sql",
  "title_types.sql",
];
const lists_scaffolds = ["asset_list.sql", "title_list.sql"];

const CreationPool = new Pool({
  host: process.env.HOST,
  user: process.env.DB_USER,
  port: Number(process.env.PORT),
  database: process.env.DB,
  password: process.env.PASSWORD,
  onConnect: () => {
    console.log("Script has connected to Database");
  },
});

const fill_keys_tables = async () => {
  for (let index = 0; index < keys_scaffolds.length; index++) {
    const scaffold = keys_scaffolds[index];
    const scaffold_query = readFileSync(`data/${scaffold}`).toString("utf-8");

    const query = await CreationPool.query(scaffold_query);
    console.log(query);
  }
};

export const create_init_tables = async () => {
  for (let index = 0; index < keys_scaffolds.length; index++) {
    const scaffold = keys_scaffolds[index];
    const scaffold_query = readFileSync(`${init_db_path}/${scaffold}`).toString(
      "utf-8",
    );

    const query = await CreationPool.query(scaffold_query);
    console.log(query);
  }

  //populate types

  await fill_keys_tables();

  for (let index = 0; index < lists_scaffolds.length; index++) {
    const scaffold = lists_scaffolds[index];
    const scaffold_query = readFileSync(`${init_db_path}/${scaffold}`).toString(
      "utf-8",
    );

    const query = await CreationPool.query(scaffold_query);
    console.log(query);
  }
};

create_init_tables();
