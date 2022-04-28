const request = require("request");

const GLOBAL_TIME_START = Date.now();
const LANGUAGE = "es";
const POKEMON_LIMIT = 386;
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

function getAbilityData(urlAbility) {
  return new Promise(function (resolve, reject) {
    request({ url: urlAbility }, (error, res) => {
      if (error) {
        reject(error);
      }
      resolve(JSON.parse(res.body));
    });
  });
}

async function fetchPokemon(idPokemon) {
  let currentPokemonTime = Date.now();
  let currentPokemon = {};

  let pokemonJson = await getPokemonData(idPokemon);
  currentPokemon.id = pokemonJson.id;
  currentPokemon.name = pokemonJson.name;
  currentPokemon.height = pokemonJson.height;
  currentPokemon.weight = pokemonJson.weight;
  currentPokemon.sprites = pokemonJson.sprites;
  currentPokemon.description = [];
  currentPokemon.abilities = [];

  let pokemonDescriptionJson = await getDescriptionData(idPokemon);
  currentPokemon.captureRate = pokemonDescriptionJson.capture_rate;

  for (let element of pokemonDescriptionJson.flavor_text_entries) {
    if (element.language.name == LANGUAGE) {
      currentPokemon.description.push(
        element.flavor_text.split("\n").join(" ")
      );
    }
  }

  for (let ability of pokemonJson.abilities) {
    let abilityProcessed = {};
    let abilityDataJson = await getAbilityData(ability.ability.url);

    for (let abilityDataNameItem of abilityDataJson.names) {
      if (abilityDataNameItem.language.name == LANGUAGE) {
        abilityProcessed.name = abilityDataNameItem.name;
        break;
      }
    }
    for (let abilityDataTextItem of abilityDataJson.flavor_text_entries) {
      if (abilityDataTextItem.language.name == LANGUAGE) {
        abilityProcessed.description = abilityDataTextItem.flavor_text;
        break;
      }
    }
    currentPokemon.abilities.push(abilityProcessed);
  }

  arrayOfPokemon.push(currentPokemon);
  
  console.log(
    `[${((idPokemon / POKEMON_LIMIT) * 100).toFixed(2)}% in ${(
      (Date.now() - GLOBAL_TIME_START) /
      1000
    ).toFixed(2)}s] [${idPokemon} of ${POKEMON_LIMIT}] ${
      currentPokemon.name
    } fetched in ${((Date.now() - currentPokemonTime) / 1000).toFixed(2)}s`
  );
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
  // checkArray()
  console.log(`Fetched ${arrayOfPokemon.length} pokemons successfully!`);
  writeToFile(OUTPUT_FILE_NAME);
}

populateDatabase();
