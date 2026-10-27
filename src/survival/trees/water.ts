import { WATER_SAFETY } from "../safety";
import type { Alternative, Biome, Node, Option, Step, Substitution, Tree } from "../types";

function step(id: string, pictogram: string, text: string, kid_text: string, danger?: Step["danger"]): Step {
  return danger ? { id, pictogram, text, kid_text, danger } : { id, pictogram, text, kid_text };
}

function opt(
  id: string,
  label: string,
  kid_label: string,
  next: string,
  pictogram: string,
  extra?: Partial<Option>,
): Option {
  return { id, label, kid_label, next, pictogram, ...extra };
}

function biomeOpt(id: string, label: string, kid: string, next: string, pictogram: string, biomes: Biome[]): Option {
  return opt(id, label, kid, next, pictogram, { conditions: [{ op: "biome_in", biomes }] });
}

const hasBoil = { conditions: [{ op: "has_any" as const, items: ["pot", "stove"] }] };
const hasChemical = { conditions: [{ op: "has_any" as const, items: ["bleach", "iodine", "chlorine_dioxide"] }] };
const hasFilter = { conditions: [{ op: "has_any" as const, items: ["water_filter"] }] };
const hasStove = { conditions: [{ op: "has_any" as const, items: ["stove"] }] };

const noPot: Substitution = {
  id: "water.sub.pot",
  need: "a pot",
  pictogram: "pot",
  fallback_node: "water.nopot",
  alternatives: [
    {
      item: "a clear plastic bottle set by the coals",
      pictogram: "bottle",
      requires: ["clear_bottle"],
      how_to:
        "Fill the bottle to the brim so the plastic does not slump, cap it loosely, and hang it beside the coals, not in the flame. When it rolls, keep it there for the full boil time.",
      caveats: "A flame melts the bottle. Coals at a hand's width do not, if the bottle is full.",
    },
    {
      item: "hot rocks in a bark or rock basin",
      pictogram: "rock",
      biomes: ["temperate_forest", "boreal/snow", "grassland", "desert", "alpine", "coastal"],
      how_to:
        "Heat dry rocks at the edge of the fire, then drop them one at a time into the water until it rolls. Use a green bark bowl, a rock depression, or a hide. Do not use wet river rocks.",
      caveats: "Wet stones can explode. Lift rocks with sticks, not your hands.",
    },
    {
      item: "a green bamboo segment",
      pictogram: "bamboo",
      biomes: ["tropical/jungle"],
      how_to:
        "Cut a green section so a node closes the bottom. Prop it over the coals, tipped so it cannot spill, and boil in it. The green wall scorches before it burns through.",
      caveats: "Dry bamboo cracks and can burst. Use a green culm.",
    },
    {
      item: "a metal can from the ruin",
      pictogram: "heater",
      biomes: ["urban_ruin"],
      how_to: "Rinse a steel can, set it in the coals, and boil. Peel any plastic liner out first if it is already loose.",
      caveats: "Unknown residue means you throw that can away and find another.",
    },
  ],
};

const noContainer: Substitution = {
  id: "water.sub.container",
  need: "a container",
  pictogram: "bag",
  fallback_node: "water.nocontainer",
  alternatives: [
    {
      item: "an unlubricated condom",
      pictogram: "pouch",
      requires: ["condom"],
      how_to: "Rinse it, drop in a clean sock or shirt sleeve so it does not burst, and fill it. Carry it against your pack, not on thorns.",
      caveats: "Lubricant and spermicide are not for drinking. Rinse until the water tastes like water.",
    },
    {
      item: "a plastic bag",
      pictogram: "bag",
      requires: ["plastic_bag"],
      how_to: "Line a hat, a boot, or a shirt so the bag holds the shape. Do not set a thin bag on a rock that can puncture it.",
      caveats: "A single grocery bag leaks at the seams. Double it.",
    },
    {
      item: "a bamboo tube",
      pictogram: "bamboo",
      biomes: ["tropical/jungle"],
      how_to: "Cut above one node and below the next. The node is the bottom. Smooth the rim so it does not split your lip.",
    },
    {
      item: "a birch-bark vessel",
      pictogram: "birch",
      biomes: ["boreal/snow", "temperate_forest"],
      how_to:
        "Fold a sheet of dead-fall bark into a square cup and pin the corners with twigs. It holds cold water. It is not a pot for the fire unless you keep the flame below the waterline.",
      caveats: "Do not strip a living birch all the way around.",
    },
  ],
};

