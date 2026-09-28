CREATE TABLE title_list(
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_game_id VARCHAR(20),
  asset_name VARCHAR(1000),
  obtain_method VARCHAR(1000) NOT NULL DEFAULT 'No Obtainable Method',
  rarity SMALLINT, 
  version_added SMALLINT,

  FOREIGN KEY (version_added) REFERENCES asset_versions(id),
  FOREIGN KEY (rarity) REFERENCES title_types(id)
);