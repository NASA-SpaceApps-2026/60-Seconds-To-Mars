import type { ItemId, StationItem } from '../../types/game';

type ItemText = Partial<Pick<StationItem, 'name' | 'shortName' | 'description' | 'nasaFact' | 'nasaSource'>>;

/** English text for the 30 space-base items. */
export const ITEMS_EN: Record<ItemId, ItemText> = {
  // =================== OXYGEN ===================
  co2_scrubbers: {
    name: 'Lithium Hydroxide Cartridges (CO2)',
    shortName: 'CO2 Filters',
    description: 'Keeps the air clean: +10 Oxygen every Sol with very little power use.',
    nasaFact: 'Lithium hydroxide traps the CO2 we breathe out. These cartridges were used on the Apollo spacecraft and are still the backup plan in spacesuits.',
    nasaSource: 'NASA – Apollo / EMU life support systems',
  },
  o2_tanks: {
    name: 'Pressurized Oxygen Tanks',
    shortName: 'O2 Tanks',
    description: 'Pure emergency: +30 Oxygen when opened.',
    nasaFact: 'The Space Station keeps backup oxygen in high-pressure tanks that arrive on cargo ships, in case the main generator fails.',
  },
  oxygen_candle: {
    name: 'Chemical Oxygen Candle',
    shortName: 'O2 Candle',
    description: 'Once lit, it releases oxygen for hours: +20 Oxygen when used.',
    nasaFact: '"Oxygen candles" are chemical cylinders that release oxygen when heated. The ISS carries them as an emergency backup.',
  },
  algae_bioreactor: {
    name: 'Green Algae Bioreactor',
    shortName: 'Bioreactor',
    description: 'Algae doing photosynthesis inside tubes: +12 Oxygen every Sol.',
    nasaFact: 'Algae and cyanobacteria turn CO2 into oxygen using light. NASA studies them as "living factories" of air for faraway bases.',
    nasaSource: 'NASA Ames – Biological life support',
  },
  hydro_recycler: {
    name: 'Water & O2 Recycler (ECLSS)',
    shortName: 'ECLSS Recycler',
    description: 'Makes +15 Oxygen every Sol while switched on, but uses a lot of power.',
    nasaFact: "In 2023 the International Space Station's ECLSS system recycled 98% of its water, including the astronauts' sweat and urine!",
    nasaSource: 'NASA ECLSS – International Space Station',
  },
  moxie_unit: {
    name: 'MOXIE 2.0 Oxygen Factory',
    shortName: 'MOXIE 2.0',
    description: 'Pulls oxygen out of the Martian air: +20 Oxygen every Sol.',
    nasaFact: "The Perseverance rover's MOXIE experiment made oxygen from Mars's CO2: 122 grams, enough for a dog to breathe for 10 hours!",
  },

  // =================== POWER ===================
  fuel_cell: {
    name: 'Hydrogen Fuel Cell',
    shortName: 'Fuel Cell',
    description: 'Mixes hydrogen and oxygen to make electricity: +30 Power when used.',
    nasaFact: 'The Apollo spacecraft used fuel cells that, besides electricity, made the water the astronauts drank.',
    nasaSource: 'NASA – Apollo Program',
  },
  solar_panel_roll: {
    name: 'Roll-Out Solar Array (ROSA)',
    shortName: 'Roll-Out Panel',
    description: 'Unrolls like a carpet: +10 Power every Sol.',
    nasaFact: 'ROSA panels unroll by themselves like a tape measure. Since 2021 the ISS has new panels of this kind (iROSA).',
  },
  lithium_battery: {
    name: 'Solid-State Backup Battery',
    shortName: 'Backup Battery',
    description: 'Critical reserve: gives +15 Power every Sol through nights and storms.',
    nasaFact: 'The Perseverance rover uses a nuclear generator (MMRTG) that charges lithium-ion batteries: that gives it extra power for its busiest moments.',
  },
  mini_rtg: {
    name: 'Mini RTG Nuclear Battery',
    shortName: 'Mini RTG',
    description: 'A super-powerful energy source: +25 Power every Sol, day and night.',
    nasaFact: 'RTG generators turn heat from plutonium into electricity. Thanks to them, the Voyager probes have been sending data since 1977.',
  },
  kilopower_reactor: {
    name: 'Kilopower Surface Reactor',
    shortName: 'Kilopower Reactor',
    description: 'A mini reactor for Moon and Mars bases: +30 Power every Sol.',
    nasaFact: 'In 2018 NASA successfully tested the Kilopower reactor (the KRUSTY experiment), designed to power bases on the Moon and Mars.',
  },

  // =================== FOOD ===================
  freeze_food_a: {
    name: 'Freeze-Dried Ration Box A',
    shortName: 'Rations A',
    description: 'Safe food: +25 Food when opened. It does not regrow.',
    nasaFact: 'Freeze-dried food loses almost all its water, so it weighs little. For Mars, NASA is researching food that lasts up to 5 years without spoiling.',
  },
  freeze_food_b: {
    name: 'Freeze-Dried Ration Box B',
    shortName: 'Rations B',
    description: 'Extra food reserve: +25 Food when opened.',
    nasaFact: 'In space your sense of taste fades a little because fluids move up to the head. That is why astronauts love hot sauce!',
  },
  space_tortilla_pack: {
    name: 'Space Tortilla Pack',
    shortName: 'Tortillas',
    description: 'No floating crumbs: +20 Food when opened.',
    nasaFact: 'Astronauts have used tortillas instead of bread since the 1980s: they do not drop crumbs that could float into the equipment.',
  },
  led_hydro_lamp: {
    name: 'Hydro-Boost LED Lamp',
    shortName: 'LED Lamp',
    description: 'Fast-growing sprouts under LED light: +6 Food every Sol while switched on.',
    nasaFact: 'The Veggie greenhouse on the ISS uses red, blue and green LEDs. Plants grow mostly with red and blue light, which is why it looks pink!',
  },
  mushroom_farm: {
    name: 'Martian Mushroom Farm',
    shortName: 'Mushroom Farm',
    description: 'Mushrooms grow in the dark: +9 Food every Sol while switched on.',
    nasaFact: 'Fungi are so useful that NASA is studying how to "grow" houses with them on Mars: it is called mycotecture.',
  },
  osdr_seeds: {
    name: 'OSDR Space Seeds (Red Lettuce)',
    shortName: 'OSDR Seeds',
    description: 'With their UV light on, they give a +20 Food harvest every 2 Sols.',
    nasaFact: 'In 2015 ISS astronauts ate the first red lettuce grown in space (the Veggie experiment). Its data is in the NASA Open Science Data Repository.',
  },

  // =================== SHIELDING ===================
  space_duct_tape: {
    name: 'Repair Kit & Kapton Tape',
    shortName: 'Kapton Tape',
    description: 'Takes up very little space and unlocks cheap repairs when something breaks.',
    nasaFact: 'On Apollo 13 the astronauts saved the mission by joining square and round CO2 filters with duct tape, cardboard and a plastic bag.',
  },
  tool_printer_3d: {
    name: '3D Tool Printer',
    shortName: '3D Printer',
    description: 'Prints parts to patch cracks in the shielding: +5 Shield every Sol while switched on.',
    nasaFact: 'In 2014 the first part was 3D printed in space, aboard the ISS. Making spare parts there avoids waiting months for a cargo ship.',
  },
  mars_drone: {
    name: 'Storm Watch Drone',
    shortName: 'Watch Drone',
    description: 'Watches the sky and takes photos: +15 Science and +2 Shield every Sol while switched on.',
    nasaFact: 'The Ingenuity helicopter was the first aircraft to fly on another planet (2021). It was planned for 5 flights and made 72!',
  },
  water_wall: {
    name: 'Water Bag Wall',
    shortName: 'Water Wall',
    description: 'Water slows down solar particles: radiation does 4 less damage every Sol.',
    nasaFact: 'On the Orion spacecraft, during a solar storm, astronauts shelter by surrounding themselves with the cargo and water bags they carry on board.',
  },
  eva_suit: {
    name: 'Pressurized EVA Suit',
    shortName: 'EVA Suit',
    description: 'Extra personal protection: radiation does 3 less damage to the shield every Sol.',
    nasaFact: 'A spacesuit is like a tiny spacecraft: it has oxygen, temperature control and layers that stop micrometeorites.',
  },
  lead_blanket: {
    name: 'Anti-Radiation Lead Blanket',
    shortName: 'Lead Blanket',
    description: 'Halves radiation damage to the shield every Sol, without using any battery.',
    nasaFact: 'Against cosmic rays, hydrogen-rich materials (water, polyethylene) protect even better than lead. That is why NASA engineers study walls full of water!',
  },
  mag_shield_booster: {
    name: 'Magnetic Shield Coil',
    shortName: 'Magnetic Shield',
    description: 'Raises the Shield by +20 every Sol while switched on, but drains the battery very fast.',
    nasaFact: 'Earth has a natural magnetic shield. Mars lost its own about 4 billion years ago, and the MAVEN mission studies how the solar wind stripped away its atmosphere.',
  },

  // =================== HEALTH ===================
  med_kit: {
    name: 'Space Biological Medical Kit',
    shortName: 'Med Kit',
    description: 'Based on astronaut dosimetry: restores +25 crew Health.',
    nasaFact: 'Astronauts wear dosimeters, small devices that measure how much radiation they get each day, so NASA doctors can look after their health.',
  },
  vitamin_pack: {
    name: 'Vitamin D Pill Box',
    shortName: 'Vitamin D',
    description: 'Without sunlight the body needs it: +20 Health when used.',
    nasaFact: 'Our skin makes vitamin D from sunlight. Since astronauts get almost none on the ISS, they take supplements to look after their bones.',
  },
  magnetic_board_game: {
    name: 'Magnetic Board Game (Morale)',
    shortName: 'Magnetic Game',
    description: 'Playing together lifts spirits: +3 Health every Sol. The pieces are magnets so they do not float away!',
    nasaFact: 'NASA studies the mental health of crews on isolation missions like CHAPEA, which simulates a year living on Mars. Having fun as a team is part of the training.',
  },
  exercise_bike: {
    name: 'Space Exercise Bike',
    shortName: 'Space Bike',
    description: 'Pedaling keeps muscles and bones strong: +5 Health every Sol while switched on.',
    nasaFact: 'On the ISS astronauts exercise about 2 hours a day on a bike, a treadmill and weight machines so they do not lose muscle or bone.',
  },
  high_gain_antenna: {
    name: 'High-Gain Antenna (Deep Space)',
    shortName: 'Deep Space Antenna',
    description: 'Sends data to Earth and lets you talk to home: +25 Science and +2 Health every Sol.',
    nasaFact: "A radio message takes between 3 and 22 minutes to travel from Mars to Earth. The giant antennas of NASA's Deep Space Network listen for it.",
  },
  robo_dog: {
    name: 'Floating Companion Robot',
    shortName: 'Robo-Buddy',
    description: 'Helps with chores and tells jokes: +5 Health and +5 Science every Sol.',
    nasaFact: "NASA's Astrobee robots float around the ISS helping astronauts with inventories and experiments.",
  },
};
