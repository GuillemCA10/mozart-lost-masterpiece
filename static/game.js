console.log("game.js loaded");

const PHASE = { // PHASE constant pattern suggested by Claude (as opposed to writing the string literals every time)
  INTRO: "INTRO",
  SELECTING: "SELECTING",
  CONFIRMING: "CONFIRMING",
  FINALE: "FINALE"
};

const state = {
  phase: PHASE.INTRO,
  picks: [],        // fragment IDs chosen so far, in order
  currentFragment: null,
  shuffle: []         // thumbnail position -> fragment ID
};

function shuffled() {
  const pool = [1, 2, 3, 4];
  const result = [];
  while (pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    result.push(pool[i]);
    pool.splice(i, 1);
  }
  return result;
}

state.shuffle = shuffled();
