CREATE TABLE asset_list(
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY ,
  asset_game_id VARCHAR(1000) NOT NULL, 
  asset_name VARCHAR(1000) NOT NULL,
  obtain_method VARCHAR(1000) NOT NULL DEFAULT 'No Obtainable Method',
  asset_local_path VARCHAR(1000),
  version_added SMALLINT, 
  asset_type SMALLINT,
  genre VARCHAR(1000) NOT NULL DEFAULT 'No Genre',
  
  FOREIGN KEY (version_added) REFERENCES asset_versions(id),
  FOREIGN KEY (asset_type) REFERENCES asset_types(id)
);