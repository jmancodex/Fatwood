import { FIRE_SAFETY } from "../safety";
import type { Alternative, Node, Option, Step, Substitution, Tree } from "../types";

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

const tinderAlts: Alternative[] = [
  {
    item: "cotton balls with petroleum jelly",
    pictogram: "cotton",
    requires: ["cotton_balls"],
    how_to:
      "Pull a cotton ball fluffy, smear a pea of petroleum jelly through it, and light an edge. It burns for several minutes and lights damp kindling.",
    caveats: "Keep the tin sealed. Jelly on your hands will transfer to every surface.",
  },
  {
    item: "char cloth",
    pictogram: "charcloth",
    requires: ["char_cloth"],
    how_to: "Hold a spark on the cloth until a red coal grows, then fold it into a tinder bundle and blow to flame.",
    caveats: "Char cloth dies if you let the coal see a gust before it is nested.",
  },
  {
    item: "hand sanitizer",
    pictogram: "sanitizer",
    requires: ["hand_sanitizer"],
    how_to: "Soak a scrap of cloth or a cotton ball and light it. Alcohol gel lights when liquid fuel will not.",
    caveats: "The flame is nearly invisible in sun. It does not last. Have kindling in your hand.",
  },
  {
    item: "chips or a corn snack",
    pictogram: "chips",
    requires: ["chips"],
    how_to: "Oily chips take a spark or a match and burn long enough to catch pencil-thin kindling.",
    caveats: "Grease drips. Do not hold the chip in your fingers once it is lit.",
  },
  {
    item: "fatwood you already found",
    pictogram: "fatwood",
    requires: ["fatwood"],
    how_to:
      "Shave a resinous pine knot into curls. The sap lights wet and in wind. Scrape fresh surface if the outside is glazed.",
    caveats: "Fatwood pops. Keep your face back.",
  },
  {
    item: "birch bark you already found",
    pictogram: "birch",
    requires: ["birch_bark"],
    how_to: "Peel thin papery sheets, not the green inner bark. Roll them loose and light a corner. Oil in the bark burns while damp.",
    caveats: "Do not ring a living birch. Take loose sheets from dead falls.",
  },
  {
    item: "fatwood from a pine stump or knot",
    pictogram: "fatwood",
    biomes: ["temperate_forest", "boreal/snow"],
    how_to:
      "Look for a resin-soaked pine stump, a knot that will not rot, or the pitchy core of a dead limb. Shave curls. They light with a spark even when the day is wet.",
    caveats: "The outside may be soggy. Carve in until the wood looks glassy and smells of pitch.",
  },
  {
    item: "birch bark",
    pictogram: "birch",
    biomes: ["boreal/snow", "temperate_forest"],
    how_to:
      "Paper birch bark lights when it is wet because of the oils in it. Peel loose outer sheets from dead wood, crumple them, and light an edge.",
    caveats: "Thick wet slabs smolder. Thin sheets, loosely piled, catch.",
  },
  {
    item: "shredded cedar or juniper bark",
    pictogram: "bark",
    biomes: ["temperate_forest", "alpine"],
    how_to:
      "Pull the fibrous inner bark of dead cedar or juniper and rub it between your palms until it is hair. Nest a coal or a flame in the middle.",
    caveats: "Stringy bark that is still in sheets will not take. It has to be fluffy.",
  },
  {
    item: "cattail fluff",
    pictogram: "cattail",
    biomes: ["temperate_forest", "grassland", "coastal"],
    avoid_weather: ["wet"],
    how_to: "Pull the seed head apart into a loose ball. It flashes. Have kindling already stacked over it.",
    caveats: "Cattail fluff vanishes if it is damp. Dry it inside your shirt before you try.",
  },
  {
    item: "dry grass",
    pictogram: "grass",
    biomes: ["grassland", "desert", "temperate_forest"],
    avoid_weather: ["wet", "freezing"],
    how_to: "Gather the finest dead grass, roll a bird's nest, and feed the ember from the center outward.",
    caveats: "Green grass will not light. If it bends without snapping, it is too alive.",
  },
  {
    item: "dried dung",
    pictogram: "dung",
    biomes: ["grassland", "desert"],
    how_to:
      "Use dung that is dry through and breaks clean. Crumble a powdery nest, then add coin-sized chips once you have flame.",
    caveats: "Fresh dung will not light. If it smears, leave it.",
  },
  {
    item: "coconut husk coir",
    pictogram: "coconut",
    biomes: ["tropical/jungle", "coastal"],
    how_to: "Tease dry coir from a husk into fibers. It holds a coal. Blow gently until the fibers flame.",
    caveats: "Husk that has been in the surf is salted and resists a flame. Use husk from above the beach.",
  },
  {
    item: "feather stick from standing dead wood",
    pictogram: "feather",
    how_to:
      "Split a wrist-thick piece of dead standing wood to the dry core. Shave curls toward you, leaving them attached, until the stick looks like a feather. Light the curls.",
    caveats: "Wood on the ground is rotten or soaked. Standing dead, under the bark, is the dry wood.",
  },
];

