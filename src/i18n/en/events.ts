/** English text for the 10 offline (fallback) daily events, keyed by `key` and option `id`. */
export interface EventTextEn {
  title: string;
  ariaVoiceAlert: string;
  description: string;
  nasaFact: string;
  nasaSource?: string;
  options: Record<string, { label: string; description: string; ariaReactionVoice: string }>;
}

export const EVENTS_EN: Record<string, EventTextEn> = {
  cme_arrival: {
    title: 'The solar storm front is here!',
    ariaVoiceAlert: 'Attention, crew! The particle cloud from the Sun has just reached Mars. The radiation detectors are beeping.',
    description: 'The Coronal Mass Ejection detected by NASA DONKI has reached the base. A shower of fast protons is hitting the space base. You have to decide how to protect the crew today.',
    nasaFact: 'A Coronal Mass Ejection (CME) is a giant cloud of gas from the Sun that can travel at more than 1,000 km per second. NASA DONKI records every one to warn missions.',
    options: {
      a: { label: 'Cover the bunks with the Lead Blanket', description: 'Dragging the heavy blanket is tiring and makes you breathe harder.', ariaReactionVoice: 'Blanket in place! The radiation bounces off the lead. Good job.' },
      b: { label: 'Divert power to the space base shield', description: 'The shield goes way up, but the battery suffers.', ariaReactionVoice: 'Power diverted to the shield. The batteries have dropped quite a lot.' },
      c: { label: 'Shelter in the core with the supplies', description: 'You squeeze into the most protected area using the boxes as a wall.', ariaReactionVoice: 'Makeshift shelter ready. A bit cramped, but it works.' },
    },
  },
  water_leak: {
    title: 'Leak in the water filter',
    ariaVoiceAlert: 'I detect a drop floating near the water filter. We have a small leak.',
    description: 'The storm vibrations have loosened a seal in the water system. If you do not fix it, you will lose water, and with it, oxygen.',
    nasaFact: 'On the ISS, oxygen is made by splitting water into hydrogen and oxygen with electricity (electrolysis). That is why every drop of water matters so much!',
    options: {
      a: { label: 'Seal the joint with Kapton Tape', description: 'A quick, cheap repair.', ariaReactionVoice: 'Leak sealed! Kapton tape can handle cold, heat and radiation.' },
      b: { label: 'Full repair with a soldering iron', description: 'It ends up perfect, but uses a lot of power.', ariaReactionVoice: 'Soldering done. The iron used a lot of battery.' },
      c: { label: 'Close that pipe and hold on', description: 'You use no power, but you lose the water in that circuit.', ariaReactionVoice: 'Pipe closed. We are losing some water and oxygen.' },
    },
  },
  bacteria: {
    title: 'Rebel bacteria in the lab',
    ariaVoiceAlert: 'My biological sensors detect bacteria growing faster than normal.',
    description: 'In space some bacteria get stronger. A lab sample has escaped its dish and the crew is starting to feel a bit weak.',
    nasaFact: 'On the Space Shuttle Atlantis (mission STS-115) scientists found that Salmonella bacteria got stronger in microgravity. The data is in NASA GeneLab / OSDR.',
    options: {
      a: { label: 'Use the Biological Med Kit', description: 'You use up the med kit, but the crew recovers completely.', ariaReactionVoice: 'Treatment applied. The crew is smiling again.' },
      b: { label: 'Sterilize with ultraviolet light', description: 'The UV lamps clean everything, but they use power.', ariaReactionVoice: "Lab sterilized. The bacteria don't stand a chance." },
      c: { label: 'Isolate the lab', description: 'You close the door and vent it: you lose air and some health.', ariaReactionVoice: 'Lab isolated. We will need some patience.' },
    },
  },
  stressed_plants: {
    title: 'The plants are stressed',
    ariaVoiceAlert: 'The greenhouse leaves are wilting because of the radiation.',
    description: 'The storm radiation stresses the plants. If you take care of them, they will grow faster; if not, you will have to dig into the reserves.',
    nasaFact: 'NASA GeneLab experiments with the Arabidopsis plant show that in space plants switch on stress genes, just like when they are hot or thirsty on Earth.',
    options: {
      a: { label: 'Extra UV light for the OSDR Seeds', description: 'The plants grow at full speed, but the lamp uses a lot.', ariaReactionVoice: 'The red lettuces are glowing with happiness! Food secured.' },
      b: { label: 'Open Rations A', description: 'Tasty, safe food, but it is gone forever.', ariaReactionVoice: "Rations open. Today's menu is special!" },
      c: { label: 'Ration the food', description: 'You eat less to save food. The crew gets tired.', ariaReactionVoice: 'Rations reduced. Remember to drink water and rest.' },
    },
  },
  cold_night: {
    title: 'Freezing Martian night',
    ariaVoiceAlert: 'The outside temperature is dropping to eighty degrees below zero. The heating is working flat out.',
    description: 'Without sunlight, the Martian night is very cold. The space base heating eats up power at full speed.',
    nasaFact: 'The Curiosity rover has measured nights as cold as −80 °C in Gale Crater. Colder than the coldest place in Antarctica on a normal day!',
    nasaSource: 'NASA Curiosity – REMS weather station',
    options: {
      a: { label: 'Connect the Backup Battery', description: 'The battery keeps you warm, but the shield has to come down for a while.', ariaReactionVoice: 'Battery connected. Nice and warm with power to spare.' },
      b: { label: 'Turn down the heating and use blankets', description: 'You save power, but you get cold.', ariaReactionVoice: 'Heating on minimum. Wrap up warm!' },
      c: { label: 'Heating on maximum', description: 'Everyone is comfortable, but the battery suffers.', ariaReactionVoice: 'Heating on maximum. It feels great, but the battery is dropping.' },
    },
  },
  earth_window: {
    title: 'Communication window with Earth',
    ariaVoiceAlert: 'Earth is well aligned. We have a window to send science data.',
    description: 'NASA scientists want the storm radiation measurements. Sending them costs power, but science helps future missions!',
    nasaFact: 'Signals from Mars take between 3 and 22 minutes to reach Earth, depending on where the two planets are. You cannot have a live conversation!',
    options: {
      a: { label: 'Transmit with the Deep Space Antenna', description: 'Loads of science for very little power.', ariaReactionVoice: 'Data sent. Back on Earth they are going to love these measurements!' },
      b: { label: 'Send a short message by emergency radio', description: 'Little science and a lot of power.', ariaReactionVoice: 'Short message sent. Better than nothing.' },
      c: { label: 'Save power and do not transmit', description: 'The crew is left wanting to talk to home.', ariaReactionVoice: 'Understood, radio silence. They miss you on Earth.' },
    },
  },
  second_flare: {
    title: 'Second solar flare!',
    ariaVoiceAlert: 'Alert. NASA DONKI reports another powerful flare. More particles are coming.',
    description: 'The same active region of the Sun has exploded again. The space base shield needs reinforcing again.',
    nasaFact: 'Flares are classified as A, B, C, M and X. Each letter is 10 times more powerful than the one before: an X is 10 times stronger than an M.',
    nasaSource: 'NASA DONKI / NOAA – Flare classification',
    options: {
      a: { label: 'Run the Magnetic Shield Coil at full power', description: 'A magnetic field deflects the particles, but it uses a lot of power.', ariaReactionVoice: 'Magnetic field at maximum! The particles are deflected just like on Earth.' },
      b: { label: 'Reposition the Lead Blanket', description: 'More protection by moving the heavy blanket.', ariaReactionVoice: 'Blanket repositioned. Good thinking.' },
      c: { label: 'Hold on and do nothing', description: 'You spend nothing, but the radiation does damage.', ariaReactionVoice: 'Holding on. The radiation has left its mark on the shield.' },
    },
  },
  co2_rise: {
    title: 'The air is filling with CO2',
    ariaVoiceAlert: 'The carbon dioxide level is rising. If you feel a headache, that is why.',
    description: 'With everyone shut in for so many days, the space base air has more and more CO2. It has to be cleaned.',
    nasaFact: 'On Apollo 13 the astronauts had to fit square CO2 filters into round holes using tape, cardboard and bags. Engineering saved the mission!',
    nasaSource: 'NASA – Apollo 13 Mission',
    options: {
      a: { label: 'Change the CO2 Cartridges', description: 'Clean air for very little power.', ariaReactionVoice: 'New cartridges. What lovely fresh air!' },
      b: { label: 'Open the Oxygen Tanks', description: 'A big burst of oxygen, but they are used up forever.', ariaReactionVoice: 'Tanks open. Take a deep breath, crew.' },
      c: { label: 'Sleep more to breathe less', description: 'Sleeping uses less air, but no work gets done.', ariaReactionVoice: 'Nap mode on. Sweet Martian dreams.' },
    },
  },
  bone_loss: {
    title: 'Tired bones and muscles',
    ariaVoiceAlert: "The medical check shows the crew's muscles are getting weaker.",
    description: 'So many days shut in with little gravity make bones and muscles weaker. Time to move!',
    nasaFact: 'In space astronauts can lose between 1 and 1.5% of their bone mass each month. That is why on the ISS they exercise about 2 hours a day.',
    options: {
      a: { label: 'Use the Biological Med Kit', description: 'Vitamins and medicine from the kit. It gets used up.', ariaReactionVoice: 'Vitamins taken. Bones as strong as titanium!' },
      b: { label: 'Intense workout session', description: 'You get fit, but you eat and breathe more.', ariaReactionVoice: 'One, two, one, two! Great workout.' },
      c: { label: 'Rest and save power', description: 'You save, but the body keeps getting weaker.', ariaReactionVoice: 'Rest logged. Tomorrow we have to move.' },
    },
  },
  storm_ends: {
    title: 'The storm is moving away',
    ariaVoiceAlert: 'Good news. The radiation is dropping. Time to get the base ready to go outside.',
    description: 'The solar particles are calming down. Before opening the hatches, you have to choose which systems to get ready.',
    nasaFact: "The Curiosity rover's RAD instrument has measured radiation on the surface of Mars since 2012. Its data helps design shelters for future astronauts.",
    options: {
      a: { label: 'Recharge the air with the ECLSS Recycler', description: 'Plenty of air to go outside, but it uses power.', ariaReactionVoice: 'Air recharged. Ready for the next adventure!' },
      b: { label: 'Repair the panels with Kapton Tape', description: 'You get power back, but going outside is tiring.', ariaReactionVoice: 'Panels repaired. The power is going up again.' },
      c: { label: 'Measure the radiation for NASA', description: 'Very useful science, but it uses power.', ariaReactionVoice: 'Measurements saved. The scientists will be proud!' },
    },
  },
};

export const LOADING_MESSAGES_EN = [
  'Receiving telemetry from NASA DONKI and orbital satellites...',
  'Syncing with the Mars Reconnaissance Orbiter...',
  'Reading the space base radiation sensors...',
  'Checking the Deep Space Network...',
];