const improvisedFilter: Alternative = {
  item: "cloth, sand, and charcoal",
  pictogram: "sand",
  biomes: ["temperate_forest", "boreal/snow", "desert", "tropical/jungle", "grassland", "coastal", "alpine", "urban_ruin"],
  how_to:
    "Punch a pinhole in a bottle or a bag. Pack cloth, then crushed charcoal, then sand, then gravel. Pour slowly. The water that comes out looks cleaner and is still not safe to drink.",
  caveats: WATER_SAFETY.filter,
};

const snowMelt: Substitution = {
  id: "water.sub.melt",
  need: "a way to melt snow without a stove",
  pictogram: "melt",
  fallback_node: "water.melt.body",
  alternatives: [
    {
      item: "a black bag in the sun",
      pictogram: "bag",
      requires: ["black_bag"],
      biomes: ["boreal/snow", "alpine"],
      how_to:
        "Pack snow into a dark bag or under a dark cloth on a sun-facing slope. Prop it so meltwater runs into a container. Spread the snow thin. A deep pile shades itself.",
      caveats: "This is slow. Start it in the morning, not at dusk.",
    },
    {
      item: "a bag of snow inside your coat, off your skin",
      pictogram: "warmth",
      biomes: ["boreal/snow", "alpine", "grassland"],
      how_to:
        "Put snow in a bag and carry the bag between layers, not against bare skin. Your body melts a little. Drink that trickle. Keep moving so you do not chill through.",
      caveats: "If you are already shivering hard, do not put snow on your body at all. Eat the cold later, after you have meltwater.",
    },
  ],
};

function node(partial: Node): Node {
  return partial;
}