const fuelAlts: Alternative[] = [
  {
    item: "driftwood above the high-tide line",
    pictogram: "driftwood",
    biomes: ["coastal"],
    how_to:
      "Collect wood stranded above the high-tide line, gray and light in the hand. Split it. Use the dry core for kindling and the larger pieces for fuel.",
    caveats: "Saltwater-soaked wood spits, pops, and carries salt into your eyes and pot. Leave anything below the last tide mark.",
  },
  {
    item: "sagebrush or creosote",
    pictogram: "sage",
    biomes: ["desert"],
    how_to: "Break dead sage or creosote stems. The fine dead twigs are kindling. Wrist-thick dead stems are fuel.",
    caveats: "Creosote smoke is harsh. Sit upwind.",
  },
  {
    item: "dried dung fuel",
    pictogram: "dung",
    biomes: ["grassland", "desert"],
    how_to: "Stack dry dung chips like flat stones over a grass flame. They coal slowly and hold heat for cooking.",
    caveats: "Wet dung smothers the fire. Dry chips only.",
  },
  {
    item: "animal fat",
    pictogram: "fat",
    biomes: ["boreal/snow", "alpine", "coastal"],
    how_to:
      "Render a small amount of seal, fish, or other animal fat onto cloth or into a hollow of bark and light that. Fat is a fuel when wood is buried.",
    caveats: "Fat fire is smoky and hard to put out. Set it on mineral soil or a green-log raft, not on snow alone.",
  },
  {
    item: "palm scrap and husk",
    pictogram: "coconut",
    biomes: ["tropical/jungle"],
    how_to: "Use dry palm ribs and husk fiber. Wet jungle wood on the ground will not hold. Look for dead wood hung up in branches.",
    caveats: "Green palm will not burn. Bend-test every piece.",
  },
  {
    item: "scrap lumber or cardboard",
    pictogram: "fuel",
    biomes: ["urban_ruin"],
    how_to:
      "Split scrap lumber and crumple dry cardboard as tinder. Burn in a metal container or on bare concrete away from walls.",
    caveats: "Skip plastics, foam, and painted wood. Their smoke is poisonous in a closed room.",
  },
  {
    item: "split standing dead wood",
    pictogram: "fuel",
    how_to:
      "Knock a dead branch that is still on the tree. If it snaps and shows a dry core, split it down and use the inside. Gather twice what you think you need before you light.",
  },
];

const tinderSub = (id: string): Substitution => ({
  id,
  need: "tinder",
  pictogram: "tinder",
  alternatives: tinderAlts,
  fallback_node: "fire.method.feather",
});

const fuelSub = (id: string): Substitution => ({
  id,
  need: "fuel",
  pictogram: "fuel",
  alternatives: fuelAlts,
  fallback_node: "fire.fuel.core",
});

const bowWood: Substitution = {
  id: "bow-wood",
  need: "bow drill wood",
  pictogram: "bowdrill",
  fallback_node: "fire.method.plough",
  alternatives: [
    {
      item: "yucca",
      pictogram: "sage",
      biomes: ["desert"],
      how_to: "A dry yucca stalk is the spindle. A split yucca or cottonwood slab is the hearth. Carve a notch that reaches the edge of the coal pit.",
      caveats: "Green yucca polishes instead of making dust.",
    },
    {
      item: "cedar",
      pictogram: "bark",
      biomes: ["temperate_forest", "boreal/snow"],
      how_to: "Cedar on cedar, both dead and dry, makes a coal in damp climates when harder woods only shine.",
    },
    {
      item: "willow",
      pictogram: "leaves",
      biomes: ["temperate_forest", "boreal/snow", "alpine", "grassland"],
      how_to: "Dead willow is soft enough for a hand-powered set. Keep the spindle and hearth the same species.",
    },
    {
      item: "cottonwood",
      pictogram: "leaves",
      biomes: ["grassland", "coastal", "temperate_forest"],
      how_to: "Use dead cottonwood for both hearth and spindle. The dust should be dark brown and clump, not pale and fluffy.",
    },
    {
      item: "basswood",
      pictogram: "bark",
      biomes: ["temperate_forest"],
      how_to: "Basswood is a classic hearth. Pair it with a slightly harder spindle if you have one, or basswood on basswood.",
    },
    {
      item: "the driest soft dead wood you can split",
      pictogram: "fuel",
      how_to: "Pick wood you can dent with a thumbnail. Same species for hearth and spindle. If the set glazes, change wood rather than skinning your hands.",
    },
  ],
};

const gas = [FIRE_SAFETY.gasoline];

