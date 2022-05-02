const request = require("request");

const GLOBAL_TIME_START = Date.now();
const LANGUAGE = "es";

//151 = First Generation Only
const POKEMON_LIMIT = 151; 

const OUTPUT_FILE_NAME = "pokemon.json";

const arrayOfPokemon = [];

function getPokemonData(idPokemon) {
  return new Promise((resolve, reject) => {
    request(
      { url: `https://pokeapi.co/api/v2/pokemon/${idPokemon}/` },
      (error, res) => {
        if (error) {
          reject(error);
        }
        resolve(JSON.parse(res.body));
      }
    );
  });
}

function getDescriptionData(idPokemon) {
  return new Promise(function (resolve, reject) {
    try {
      request(
        { url: `https://pokeapi.co/api/v2/pokemon-species/${idPokemon}/` },
        (error, res) => {
          if (error) {
            reject(error);
          }
          resolve(JSON.parse(res.body));
        }
      );
    } catch (error) {
      console.error(idPokemon, error);
    }
  });
}

function getGenericJsonData(url) {
  return new Promise(function (resolve, reject) {
    request({ url: url }, (error, res) => {
      if (error) {
        reject(error);
      }
      resolve(JSON.parse(res.body));
    });
  });
}

function showProgressOnConsole(idPokemon, currentPokemon, currentPokemonTime) {
  console.log(
    `[${((idPokemon / POKEMON_LIMIT) * 100).toFixed(2)}% in ${(
      (Date.now() - GLOBAL_TIME_START) /
      1000
    ).toFixed(2)}s] [${idPokemon} of ${POKEMON_LIMIT}] ${
      currentPokemon.name
    } fetched in ${((Date.now() - currentPokemonTime) / 1000).toFixed(2)}s`
  );
}

function getPokemonDescription(pokemonDescriptionJson) {
  let descriptions = [];
  for (let element of pokemonDescriptionJson.flavor_text_entries) {
    if (element.language.name == LANGUAGE) {
      descriptions.push(element.flavor_text.split("\n").join(" "));
    }
  }
  return [...new Set(descriptions)];
}

async function getPokemonTypes(pokemonJson) {
  let types = [];
  for (let element of pokemonJson.types) {
    let pokemonTypeJson = await getGenericJsonData(element.type.url);
    for (let element of pokemonTypeJson.names) {
      if (element.language.name == LANGUAGE) {
        types.push(element.name);
      }
    }
  }
  return types;
}

function getPokemonSprites(pokemonJson) {
  return {
    "8bit_front_default": pokemonJson.sprites.front_default,
    svg_front_default: pokemonJson.sprites.other.dream_world.front_default,
    "3d_front_default": pokemonJson.sprites.other.home.front_default,
    official_default:
      pokemonJson.sprites.other["official-artwork"].front_default,
  };
}

function getPokemonStats(pokemonJson) {
  let pokemonStats = {};
  for (let elementStat of pokemonJson.stats) {
    if (elementStat.stat.name == "hp") pokemonStats.hp = elementStat.base_stat;
    if (elementStat.stat.name == "attack")
      pokemonStats.attack = elementStat.base_stat;
    if (elementStat.stat.name == "special-attack")
      pokemonStats.specialAttack = elementStat.base_stat;
    if (elementStat.stat.name == "special-defense")
      pokemonStats.specialDefense = elementStat.base_stat;
    if (elementStat.stat.name == "speed")
      pokemonStats.speed = elementStat.base_stat;
  }
  return pokemonStats;
}

async function getPokemonAbilities(pokemonJson) {
  let pokemonAbilities = [];
  for (let ability of pokemonJson.abilities) {
    let abilityProcessed = {};
    let abilityDataJson = await getGenericJsonData(ability.ability.url);

    for (let abilityDataNameItem of abilityDataJson.names) {
      if (abilityDataNameItem.language.name == LANGUAGE) {
        abilityProcessed.name = abilityDataNameItem.name;
        break;
      }
    }
    for (let abilityDataTextItem of abilityDataJson.flavor_text_entries) {
      if (abilityDataTextItem.language.name == LANGUAGE) {
        abilityProcessed.description = abilityDataTextItem.flavor_text
          .split("\n")
          .join(" ");
        break;
      }
    }
    pokemonAbilities.push(abilityProcessed);
  }
  return pokemonAbilities;
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeToFile(filename) {
  const fs = require("fs");

  let jsonContent = JSON.stringify(arrayOfPokemon);

  fs.writeFile(filename, jsonContent, "utf8", function (err) {
    if (err) {
      console.log("An error occured while writing file");
      return console.log(err);
    }

    console.log("JSON file has been saved.");
  });
}

async function fetchPokemon(idPokemon) {
  let currentPokemonTime = Date.now();
  let currentPokemon = {};

  let pokemonJson = await getPokemonData(idPokemon);
  let pokemonDescriptionJson = await getDescriptionData(idPokemon);

  currentPokemon.id = pokemonJson.id;
  currentPokemon.name = pokemonJson.name;
  currentPokemon.height = pokemonJson.height;
  currentPokemon.weight = pokemonJson.weight;
  currentPokemon.types = await getPokemonTypes(pokemonJson);
  currentPokemon.captureRate = pokemonDescriptionJson.capture_rate;
  currentPokemon.baseStats = getPokemonStats(pokemonJson);
  currentPokemon.description = getPokemonDescription(pokemonDescriptionJson);
  currentPokemon.sprites = getPokemonSprites(pokemonJson);
  currentPokemon.abilities = await getPokemonAbilities(pokemonJson);
  currentPokemon.moves = await getPokemonMoves(pokemonJson);
  
  arrayOfPokemon.push(currentPokemon);
  showProgressOnConsole(idPokemon, currentPokemon, currentPokemonTime);
}

async function getPokemonMoves(pokemonJson) {
  let moves = [];
  for (pokeMove of pokemonJson.moves) {
    for (version of pokeMove.version_group_details)
      if (["red-blue"].includes(version.version_group.name) && version.move_learn_method.name == "level-up") {
        let move = await getPokemonMoveData(pokeMove.move.url);
        moves.push(move);
      }
  }
  return moves;
}

async function getPokemonMoveData(moveUrl){
  let move = {}
  let moveDataJson = await getGenericJsonData(moveUrl);
  
  move.id = moveDataJson.id;

  for(let name of moveDataJson.names){
    if (name.language.name == LANGUAGE){
      move.name = name.name;
      break;
    }
  }

  for(let flavor_text of moveDataJson.flavor_text_entries){
    if(flavor_text.language.name == LANGUAGE){
      move.description = flavor_text.flavor_text.split('\n').join(' ');
      break;
    }
  }

  let moveTypeDataJson = await getGenericJsonData(moveDataJson.type.url);
  for(let name of moveTypeDataJson.names){
    if(name.language.name == LANGUAGE){
      move.type = name.name;
      break;
    }
  }

  // move.power = moveDataJson.power;
  // move.accuracy = moveDataJson.accuracy;
  return move;
}

async function populateDatabase() {
  console.log("PokeApiDump v0.1.0");
  console.log("> Using language: ", LANGUAGE);
  console.log("> Using POKEMON_LIMIT: ", POKEMON_LIMIT);
  console.log("Press ^c to cancel. Will start in 5 seconds");
  await timeout(5000);

  let pokemonId = 1;
  while (pokemonId <= POKEMON_LIMIT) {
    await fetchPokemon(pokemonId);
    pokemonId++;
  }
  console.log(`Fetched ${arrayOfPokemon.length} pokemons successfully!`);
  writeToFile(OUTPUT_FILE_NAME);
}

populateDatabase();