const nodes: Node[] = [
  node({
    id: "water.triage",
    type: "question",
    pictogram: "water",
    text: "How long since you last drank? Dark urine, a headache, or dizziness means you are already behind. Plan on 2 to 4 liters a day, and more in heat or hard work.",
    kid_text: "When did you last drink? A headache or dark pee means you need water soon.",
    steps: [],
    safety: [WATER_SAFETY.protein],
    options: [
      opt("drank", "I drank today", "I drank today", "water.find", "check"),
      opt("behind", "I have signs of dehydration", "I feel sick", "water.dehydrated", "warning"),
    ],
  }),
  node({
    id: "water.dehydrated",
    type: "warning",
    pictogram: "warning",
    text: "You are dehydrated. Stop walking in the sun. Sip, do not gulp a huge amount at once if you are nauseated. Dark urine, a dry mouth, a headache, and dizziness are the signs. Heat and hard work can push a person past 4 liters a day.",
    kid_text: "You need water. Sit in the shade. Take small sips.",
    safety: [WATER_SAFETY.protein, WATER_SAFETY.seawater],
    steps: [
      step("shade", "shelter", "Get out of the sun and loosen tight clothes. Rest before you search.", "Sit in the shade."),
      step(
        "sip",
        "water",
        "When you have water, drink small mouthfuls. If you vomit, wait a few minutes and try again, slower.",
        "Small sips.",
      ),
      step(
        "food",
        "food",
        "Do not eat meat, nuts, or other high-protein food while you are this short of water. Digestion spends water you do not have.",
        "Do not eat meat right now.",
      ),
    ],
    options: [opt("find", "Find water now", "Find water", "water.find", "water")],
  }),
  node({
    id: "water.find",
    type: "question",
    pictogram: "question",
    text: "Where will you look? Moving water you can treat beats a stagnant pool. Seawater and urine are never drinking water.",
    kid_text: "Where can you look for water? Never drink the sea.",
    steps: [],
    safety: [WATER_SAFETY.seawater],
    options: [
      biomeOpt("snow", "Melt snow", "Melt snow", "water.melt", "melt", ["boreal/snow"]),
      biomeOpt("wash", "Dig a dry wash", "Dig in the sand", "water.wash", "sand", ["desert"]),
      biomeOpt("beach", "Dig a beach well", "Dig behind the dune", "water.beach", "well", ["coastal"]),
      biomeOpt("heater", "Water heater tank", "The house tank", "water.heater", "heater", ["urban_ruin"]),
      biomeOpt("jungle", "Rain, vines, or bamboo", "Plants and rain", "water.tropical", "vine", ["tropical/jungle"]),
      biomeOpt("stream", "Stream or seep", "A stream", "water.temperate", "water", ["temperate_forest"]),
      biomeOpt("alpine", "Snowfield or seep", "Snow or a seep", "water.alpine", "snow", ["alpine"]),
      biomeOpt("grass", "Game trails and seeps", "Follow the animals", "water.grass", "grass", ["grassland"]),
      opt("catch", "Catch rain, dew, or plant water", "Catch it", "water.collect", "raincatch"),
    ],
  }),
  node({
    id: "water.melt",
    type: "instruction",
    pictogram: "melt",
    text: "Melt snow or ice. Do not eat it. Eating snow cools you from the inside and pushes you toward hypothermia while you are still thirsty.",
    kid_text: "Melt the snow first. Do not eat it.",
    danger: "fire",
    safety: [WATER_SAFETY.snow],
    steps: [
      step("gather", "snow", "Gather clean snow, away from where people have walked or from yellow ice.", "Get clean snow."),
      step(
        "melt",
        "stove",
        "Melt it in a pot on the stove or over a small fire. Snow is mostly air, so the pot looks full and then collapses. Keep adding snow until you have real water.",
        "Melt it in a pot.",
      ),
      step(
        "treat",
        "boil",
        "Meltwater from clean snow still gets a rolling boil if you can. Ice from a lake is the same water the lake was.",
        "Boil it if you can.",
      ),
    ],
    substitutions: [snowMelt],
    options: [
      opt("stove", "Boil it on the stove", "Boil on the stove", "water.boil", "stove", hasStove),
      opt("other", "Choose another treatment", "Another way", "water.treat", "boil"),
    ],
  }),
  node({
    id: "water.melt.body",
    type: "instruction",
    pictogram: "warmth",
    no_gear: true,
    text: "With no stove, melt snow in the sun or with body heat that does not touch your skin. This is slow. Start before you are desperate.",
    kid_text: "No stove. Melt snow in the sun, or in a bag inside your coat, not on your skin.",
    safety: [WATER_SAFETY.snow],
    steps: [
      step(
        "sun",
        "sun",
        "Spread a thin layer of snow in a dark bag or on a dark cloth facing the sun. Catch the drip. A thick pile shades itself and stays ice.",
        "Spread snow in the sun.",
      ),
      step(
        "body",
        "warmth",
        "If the sun is gone, put a bag of snow between layers of clothing, not on bare skin. If you are already hypothermic, do not do this. Body-melt is a trickle, not a day's water.",
        "A bag inside your coat. Not on bare skin.",
      ),
    ],
    options: [opt("treat", "Treat the meltwater", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.wash",
    type: "instruction",
    pictogram: "sand",
    text: "In the desert, dig for water. The outer bend of a dry wash, green plants, dawn and dusk animal trails, and rock tanks are the places that still hold some.",
    kid_text: "Dig where the sand looks damp, or where plants are green.",
    steps: [
      step(
        "bend",
        "sand",
        "Walk the dry wash to an outer bend, where the current used to slow down. Dig in the gravel there, at the foot of a cut bank, until the sand turns damp. Wait for the hole to seep. Do not dig in the middle of the channel if clouds are building upstream.",
        "Dig at the outside bend.",
      ),
      step(
        "green",
        "leaves",
        "Green vegetation in a brown wash is using water you cannot see. Dig at the base of those plants, on the downhill side.",
        "Dig by the green plants.",
      ),
      step(
        "trails",
        "navigate",
        "At dawn and dusk, animal trails converge on water. Follow them downhill. Birds flying low and straight at those hours are doing the same work.",
        "Follow animal trails at dawn or dusk.",
      ),
      step(
        "tanks",
        "rock",
        "Rock tanks and tinajas hold rain in sandstone bowls. Look on the shaded side of canyons. Strain out the algae and the dead insects, then disinfect. A tank can be old. Treat it anyway.",
        "Check rock bowls for rain.",
      ),
    ],
    options: [opt("treat", "Disinfect what you dug", "Make it safe", "water.treat", "uv")],
  }),
  node({
    id: "water.beach",
    type: "instruction",
    pictogram: "well",
    text: "Dig a beach well behind the first dune, above the high-tide line. The water will be brackish. Boil it. The ocean itself is not drinking water, and neither is urine.",
    kid_text: "Dig behind the first dune. Do not drink the sea.",
    safety: [WATER_SAFETY.seawater, WATER_SAFETY.boil],
    steps: [
      step(
        "site",
        "biome_coast",
        "Walk inland past the first dune, still where the sand is damp if you dig. Below the tide line the hole fills with seawater. That water will make you thirstier.",
        "Dig behind the dune, not in the waves.",
      ),
      step(
        "dig",
        "well",
        "Dig until water seeps in. Let the sand settle. The first water is saltier. Bail it out and let the hole refill. It will still taste brackish.",
        "Let the hole fill, then bail once.",
      ),
      step(
        "boil",
        "boil",
        "Boil beach-well water before anyone drinks it. Brackish water still needs the full rolling boil. If it tastes like the sea, you dug too close. Fill the hole and move inland.",
        "Boil it.",
      ),
    ],
    options: [opt("boil", "Boil the beach-well water", "Boil it", "water.boil", "boil")],
  }),
  node({
    id: "water.heater",
    type: "instruction",
    pictogram: "heater",
    text: "In a building, the water heater tank is a sealed store of water. The toilet tank can be too, if nobody added cleaner. The bowl is not water you drink.",
    kid_text: "Use the tank on the water heater. Do not drink from the toilet bowl.",
    steps: [
      step(
        "drain",
        "heater",
        "Find the water heater. Put a pan under the drain valve at the bottom of the tank. Open the valve. Let the first rusty cup run out, then catch the rest. A typical tank holds tens of liters. Shut the valve when you have what you can carry.",
        "Drain the heater into a pot.",
      ),
      step(
        "toilet",
        "water",
        "The toilet tank, the upper box, is usable only when it has no bleach tablet, blue cleaner, or smell of chemicals. The bowl is never drinking water. Do not drink from either if the tank looks treated.",
        "Upper toilet tank only if it is clean. Never the bowl.",
      ),
      step(
        "pipes",
        "water",
        "Open the highest faucet so air can enter, then drain a low pipe or the water left in the hot line. Treat anything that stood in open pipes.",
        "Drain a low pipe after you open a high tap.",
      ),
    ],
    options: [opt("treat", "Treat tank water before drinking", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.tropical",
    type: "instruction",
    pictogram: "vine",
    text: "In the jungle, rain is the cleanest water. After that, a water vine, a green bamboo section, or a banana-trunk well. Do not drink milky sap.",
    kid_text: "Catch rain. Plant water only if a grown-up says the plant is safe.",
    danger: "blade",
    safety: [WATER_SAFETY.seawater],
    steps: [
      step("rain", "raincatch", "Spread a leaf or a tarp before you cut anything. Rain needs no chemical if you caught it clean, but boil it when the surface was dirty.", "Catch rain first."),
      step(
        "vine",
        "vine",
        "A water vine is woody, not a thin green creeper, and the sap is clear, not milky or soapy. Cut it high, then low, so the water does not suck back up. Let the first drips fall, then catch the rest. If it tastes bitter, spit it out.",
        "Only a vine a grown-up knows. Sap must be clear.",
        "blade",
      ),
      step(
        "bamboo",
        "bamboo",
        "Lean a green bamboo culm. You can hear water in some sections. Cut just above a node and tip the water out. Old standing water gets the same treatment as a puddle.",
        "Tip water out of green bamboo.",
        "blade",
      ),
      step(
        "banana",
        "leaves",
        "A banana or plantain stump can be hollowed into a bowl after you cut the tree. The well fills overnight with watery sap. It is a supplement, not a day's ration, and you still treat it.",
        "A banana stump can fill overnight.",
        "blade",
      ),
    ],
    substitutions: [noContainer],
    options: [opt("treat", "Treat this water", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.temperate",
    type: "instruction",
    pictogram: "water",
    text: "In temperate forest, look for a spring or a stream, then a seep at the base of a slope where the ground turns dark and the plants stay green.",
    kid_text: "Look for a stream or a wet spot at the bottom of a hill.",
    steps: [
      step("stream", "water", "Take water from a moving stream above where trails and camps cross it. Moving is not the same as safe. You still treat it.", "A moving stream is better than a pond."),
      step(
        "spring",
        "well",
        "A spring is water coming out of the ground. Collect it at the source, before it sheets across leaves and droppings.",
        "Catch a spring where it leaves the ground.",
      ),
      step(
        "seep",
        "sand",
        "At the base of a slope, dig where the soil is dark and cold. A seep fills slowly. Give it an hour rather than stirring it into mud.",
        "Dig a small hole where the ground is already wet.",
      ),
    ],
    options: [opt("treat", "Treat this water", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.alpine",
    type: "instruction",
    pictogram: "melt",
    text: "Above the trees, melt snow or ice, or take a seep below a snowfield. Do not eat the snow. Do not trust a pretty stream that runs out of a herd's bedding area without treatment.",
    kid_text: "Melt snow. Do not eat it.",
    safety: [WATER_SAFETY.snow, WATER_SAFETY.boil],
    steps: [
      step("melt", "melt", "Scrape snow into a pot a little at a time. Ice from a clean shelf melts faster than powder snow.", "Melt a little snow at a time."),
      step(
        "seep",
        "water",
        "Below a snowfield the ground often weeps. Collect that before you spend the fuel to melt snow, then boil it. The altitude boil is 3 minutes once you are above 2,000 meters.",
        "Check for a seep under the snowfield.",
      ),
    ],
    substitutions: [snowMelt, noPot],
    options: [
      opt("stove", "Boil it on the stove", "Boil on the stove", "water.boil", "stove", hasStove),
      opt("other", "Choose another treatment", "Another way", "water.treat", "boil"),
    ],
  }),
  node({
    id: "water.grass",
    type: "instruction",
    pictogram: "grass",
    text: "On grassland, water hides where animals already looked. Trails that braid together, a darker line of green, and low ground after rain are the search pattern.",
    kid_text: "Follow animal trails and greener grass.",
    steps: [
      step("trails", "navigate", "Game trails converge. Walk them at dawn or dusk toward the thicker grass, not away from it.", "Follow the trails toward greener grass."),
      step("green", "leaves", "A ribbon of green in dry grass is a seep or a buried creek. Dig at the lowest green clump.", "Dig where the grass stays green."),
      step("rain", "raincatch", "After a storm, shallow pools sit in clay pans. They are muddy and full of droppings. Clarify, then disinfect.", "Rain pools still need treatment."),
    ],
    options: [opt("treat", "Treat this water", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.collect",
    type: "question",
    pictogram: "raincatch",
    text: "Nothing is pooled. Catch water from rain, from dew, or from a plant. A solar still is a last resort with a small yield.",
    kid_text: "Catch rain or dew. A sun still makes only a little.",
    steps: [],
    substitutions: [noContainer],
    options: [
      opt("rain", "Catch rain on a tarp", "Catch rain", "water.rain", "tarp"),
      opt("dew", "Wipe dew at dawn", "Wipe dew", "water.dew", "dew"),
      opt("bag", "Bag a leafy branch", "Bag a branch", "water.transpiration", "bag"),
      opt("still", "Build a solar still", "Sun still", "water.still", "uv"),
      opt("have", "I already have water to treat", "I have water", "water.treat", "boil"),
    ],
  }),
  node({
    id: "water.rain",
    type: "instruction",
    pictogram: "raincatch",
    text: "Rain caught in the air is the cleanest water you will get. Rain that washed a dirty tarp or a roof needs treatment.",
    kid_text: "Catch rain before it hits the ground.",
    steps: [
      step("spread", "tarp", "Spread a tarp, a poncho, or a broad leaf into a trough. Weight the center so the water runs to one cup.", "Make a dip in a tarp."),
      step("first", "water", "Let the first minutes wash the dust off, then start catching. That first wash is not drinking water.", "Wait until the surface is rinsed."),
      step("store", "bag", "Move the water into a closed container so it does not pick up dirt again.", "Close the container."),
    ],
    substitutions: [noContainer],
    options: [opt("treat", "Treat it if the surface was dirty", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.dew",
    type: "instruction",
    pictogram: "dew",
    text: "Dew is a dawn job. After the sun is fully up, it is gone. Tie cloth around your ankles and walk the wet grass, then wring it out.",
    kid_text: "At dawn, wipe the wet grass with a cloth.",
    steps: [
      step("cloth", "cloth", "Use a shirt or a bandana that is not salty. Wipe the grass, or walk with cloth tied at your ankles.", "Wipe the wet grass."),
      step("wring", "water", "Wring into a cup. It takes a long time to get a liter. Start as soon as you can see.", "Wring the cloth into a cup."),
    ],
    options: [opt("treat", "Treat the dew", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.transpiration",
    type: "instruction",
    pictogram: "bag",
    text: "A clear bag over a leafy branch catches water the leaves give off. Use a plant you know is not poisonous. Never bag a branch that bleeds milky or colored sap.",
    kid_text: "Put a bag on a leafy branch only if a grown-up knows the plant.",
    danger: "foraging",
    steps: [
      step(
        "pick",
        "leaves",
        "Choose a sunlit, non-toxic branch with plenty of leaves. If you cannot name the plant, do not use this method. Milky sap, a bitter smell, or an almond smell means you walk away.",
        "Only a plant a grown-up can name.",
      ),
      step(
        "bag",
        "bag",
        "Tie a clear bag around the branch so the leaves are inside and a corner hangs down. A small stone in that corner collects the drip. Leave it for the warm part of the day.",
        "Tie the bag so a corner hangs down.",
      ),
    ],
    substitutions: [noContainer],
    options: [opt("treat", "Treat what the bag caught", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.still",
    type: "instruction",
    pictogram: "uv",
    text: "A solar still makes a small amount of distilled water, often less than a liter a day. Build one when you have no other source, not as your first plan.",
    kid_text: "A sun still is the last choice. It makes a little water.",
    steps: [
      step("hole", "sand", "Dig a hole about a meter across and half a meter deep, in the sun, where the soil is damp if you can find damp soil.", "Dig a wide hole in the sun."),
      step(
        "cup",
        "pot",
        "Set a cup in the center. Stretch a clear plastic sheet over the hole, weight the edges with rock, and put one pebble on the sheet above the cup so the drip aims into it.",
        "A cup in the middle, a clear sheet, one pebble.",
      ),
      step(
        "wait",
        "sun",
        "Wait through the heat of the day. Green, non-toxic vegetation in the hole raises the yield a little. Do not add seawater and expect a full canteen. Drink what collects. It is already distilled.",
        "Wait all day. Drink the drips.",
      ),
    ],
    options: [opt("store", "Store and ration", "Save and sip", "water.store", "ration")],
  }),
  node({
    id: "water.treat",
    type: "question",
    pictogram: "boil",
    text: "Make it safe. If it is cloudy, pour it through cloth first so the treatment can reach the germs. Then boil if you can. Chemicals are next. A real filter is next. Sunlight in a clear bottle is the no-gear method.",
    kid_text: "Clean the water. Boil it if you can.",
    safety: [WATER_SAFETY.filter],
    steps: [],
    substitutions: [
      {
        id: "water.sub.filter",
        need: "a filter",
        pictogram: "filter",
        fallback_node: "water.clarify",
        alternatives: [improvisedFilter],
      },
    ],
    options: [
      opt("boil", "Boil", "Boil", "water.boil", "boil", hasBoil),
      opt("chem", "Chemical dose", "Use drops", "water.chemical", "bleach", hasChemical),
      opt("filter", "Filter", "Filter", "water.filter", "filter", hasFilter),
      opt("sodis", "Sunlight in a clear bottle", "Leave it in the sun", "water.sodis", "uv"),
    ],
  }),
  node({
    id: "water.boil",
    type: "instruction",
    pictogram: "boil",
    danger: "fire",
    text: "Boil at a rolling boil. One minute is the lowland time. Above 2,000 meters, keep the rolling boil for 3 minutes. Start the clock when the bubbles do not stop, not when the first wisp of steam shows.",
    kid_text: "Boil until it rolls, then wait. A grown-up watches the fire.",
    safety: [WATER_SAFETY.boil],
    steps: [
      step("cloth", "cloth", "If the water is cloudy, pour it through a shirt first. Mud hides germs from the heat a little less than people hope, and it tastes worse. Then boil.", "Pour cloudy water through cloth first."),
      step(
        "roll",
        "boil",
        "Bring it to a rolling boil for 1 minute. Above 2,000 m (about 6,500 ft) keep that rolling boil for 3 minutes. A simmer is not a boil.",
        "A real boil: 1 minute, or 3 minutes high up.",
      ),
      step("cool", "pot", "Set the pot where it will not be kicked over. Cover it so ash and insects stay out. Drink it once you can hold it.", "Let it cool with a cover on."),
    ],
    substitutions: [noPot],
    options: [opt("store", "Store and ration", "Save and sip", "water.store", "ration")],
  }),
  node({
    id: "water.nopot",
    type: "instruction",
    pictogram: "pot",
    no_gear: true,
    danger: "fire",
    text: "You can still boil without a metal pot. Use a full plastic bottle beside the coals, hot rocks in a bark or rock basin, or a green bamboo section.",
    kid_text: "No pot. A grown-up has to handle the hot rocks or the fire.",
    safety: [WATER_SAFETY.boil],
    steps: [
      step(
        "bottle",
        "bottle",
        "Fill a plastic bottle completely, cap it loosely, and set it next to the coals, not in the flame. A full bottle holds its shape. An empty one melts. Keep it at a rolling simmer-boil for the same 1 or 3 minutes.",
        "A full bottle beside the coals, never in the flame.",
        "fire",
      ),
      step(
        "rocks",
        "rock",
        "Heat dry rocks and drop them into the water in a bark bowl, a wood trough, or a rock basin. Keep adding rocks until the water rolls, and hold that roll for the altitude time.",
        "Drop hot dry rocks into the water.",
        "fire",
      ),
      step(
        "bamboo",
        "bamboo",
        "In the tropics, a green bamboo segment can sit over the coals. The green shell scorches slowly. Dry bamboo can burst.",
        "Green bamboo can sit over the coals.",
        "fire",
      ),
    ],
    options: [opt("store", "Store and ration", "Save and sip", "water.store", "ration")],
  }),
  node({
    id: "water.chemical",
    type: "instruction",
    pictogram: "bleach",
    danger: "chemical",
    text: "Chemical treatment is the step when you cannot boil. Bleach, 2% iodine tincture, and chlorine dioxide tablets are different products. Do not swap their doses.",
    kid_text: "Drops and tablets are a grown-up job.",
    safety: [WATER_SAFETY.bleach],
    steps: [
      step(
        "bleach",
        "bleach",
        "Plain unscented household bleach, 5–9% sodium hypochlorite only. Add 2 drops per liter of clear water. If the water is cloudy or cold, add 4 drops per liter. Shake, wipe the cap threads, and wait 30 minutes. It should smell faintly of chlorine. If it does not, repeat the dose once and wait another 30 minutes.",
        "Bleach: 2 drops each liter. A grown-up counts.",
        "chemical",
      ),
      step(
        "iodine",
        "iodine",
        "2% tincture of iodine: 5 drops per liter when the water is clear and not cold. Use 10 drops per liter if it is cloudy or cold. Wait 30 minutes, or 60 minutes when the water is cold. This is not the dose for povidone scrub or for tablets.",
        "Iodine: 5 drops each liter, if it is the brown tincture.",
        "chemical",
      ),
      step(
        "clo2",
        "tablet",
        "Chlorine dioxide tablets: follow the mark on the packet, usually one tablet per liter. Wait 30 minutes for clear water. Leave it 4 hours if you are worried about cysts and the packet says to. Do not use a tablet dose for bleach, or a bleach dose for tablets.",
        "Tablets: read the packet. One tablet is usual for a liter.",
        "chemical",
      ),
    ],
    options: [opt("store", "Store and ration", "Save and sip", "water.store", "ration")],
  }),
  node({
    id: "water.filter",
    type: "instruction",
    pictogram: "filter",
    text: "A pump, a straw, or a gravity filter you carried is a real filter. Use it the way it was built. An improvised sand and charcoal stack is not that tool.",
    kid_text: "Use the filter you brought. Sand in a bottle is not enough.",
    safety: [WATER_SAFETY.filter],
    steps: [
      step("pump", "filter", "Pump, straw, or gravity: backflush if the flow gets hard, and do not let the intake sit in the mud you stirred up.", "Use the real filter."),
      step(
        "after",
        "warning",
        "If the filter is cracked, frozen, or you do not trust it, boil or use a chemical afterward. A homemade sand filter never replaces that step.",
        "If the filter is broken, boil too.",
      ),
    ],
    substitutions: [
      {
        id: "water.sub.filter.onfilter",
        need: "a filter",
        pictogram: "sand",
        fallback_node: "water.clarify",
        alternatives: [improvisedFilter],
      },
    ],
    options: [opt("store", "Store and ration", "Save and sip", "water.store", "ration")],
  }),
  node({
    id: "water.clarify",
    type: "instruction",
    pictogram: "sand",
    no_gear: true,
    text: "A cloth, sand, and charcoal stack makes cloudy water clearer. It does not disinfect it. Boil, dose, or leave the clear water in the sun afterward.",
    kid_text: "Sand makes water look cleaner. It is not safe yet.",
    safety: [WATER_SAFETY.filter],
    steps: [
      step("cloth", "cloth", "Pour through a shirt first and catch the worst of the mud.", "Pour through a shirt."),
      step(
        "stack",
        "sand",
        "In a bottle with a pinhole: cloth, crushed charcoal, clean sand, then small gravel. Pour slowly. Discard the first cloudy cup.",
        "Cloth, charcoal, then sand.",
      ),
      step("again", "boil", "Disinfect what comes out. Clear water can still carry the germs that make you sick.", "Then boil, dose, or use the sun."),
    ],
    options: [
      opt("boil", "Boil after clarifying", "Boil it", "water.boil", "boil"),
      opt("chem", "Chemical dose after clarifying", "Use drops", "water.chemical", "bleach"),
      opt("sun", "Sunlight after clarifying", "Leave it in the sun", "water.sodis", "uv"),
    ],
  }),
  node({
    id: "water.sodis",
    type: "instruction",
    pictogram: "uv",
    no_gear: true,
    text: "SODIS uses the sun on a clear PET bottle. It is the method when you have no pot, no stove, no chemical, and no real filter. You still need a clear plastic bottle. Glass and colored plastic do not count.",
    kid_text: "Fill a clear plastic bottle and leave it in the sun.",
    steps: [
      step("cloth", "cloth", "If the water is cloudy, pour it through cloth until you can read the bottle's other side through it. If you still cannot, the sun will not finish the job.", "Cloudy water goes through cloth first."),
      step(
        "fill",
        "bottle",
        "Use a clear PET bottle, the kind soda comes in, not bigger than 2 liters. Fill it, cap it, and shake for 20 seconds so the water has oxygen.",
        "A clear soda bottle. Shake it.",
      ),
      step(
        "sun",
        "sun",
        "Lay the bottle on its side in full sun, on a dark surface if you have one. Leave it for 6 hours of full sun. If the day is cloudy, leave it for 2 days. Do not drink it early.",
        "6 hours of full sun, or 2 cloudy days.",
      ),
    ],
    options: [opt("store", "Store and ration", "Save and sip", "water.store", "ration")],
  }),
  node({
    id: "water.nocontainer",
    type: "instruction",
    pictogram: "bag",
    no_gear: true,
    text: "With no bottle, carry water in an unlubricated condom inside a sock, a plastic bag lined into a hat, a bamboo tube, or a birch-bark cup.",
    kid_text: "No bottle. Use a bag, a bamboo tube, or folded bark.",
    steps: [
      step("condom", "pouch", "Rinse an unlubricated condom, slip it into a sock, and fill it. Spermicide and flavored lubricant are not drinking water.", "A rinsed condom inside a sock."),
      step("bag", "bag", "A plastic bag needs a hat or a boot to give it shape. Double the bag if the seams look weak.", "A bag inside a hat."),
      step("plant", "bamboo", "Bamboo cut at a node, or birch bark folded and pinned, will hold water for the walk back to camp.", "Bamboo or folded bark."),
    ],
    options: [opt("treat", "Treat it once you have a vessel", "Make it safe", "water.treat", "boil")],
  }),
  node({
    id: "water.store",
    type: "terminal",
    pictogram: "ration",
    text: "Ration sweat, not water. Drink what you have treated. Saving the last liter while you keep working in the heat is how people collapse with a full canteen. If water is still scarce, skip high-protein food. Rest in shade during the hottest hours and do the next search at dawn or dusk.",
    kid_text: "Drink the safe water. Rest when it is hottest. Do not eat a big meat meal if water is low.",
    safety: [WATER_SAFETY.protein, WATER_SAFETY.seawater],
    steps: [
      step("drink", "water", "Drink treated water now, enough that your urine starts to lighten. Then fill what you can carry.", "Drink now, then fill the bottles."),
      step("sweat", "sun", "Work slowly, keep your clothes on as sun cover, and rest in shade. The sweat you do not spill is water you do not have to find.", "Rest in the shade. Keep your shirt on."),
      step("next", "navigate", "Mark the source before you leave it, so you can come back. If it was a seep, leave the hole covered with a flat rock.", "Remember where the water was."),
    ],
    options: [],
  }),
];

export const waterTree: Tree = {
  id: "water",
  title: "Water",
  version: "1",
  section: "water",
  entry_node: "water.triage",
  nodes,
};