const nodes: Node[] = [
  {
    id: "fire.why",
    type: "question",
    pictogram: "question",
    text: "Why do you need fire? If anyone is slipping into hypothermia, that comes before cooking, signaling, or comfort.",
    kid_text: "Why do you need a fire? If someone is very cold, that comes first.",
    steps: [],
    options: [
      opt("warmth", "Warmth or hypothermia", "Someone is too cold", "fire.hypothermia", "warmth", {
        sets: { purpose: "warmth" },
      }),
      opt("purify", "Purify water", "Clean water", "fire.conditions", "boil", {
        sets: { purpose: "purify" },
      }),
      opt("cook", "Cook food", "Cook", "fire.conditions", "cook", {
        sets: { purpose: "cook" },
      }),
      opt("signal", "Signaling", "Be seen", "fire.conditions", "signal", {
        sets: { purpose: "signal" },
      }),
      opt("morale", "Morale or insects", "Bugs or comfort", "fire.conditions", "insects", {
        sets: { purpose: "morale" },
      }),
    ],
  },
  {
    id: "fire.hypothermia",
    type: "warning",
    pictogram: "warmth",
    text: "Hypothermia outranks every other use of fire. Get the person out of the wind, off the ground, and into dry layers before you fuss with a perfect fire lay. A small flame upwind of a reflector heats them faster than a bonfire they cannot sit beside.",
    kid_text: "Someone is too cold. Block the wind, keep them dry, and get a grown-up to make a small fire.",
    steps: [
      step("h1", "shelter", "Move them out of wind and off snow or wet ground. Sit them on a pack, boughs, or a dry pad.", "Get them out of the wind."),
      step("h2", "blanket", "Replace wet clothes if you have dry ones. Cover the head and neck. Warm the trunk, not the arms and legs first.", "Put on dry clothes."),
      step("h3", "person", "Share a dry sleeping bag or blanket if they are shivering and still thinking clearly. Handle a confused, stiff person gently.", "Stay close and be gentle."),
      step("h4", "fire", "Build the fire you are about to plan, with a reflector, close enough to feel on the chest within a few minutes.", "A small fire close by."),
    ],
    options: [opt("onward", "Choose the fire for these conditions", "Next", "fire.conditions", "next")],
    sources: ["Wilderness Medical Society hypothermia field guidance."],
  },
  {
    id: "fire.conditions",
    type: "question",
    pictogram: "question",
    text: "What are you lighting in? Pick the condition that will fight you hardest. Snow and a lack of wood change the site and the fuel before you strike anything.",
    kid_text: "What is it like outside?",
    steps: [],
    options: [
      opt("snow", "Snow", "Snow", "fire.site", "snow", {
        conditions: [{ op: "any", of: [{ op: "weather_in", weather: ["freezing"] }, { op: "flag", key: "condition", value: "snow" }] }],
        sets: { condition: "snow" },
      }),
      opt("nowood", "No wood", "No trees", "fire.fuel.nowood", "nowood", {
        conditions: [{ op: "biome_in", biomes: ["desert", "alpine"] }],
        sets: { condition: "nowood" },
      }),
      opt("wet", "Wet", "Wet", "fire.site", "weather_wet", {
        conditions: [{ op: "any", of: [{ op: "weather_in", weather: ["wet"] }, { op: "flag", key: "condition", value: "wet" }] }],
        sets: { condition: "wet" },
      }),
      opt("windy", "Windy", "Windy", "fire.site", "wind", {
        conditions: [{ op: "flag", key: "force_wind", value: "yes" }],
        sets: { condition: "windy" },
      }),
      opt("dry", "Dry", "Dry", "fire.site", "weather_dry", { sets: { condition: "dry" } }),
    ],
  },
  {
    id: "fire.fuel.nowood",
    type: "instruction",
    danger: "fire",
    pictogram: "nowood",
    text: "There is little or no firewood here. Use what the ground actually offers, and gather the fuel pile before you spend a match or a spindle.",
    kid_text: "There is not much wood. Use dry plants, dung, or bush stems. Get a grown-up.",
    steps: [
      step("n1", "grass", "In desert and grassland, dried dung and dead grass are real fuel. Powder the dung and twist the finest grass into a nest.", "Use dry grass or dry dung."),
      step("n2", "sage", "Dead sagebrush and creosote snap when they are ready. Green stems bend and will not carry a flame.", "Dead bushes can burn."),
      step("n3", "fuel", "Above treeline, look for dwarf willow, roots in the soil, and any resinous scrap. If you truly have nothing that burns, do not waste a lighter. Prioritize shelter and signaling.", "Look for tiny dead sticks."),
      step("n4", "tinder", "Gather twice the pile you think you need. A short flame with no reserve is how people get stranded in the dark with wet hands.", "Gather a lot before you light."),
    ],
    substitutions: [fuelSub("fuel-nowood"), tinderSub("tinder-nowood")],
    options: [
      opt("core", "Split a dry core anyway", "Split wood", "fire.fuel.core", "knife", {
        conditions: [{ op: "flag", key: "force_core", value: "yes" }],
      }),
      opt("onward", "Pick the site", "Next", "fire.site", "site"),
    ],
  },
  {
    id: "fire.site",
    type: "instruction",
    danger: "fire",
    pictogram: "site",
    text: "Pick the site before you gather. A bad site burns the place down, smokes you out, or dies in a melt-hole in the snow.",
    kid_text: "Pick a safe spot before you light anything.",
    safety: [FIRE_SAFETY.rocks, FIRE_SAFETY.restrictions, FIRE_SAFETY.co],
    steps: [
      step("s1", "wind", "Shelter the pit from the main wind with a rock, a log, or a snow wall, but do not seal the space. Smoke needs a way out.", "Block the wind, but leave a way for smoke to leave."),
      step("s2", "warning", "Look up. Do not build under dead branches or a snow load on limbs. Those are widowmakers. They fall when the heat loosens them.", "Look up for dead branches."),
      step("s3", "site", "Keep a clear radius of about 3 meters down to mineral soil. Scrape away duff, peat, and root mats. Fire crawls through them underground and comes up later.", "Clear the ground around the spot."),
      step("s4", "rock", "On bare mineral soil is best. A rock platform is next, using dry rocks only. On snow, lay a raft of green logs two layers thick so the fire does not sink into meltwater.", "Use bare dirt, dry rocks, or green logs on snow."),
      step("s5", "vent", "If the only calm air is inside a tent, snow cave, or tight shelter, do not light it there. Step outside or open a real vent above the fire and a low inlet. Carbon monoxide does not smell.", "Do not light a fire in a closed tent or snow cave."),
    ],
    options: [opt("onward", "Gather tinder, kindling, and fuel", "Gather wood", "fire.materials", "tinder")],
    sources: ["National Wildfire Coordinating Group campfire practice."],
  },
  {
    id: "fire.materials",
    type: "instruction",
    danger: "fire",
    pictogram: "tinder",
    text: "Sort the wood into three grades before you light: tinder, kindling, and fuel. Gather twice what you think you need. Most fires die because the pile ran out while the builder was still searching.",
    kid_text: "Make three piles: fluffy stuff, little sticks, and bigger sticks. Get twice as much as you think.",
    steps: [
      step("m1", "tinder", "Tinder takes the first flame or coal: fluffy, pencil-lead fine, dry at the core. A nest the size of a grapefruit.", "A fluffy nest for the first flame."),
      step("m2", "kindling", "Kindling runs from pencil-lead up to pencil thickness, then finger thickness. Snap every piece. If it bends, it is not ready.", "Little sticks that snap."),
      step("m3", "fuel", "Fuel is wrist thickness and up. Split big pieces so the edges catch. Do not lay wrist-thick wood on a new flame.", "Bigger sticks after the fire is strong."),
      step("m4", "feather", "If everything looks wet, split dead standing wood and shave the dry inside into a feather stick. That is the no-gear tinder.", "Shave curls off a dry stick.", "blade"),
    ],
    substitutions: [tinderSub("tinder-main"), fuelSub("fuel-main")],
    options: [
      opt("feather", "Carve a feather stick first", "Make curls", "fire.method.feather", "feather", {
        conditions: [{ op: "flag", key: "force_feather", value: "yes" }],
      }),
      opt("onward", "Choose how you will light it", "Light it", "fire.ignition", "fire"),
    ],
  },
  {
    id: "fire.fuel.core",
    type: "instruction",
    danger: "blade",
    no_gear: true,
    pictogram: "knife",
    text: "No listed fuel fits. Split dead standing wood to its dry core. This is the no-gear fuel method, and it works in every biome that has a dead stem.",
    kid_text: "Split a dead stick and use the dry inside. A grown-up should use the blade.",
    steps: [
      step("c1", "fuel", "Take wood from a standing dead tree or a limb that is off the ground. Ground wood wicks water.", "Use a dead branch that is not on the wet ground."),
      step("c2", "knife", "Batoning or carving, split it lengthwise until you reach wood that looks dry and feels warm compared to the shell.", "Split it to the dry middle.", "blade"),
      step("c3", "feather", "Shave a bundle of curls off the core for tinder, then split pencil-sized sticks for kindling.", "Shave curls, then little sticks.", "blade"),
    ],
    options: [opt("onward", "Choose how you will light it", "Light it", "fire.ignition", "fire")],
  },
  {
    id: "fire.ignition",
    type: "question",
    danger: "fire",
    pictogram: "fire",
    text: "Light with the surest method you actually have. Work down the list. Do not skip to a bow drill if a ferro rod is in your pocket.",
    kid_text: "Pick the way you will light the fire. A grown-up does this part.",
    safety: gas,
    steps: [
      step("i1", "warning", "Lay the tinder and a handful of kindling before you strike. A flame with nothing ready is wasted.", "Have the little sticks ready first."),
      step("i2", "lighter", "Order: lighter, ferro rod, matches, sun lens, battery and steel wool or foil, bow drill, hand drill in dry country, fire plough last.", "Use the easiest tool you have."),
    ],
    options: [
      opt("lighter", "Lighter", "Lighter", "fire.method.lighter", "lighter", {
        conditions: [{ op: "has_all", items: ["lighter"] }],
      }),
      opt("ferro", "Ferro rod", "Spark stick", "fire.method.ferro", "ferro", {
        conditions: [{ op: "has_all", items: ["ferro_rod"] }],
      }),
      opt("matches", "Matches", "Matches", "fire.method.matches", "matches", {
        conditions: [{ op: "has_all", items: ["matches"] }],
      }),
      opt("sun", "Sun lens or clear bottle", "Use the sun", "fire.method.sun", "magnifier", {
        conditions: [
          { op: "has_any", items: ["magnifier", "clear_bottle"] },
          { op: "daylight", value: true },
          { op: "weather_in", weather: ["dry", "hot"] },
        ],
      }),
      opt("battery", "Battery and steel wool or foil", "Battery", "fire.method.battery", "battery", {
        conditions: [
          { op: "has_all", items: ["battery"] },
          { op: "has_any", items: ["steel_wool", "foil"] },
        ],
      }),
      opt("hand", "Hand drill", "Spin a stick", "fire.method.hand", "handdrill", {
        conditions: [
          { op: "biome_in", biomes: ["desert", "grassland"] },
          { op: "weather_in", weather: ["dry", "hot"] },
        ],
      }),
      opt("plough", "Fire plough", "Rub a groove", "fire.method.plough", "plough", {
        conditions: [{ op: "flag", key: "force_plough", value: "yes" }],
      }),
      opt("bow", "Bow drill", "Bow drill", "fire.method.bow", "bowdrill"),
    ],
  },
  {
    id: "fire.method.lighter",
    type: "instruction",
    danger: "fire",
    pictogram: "lighter",
    text: "A lighter is the most reliable spark you carry. Shield the thumbwheel from wind with your body and cup the flame until kindling has taken.",
    kid_text: "Use the lighter. A grown-up should hold it.",
    safety: gas,
    steps: [
      step("l1", "wind", "Turn your back to the wind. Light the tinder bundle, not a thick stick.", "Block the wind with your body."),
      step("l2", "tinder", "Hold the flame under the curls or bark until they are burning on their own, then set the bundle in the lay.", "Light the fluffy stuff."),
      step("l3", "kindling", "Add pencil-thin pieces one at a time. Do not dump the pile on.", "Add little sticks slowly."),
    ],
    options: [opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee")],
  },
  {
    id: "fire.method.ferro",
    type: "instruction",
    danger: "fire",
    pictogram: "ferro",
    text: "A ferro rod throws a hot spark in wet and wind. Scrape, do not tap. Aim into the tinder, not onto your knuckles.",
    kid_text: "Scrape the spark stick into the fluffy tinder. A grown-up should do it.",
    safety: gas,
    steps: [
      step("f1", "feather", "Hold the rod in the tinder so sparks land in the middle of the nest or on fatwood curls.", "Put sparks in the middle of the nest."),
      step("f2", "ferro", "Press the scraper hard and pull the rod back, not the scraper forward, so you do not knock the tinder apart.", "Pull the rod, not the pile."),
      step("f3", "oxygen", "When a coal or a wisp starts, breathe on it steadily. A hard puff kills it.", "Blow gently."),
    ],
    options: [opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee")],
  },
  {
    id: "fire.method.matches",
    type: "instruction",
    danger: "fire",
    pictogram: "matches",
    text: "Matches are a finite number of tries. Strike one only when the lay is built and the tinder is in place.",
    kid_text: "Light a match only when the wood is ready. A grown-up should do it.",
    safety: gas,
    steps: [
      step("a1", "matches", "Cup the match against the wind. A storm match is better. A paper match needs still air.", "Cover the match from the wind."),
      step("a2", "tinder", "Touch the flame to the underside of the tinder. Dropping a burning match on top often snuffs it.", "Light the bottom of the nest."),
      step("a3", "kindling", "Have the next three sticks in your other hand so you are not digging while the flame climbs.", "Hold the next sticks ready."),
    ],
    options: [opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee")],
  },
  {
    id: "fire.method.sun",
    type: "instruction",
    danger: "fire",
    pictogram: "sun",
    text: "A magnifying lens, eyeglasses in a pinch, a clear water-filled bottle, or a clear ice lens can start a coal in full sun. This fails under cloud, in shade, and after the sun is low.",
    kid_text: "Use the sun only when the sky is bright. A grown-up aims it.",
    safety: gas,
    steps: [
      step("u1", "magnifier", "Focus the brightest pinpoint you can onto dark, fine tinder: char cloth, dung powder, or a blackened curl. A wide pale spot will not coal.", "Make a tiny bright dot on dark fluff."),
      step("u2", "bottle", "A clear bottle works when you shape the light into a point. An ice lens must be clear, not snowy, with both faces smoothed.", "A clear bottle or clear ice can work."),
      step("u3", "oxygen", "Hold still until a thread of smoke becomes a coal. Then nest it and blow to flame.", "Wait for smoke, then blow gently."),
    ],
    options: [opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee")],
  },
  {
    id: "fire.method.battery",
    type: "instruction",
    danger: "fire",
    pictogram: "battery",
    text: "A battery and a shred of steel wool, or a battery and a foil gum wrapper cut to a narrow bridge, will glow hot enough to light tinder.",
    kid_text: "A battery can make heat. A grown-up should do this. It can burn fingers.",
    safety: gas,
    steps: [
      step("b1", "wool", "Stretch a fine wisp of steel wool so it bridges the cell terminals. It flares. Have it touching the tinder when it does.", "Steel wool flares when it touches both ends of the battery."),
      step("b2", "foil", "For a gum wrapper, cut the foil so a thin neck is the only path. Touch the ends to the terminals. The neck burns through and can light tinder under it.", "A thin strip of foil gets hot in the middle."),
      step("b3", "warning", "Do not use this near your face. One cell is enough. Do not open a battery.", "Keep it away from your face."),
    ],
    options: [opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee")],
  },
  {
    id: "fire.method.hand",
    type: "instruction",
    danger: "fire",
    no_gear: true,
    pictogram: "handdrill",
    text: "The hand drill is a no-gear method for dry climates only: desert and dry grassland. In wet, cold timber it usually fails. Use a mullein or yucca stalk as the spindle and a cedar or cottonwood hearth.",
    kid_text: "Spin a dry stick between your hands. This only works when the land is dry. A grown-up should do it.",
    safety: gas,
    steps: [
      step("hd1", "handdrill", "Cut a thumb-thick spindle about 60 cm long, straight and dry. The hearth is a flat slab you can notch to the edge.", "Use a long dry stick and a flat dry board."),
      step("hd2", "sage", "In desert, a yucca stalk on a yucca or cottonwood hearth is the usual set. Mullein stalks work on the plains.", "Yucca or mullein are good spindles."),
      step("hd3", "oxygen", "Spin between your palms, walking your hands down the stalk, and press. When brown dust packs into the notch and smokes after you stop, you have a coal. Tip it into the nest.", "Spin until brown dust smokes, then tip it into the nest."),
    ],
    options: [
      opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee"),
      opt("fail", "This wood will not coal", "Try another way", "fire.method.plough", "plough", { retry: true }),
    ],
  },
  {
    id: "fire.method.bow",
    type: "instruction",
    danger: "fire",
    no_gear: true,
    pictogram: "bowdrill",
    text: "The bow drill is the no-gear method when you do not have a lighter, ferro rod, or matches. It needs a bow, a socket, a spindle, and a hearth. Dry soft wood matters more than strength.",
    kid_text: "The bow drill makes a coal by spinning wood on wood. A grown-up should do this.",
    safety: gas,
    substitutions: [bowWood],
    steps: [
      step("bd1", "cord", "The bow is a forearm-length stick with cord, a shoelace, or twisted bark strung loosely. The spindle should wrap once and not slip.", "Tie a string on a bent stick."),
      step("bd2", "bowdrill", "Carve a shallow pit in the hearth, spin until it seats, then cut a notch from the pit to the edge. The coal forms in that notch.", "Cut a notch so the dust can fall out."),
      step("bd3", "bark", "Good pairs by country: yucca in the desert, cottonwood on rivers and plains, willow, cedar, and basswood in temperate and boreal woods.", "Use two pieces of the same dry soft wood."),
      step("bd4", "oxygen", "Long smooth strokes. When thick smoke pours and the dust looks charred, stop, tap the coal into your tinder nest, and blow it to flame.", "Stop when it smokes hard, then blow the nest."),
    ],
    options: [
      opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee"),
      opt("fail", "This set will not make a coal", "Try the plough", "fire.method.plough", "plough", { retry: true }),
    ],
  },
  {
    id: "fire.method.plough",
    type: "instruction",
    danger: "fire",
    no_gear: true,
    pictogram: "plough",
    text: "The fire plough is the last no-gear method. You rub a hardwood stick along a groove in a soft dry board until dust at the end of the groove coals.",
    kid_text: "Rub a stick in a groove until the dust glows. A grown-up should do this. It is slow.",
    safety: gas,
    steps: [
      step("p1", "plough", "Cut a groove the length of a soft dry board. The plough stick is harder and blunt, not sharp.", "Rub a blunt stick along a groove."),
      step("p2", "oxygen", "Drive the dust to the far end. When it smokes on its own, tip that coal into a tinder nest and blow.", "Push the hot dust into the nest and blow."),
    ],
    options: [opt("onward", "Choose the fire lay", "Build it", "fire.lay", "teepee")],
  },
  {
    id: "fire.method.feather",
    type: "instruction",
    danger: "blade",
    no_gear: true,
    pictogram: "feather",
    text: "A feather stick is the no-gear tinder. It does not depend on bark, dung, or a dry day, as long as you can reach the dry wood inside a dead stem.",
    kid_text: "Shave curls on a dry stick. A grown-up uses the knife.",
    steps: [
      step("fe1", "fuel", "Split dead standing wood. Ignore the wet shell.", "Split a dead stick."),
      step("fe2", "knife", "Shave thin curls toward the base and leave them attached. Fill the stick until it looks like a feather.", "Make lots of curls.", "blade"),
      step("fe3", "fire", "Light the curls low. They are your tinder bundle. Feed pencil sticks as soon as they catch.", "Light the curls, then add little sticks."),
    ],
    options: [opt("onward", "Choose how you will light the curls", "Light it", "fire.ignition", "fire")],
  },
  {
    id: "fire.lay",
    type: "question",
    pictogram: "teepee",
    text: "The lay matches the job. A teepee starts fast. A log cabin makes cooking coals. A lean-to faces wind and rain. A platform keeps the fire off snow. A Dakota hole stays low. A star fire saves fuel.",
    kid_text: "Pick the shape of the fire.",
    steps: [],
    options: [
      opt("platform", "Platform on snow", "On top of logs", "fire.lay.platform", "platform", {
        conditions: [
          {
            op: "any",
            of: [
              { op: "flag", key: "condition", value: "snow" },
              { op: "weather_in", weather: ["freezing"] },
            ],
          },
        ],
      }),
      opt("leanto", "Lean-to", "Lean-to", "fire.lay.leanto", "leanto", {
        conditions: [
          {
            op: "any",
            of: [
              { op: "flag", key: "condition", value: "wet" },
              { op: "flag", key: "condition", value: "windy" },
              { op: "weather_in", weather: ["wet"] },
            ],
          },
        ],
      }),
      opt("cabin", "Log cabin", "Cabin", "fire.lay.cabin", "cabin", {
        conditions: [{ op: "flag", key: "purpose", value: "cook" }],
      }),
      opt("dakota", "Dakota hole", "Hole fire", "fire.lay.dakota", "dakota", {
        conditions: [{ op: "flag", key: "purpose", value: "signal" }],
      }),
      opt("star", "Star fire", "Star", "fire.lay.star", "starfire", {
        conditions: [{ op: "flag", key: "purpose", value: "morale" }],
      }),
      opt("teepee", "Teepee", "Teepee", "fire.lay.teepee", "teepee"),
    ],
  },
  {
    id: "fire.lay.teepee",
    type: "instruction",
    danger: "fire",
    pictogram: "teepee",
    text: "A teepee lights fast and throws heat now. Use it to get the fire going, then rebuild into a cabin or a star once you have coals.",
    kid_text: "Stand little sticks in a cone over the fluffy tinder.",
    steps: [
      step("t1", "tinder", "Set the burning tinder in the center.", "Put the flame in the middle."),
      step("t2", "kindling", "Lean pencil sticks into a cone, leaving a door on the windward side so air can enter.", "Make a cone with a door for air."),
      step("t3", "fuel", "Add finger wood, then wrist wood, only after the cone is burning without your hands.", "Add bigger sticks when it is really burning."),
    ],
    options: [opt("onward", "If it struggles, troubleshoot", "Check the fire", "fire.troubleshoot", "question")],
  },
  {
    id: "fire.lay.cabin",
    type: "instruction",
    danger: "fire",
    pictogram: "cabin",
    text: "A log cabin collapses into a bed of cooking coals. Build a small teepee in the middle, then stack fuel in pairs like a crib.",
    kid_text: "Stack sticks in a square around a small cone. Good for cooking.",
    steps: [
      step("c1", "teepee", "Light a small teepee in the center first.", "Light a small cone first."),
      step("c2", "cabin", "Lay two sticks, then two across them, leaving gaps for air. Three or four layers is enough.", "Stack a little square of sticks."),
      step("c3", "cook", "Wait until the crib falls into coals before you set a pot on. Flame under a pot just blacks it.", "Wait for coals before cooking."),
    ],
    options: [opt("onward", "If it struggles, troubleshoot", "Check the fire", "fire.troubleshoot", "question")],
  },
  {
    id: "fire.lay.leanto",
    type: "instruction",
    danger: "fire",
    pictogram: "leanto",
    text: "A lean-to keeps rain and wind off the young flame. A ridge stick or a wet log is the support. Tinder goes under the lean, not on top.",
    kid_text: "Lean sticks against a log so the rain and wind stay off the flame.",
    steps: [
      step("e1", "leanto", "Peg or brace a wrist-thick stick at an angle. Lean pencil kindling against the sheltered side.", "Lean little sticks on a bigger stick."),
      step("e2", "tinder", "Light the tinder under that roof of sticks so the flame climbs into them.", "Light underneath the sticks."),
      step("e3", "wind", "Point the open side away from the worst wind and rain. Add a rock or log reflector on the far side if you are heating a person.", "Keep the open side out of the wind."),
    ],
    options: [opt("onward", "If it struggles, troubleshoot", "Check the fire", "fire.troubleshoot", "question")],
  },
  {
    id: "fire.lay.dakota",
    type: "instruction",
    danger: "fire",
    pictogram: "dakota",
    text: "A Dakota hole burns below the surface. It resists wind, hides light, and feeds air through a second hole. It is a poor choice in peat or dry grass.",
    kid_text: "A fire in a hole stays out of the wind. A grown-up should dig it.",
    safety: [FIRE_SAFETY.restrictions],
    steps: [
      step("d1", "dakota", "Dig a fire pit about as wide as a boot and a hand deep. Dig a second hole upwind and connect them with a tunnel at the bottom.", "Two holes joined underneath."),
      step("d2", "oxygen", "The upwind hole is the air inlet. Do not block it with fuel.", "Leave the air hole open."),
      step("d3", "site", "Clear surface fuels back the full 3 meters. A hidden fire is still a fire.", "Clear the grass around both holes."),
    ],
    options: [opt("onward", "If it struggles, troubleshoot", "Check the fire", "fire.troubleshoot", "question")],
  },
  {
    id: "fire.lay.star",
    type: "instruction",
    danger: "fire",
    pictogram: "starfire",
    text: "A star fire burns the ends of several logs pointed at a small center. You push them in as they consume. It is how you spend a long night without feeding the fire every few minutes.",
    kid_text: "Lay big sticks like wheel spokes and push them in as they burn.",
    steps: [
      step("r1", "teepee", "Start with a small teepee in the center so you have a coal bed.", "Start with a small fire in the middle."),
      step("r2", "starfire", "Point four or five wrist-or-larger logs at the coals, ends almost touching.", "Point big sticks at the middle."),
      step("r3", "fuel", "Push the logs in a few centimeters when the ends turn to coal. Pull them apart if you need to leave the fire unattended.", "Push them in a little at a time."),
    ],
    options: [opt("onward", "If it struggles, troubleshoot", "Check the fire", "fire.troubleshoot", "question")],
  },
  {
    id: "fire.lay.platform",
    type: "instruction",
    danger: "fire",
    pictogram: "platform",
    text: "On snow or frozen ground the fire must sit on a platform, or it melts a hole and drowns. Use a green-log raft or dry rocks. Then light a teepee on top.",
    kid_text: "Do not light a fire on top of snow. Build a floor of green logs first.",
    safety: [FIRE_SAFETY.co, FIRE_SAFETY.rocks],
    steps: [
      step("pf1", "platform", "Lay two crosswise layers of green, wrist-thick logs wider than the fire will be. The raft chars slowly and keeps the coals out of the meltwater.", "Make a floor of green logs."),
      step("pf2", "rock", "If you use rocks, use dry ones only. Wet river rock can explode. A single layer of dry stone on the raft is enough of a hearth.", "Dry rocks only."),
      step("pf3", "teepee", "Build the teepee on the platform. Keep a vent open if any part of this fire is near a shelter, tent, or snow cave.", "Build the cone on the floor. Leave a hole for air."),
      step("pf4", "vent", "Never close the door of a snow shelter on a fire. If you cannot vent it, the fire stays outside.", "The fire stays outside if you cannot vent."),
    ],
    options: [opt("onward", "If it struggles, troubleshoot", "Check the fire", "fire.troubleshoot", "question")],
  },
  {
    id: "fire.troubleshoot",
    type: "question",
    pictogram: "question",
    text: "Read the fire. Smoke without flame, a flame that dies, and a fire that will not hold in the wet each have a fix. If it is burning on its own, bank it or plan how you will put it out.",
    kid_text: "Is the fire working?",
    steps: [],
    options: [
      opt("ok", "It is burning steadily", "It is burning", "fire.bank", "check"),
      opt("smoke", "Smoke but no flame", "Lots of smoke", "fire.fix.oxygen", "oxygen"),
      opt("dies", "Flame dies", "It goes out", "fire.fix.kindling", "kindling"),
      opt("wet", "Will not hold in the wet", "Too wet", "fire.fix.wet", "weather_wet"),
    ],
  },
  {
    id: "fire.fix.oxygen",
    type: "instruction",
    danger: "fire",
    pictogram: "oxygen",
    text: "Smoke without flame means the fire is starving for air or the fuel is too packed and too coarse.",
    kid_text: "It needs more air and finer fluff.",
    steps: [
      step("o1", "oxygen", "Lift the pile. Open a gap on the windward side. Do not blow a cloud of ash into your eyes. A steady breath at the base is enough.", "Open a gap so air gets in."),
      step("o2", "tinder", "Add finer tinder, not another log. Hair-fine curls, birch peel, or grass catch where finger wood only smokes.", "Add fluffier stuff, not a big log."),
    ],
    options: [
      opt("onward", "It has a flame now", "It is burning", "fire.bank", "check"),
      opt("retry", "Go back to materials", "Get more fluff", "fire.materials", "tinder", { retry: true }),
    ],
  },
  {
    id: "fire.fix.kindling",
    type: "instruction",
    danger: "fire",
    pictogram: "kindling",
    text: "A flame that starts and dies is almost always kindling that is too thick, too wet, or added in a smothering handful.",
    kid_text: "The sticks were too big. Use smaller ones.",
    steps: [
      step("k1", "kindling", "Snap the next pieces. They should be no thicker than a pencil until the flame is the size of two hands.", "Use sticks no thicker than a pencil."),
      step("k2", "tinder", "Rebuild a small teepee over what is left of the coal. One stick at a time.", "Add one little stick at a time."),
    ],
    options: [
      opt("onward", "It is holding", "It is burning", "fire.bank", "check"),
      opt("retry", "Try a different ignition", "Light it again", "fire.ignition", "fire", { retry: true }),
    ],
  },
  {
    id: "fire.fix.wet",
    type: "instruction",
    danger: "fire",
    pictogram: "weather_wet",
    text: "A fire that will not hold in the wet is burning the shell of the wood. Split to the dry core and get the flame off the wet ground.",
    kid_text: "The wood is wet on the outside. Split it and use the dry inside.",
    steps: [
      step("w1", "knife", "Split every fuel piece. The inside of standing dead wood lights when the outside will not.", "Split the sticks.", "blade"),
      step("w2", "platform", "Lift the lay onto a platform of green logs, bark slabs, or dry rocks so you are not boiling groundwater under the tinder.", "Get the fire off the wet ground."),
      step("w3", "fatwood", "If you are in pine country, switch the tinder to fatwood curls or birch sheets. They are built for this weather.", "Use pine curls or birch bark if you have them."),
    ],
    options: [
      opt("onward", "It is holding", "It is burning", "fire.bank", "check"),
      opt("retry", "Rebuild the lay", "Build it again", "fire.materials", "tinder", { retry: true }),
    ],
  },
  {
    id: "fire.bank",
    type: "instruction",
    danger: "fire",
    pictogram: "starfire",
    text: "Once the fire is burning on its own, decide whether you are keeping it through the night or putting it out. Banking saves fuel. Leaving it untended is how ground fires start.",
    kid_text: "Keep the fire small if you need it overnight, or put it all the way out.",
    safety: [FIRE_SAFETY.co],
    steps: [
      step("bk1", "fuel", "Let a bed of coals form. Rake them into a compact pile and lay larger fuel so only the ends burn, as in a star.", "Make a small pile of coals."),
      step("bk2", "rock", "A rock or log reflector on the far side throws heat at a sleeper. Do not ring the fire with river rock.", "A rock behind the fire throws heat at you."),
      step("bk3", "vent", "If you sleep near it, stay upwind of the smoke and keep a vent path. Do not take a fire to bed inside a closed shelter.", "Do not sleep with a fire in a closed shelter."),
      step("bk4", "warning", "Before you sleep hard, or any time you will leave, go to the extinguishing steps. Ash can look dead and still be hot.", "If you leave, put it all the way out."),
    ],
    options: [opt("onward", "Extinguish before you leave", "Put it out", "fire.out", "extinguish")],
  },
  {
    id: "fire.out",
    type: "terminal",
    danger: "fire",
    pictogram: "extinguish",
    text: "Put the fire out all the way. A buried coal is not out. Feel it.",
    kid_text: "Drown the fire, stir it, drown it again, and feel for heat. A grown-up should do the touch test.",
    safety: [FIRE_SAFETY.extinguish],
    steps: [
      step("x1", "water", "Drown the coals with water. If water is scarce, use mineral soil or sand, not duff and not peat.", "Pour water on it."),
      step("x2", "kindling", "Stir the ash and the coals with a stick so wet reaches the bottom of the pit.", "Stir the ashes."),
      step("x3", "water", "Drown it again. Listen for hissing. If it hisses, it is not out.", "Pour water on it again."),
      step("x4", "check", "Hold the back of your hand near the ash, then touch. It should be cool. If it is warm, drown and stir once more. Scatter nothing that is still warm.", "Touch-test. It must be cool."),
    ],
    options: [],
    sources: ["Leave No Trace campfire extinction steps."],
  },
];

/** Skill id, or an atomic reason prefixed with "!". Every actionable step is listed. */
const STEP_LINKS: Record<string, string> = {
  "fire.hypothermia.h1": "!Move the person before any tool work.",
  "fire.hypothermia.h2": "!Change wet clothes. No tool skill applies.",
  "fire.hypothermia.h3": "!Stay with them and be gentle.",
  "fire.hypothermia.h4": "keep_fire_going",
  "fire.fuel.nowood.n1": "!Use the dry plants that are already here.",
  "fire.fuel.nowood.n2": "!Snap dead stems. They burn or they do not.",
  "fire.fuel.nowood.n3": "!Search the ground before you spend a flame.",
  "fire.fuel.nowood.n4": "collect_tinder_kindling_fuel",
  "fire.site.s1": "pick_fire_site",
  "fire.site.s2": "pick_fire_site",
  "fire.site.s3": "pick_fire_site",
  "fire.site.s4": "build_platform_fire",
  "fire.site.s5": "fire_co_safety",
  "fire.materials.m1": "build_tinder_bundle",
  "fire.materials.m2": "collect_tinder_kindling_fuel",
  "fire.materials.m3": "collect_tinder_kindling_fuel",
  "fire.materials.m4": "process_fatwood",
  "fire.fuel.core.c1": "dry_wet_wood",
  "fire.fuel.core.c2": "baton_knife",
  "fire.fuel.core.c3": "make_feather_stick",
  "fire.ignition.i1": "build_tinder_bundle",
  "fire.ignition.i2": "!Pick the tool you have. The next screen teaches it.",
  "fire.method.lighter.l1": "use_lighter",
  "fire.method.lighter.l2": "use_lighter",
  "fire.method.lighter.l3": "collect_tinder_kindling_fuel",
  "fire.method.ferro.f1": "use_ferro_rod",
  "fire.method.ferro.f2": "use_ferro_rod",
  "fire.method.ferro.f3": "blow_ember_to_flame",
  "fire.method.matches.a1": "strike_match",
  "fire.method.matches.a2": "strike_match",
  "fire.method.matches.a3": "collect_tinder_kindling_fuel",
  "fire.method.sun.u1": "!Aim the bright dot. The next step teaches the coal.",
  "fire.method.sun.u2": "!Shape the bottle or the ice into a point.",
  "fire.method.sun.u3": "blow_ember_to_flame",
  "fire.method.battery.b1": "!Touch fine steel wool to both ends of the cell.",
  "fire.method.battery.b2": "!Heat the thin foil neck with the cell.",
  "fire.method.battery.b3": "!Keep the cell away from your face.",
  "fire.method.hand.hd1": "hand_drill",
  "fire.method.hand.hd2": "hand_drill",
  "fire.method.hand.hd3": "hand_drill",
  "fire.method.bow.bd1": "bow_drill",
  "fire.method.bow.bd2": "bow_drill",
  "fire.method.bow.bd3": "bow_drill",
  "fire.method.bow.bd4": "bow_drill",
  "fire.method.plough.p1": "!Rub the groove. The next step teaches the coal.",
  "fire.method.plough.p2": "blow_ember_to_flame",
  "fire.method.feather.fe1": "dry_wet_wood",
  "fire.method.feather.fe2": "make_feather_stick",
  "fire.method.feather.fe3": "make_feather_stick",
  "fire.lay.teepee.t1": "build_teepee_lay",
  "fire.lay.teepee.t2": "build_teepee_lay",
  "fire.lay.teepee.t3": "build_teepee_lay",
  "fire.lay.cabin.c1": "build_log_cabin_lay",
  "fire.lay.cabin.c2": "build_log_cabin_lay",
  "fire.lay.cabin.c3": "build_log_cabin_lay",
  "fire.lay.leanto.e1": "build_lean_to_lay",
  "fire.lay.leanto.e2": "build_lean_to_lay",
  "fire.lay.leanto.e3": "build_lean_to_lay",
  "fire.lay.dakota.d1": "!Dig two holes joined at the bottom.",
  "fire.lay.dakota.d2": "!Leave the air hole open.",
  "fire.lay.dakota.d3": "pick_fire_site",
  "fire.lay.star.r1": "build_teepee_lay",
  "fire.lay.star.r2": "!Point the big logs at the coals.",
  "fire.lay.star.r3": "keep_fire_going",
  "fire.lay.platform.pf1": "build_platform_fire",
  "fire.lay.platform.pf2": "build_platform_fire",
  "fire.lay.platform.pf3": "build_teepee_lay",
  "fire.lay.platform.pf4": "fire_co_safety",
  "fire.fix.oxygen.o1": "keep_fire_going",
  "fire.fix.oxygen.o2": "build_tinder_bundle",
  "fire.fix.kindling.k1": "collect_tinder_kindling_fuel",
  "fire.fix.kindling.k2": "build_teepee_lay",
  "fire.fix.wet.w1": "dry_wet_wood",
  "fire.fix.wet.w2": "build_platform_fire",
  "fire.fix.wet.w3": "find_fatwood",
  "fire.bank.bk1": "bank_fire_overnight",
  "fire.bank.bk2": "bank_fire_overnight",
  "fire.bank.bk3": "fire_co_safety",
  "fire.bank.bk4": "put_fire_out",
  "fire.out.x1": "put_fire_out",
  "fire.out.x2": "put_fire_out",
  "fire.out.x3": "put_fire_out",
  "fire.out.x4": "put_fire_out",
};

for (const node of nodes) {
  for (const item of node.steps) {
    const link = STEP_LINKS[`${node.id}.${item.id}`];
    if (!link) continue;
    if (link.startsWith("!")) {
      item.atomic = true;
      item.atomic_reason = link.slice(1);
    } else {
      item.skill = link;
    }
  }
}

export const fireTree: Tree = {
  id: "fire",
  title: "Fire",
  version: "1.0.0",
  section: "fire",
  entry_node: "fire.why",
  nodes,
};

export function fireNode(id: string): Node {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown fire node ${id}`);
  return node;
}
