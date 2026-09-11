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

const sheet = document.getElementById("sheet");
const dialogue = document.getElementById("dialogue");
const player = new Audio();

function shuffled() {
  const pool = [0, 1, 2, 3];
  const result = [];
  while (pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    result.push(pool[i]);
    pool.splice(i, 1);
  }
  return result;
}

state.shuffle = shuffled();
while (state.shuffle.join() === "0,1,2,3") {
  state.shuffle = shuffled();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function say(text, seconds) {
  dialogue.textContent = text;
  await sleep(seconds * 1000);
}

async function intro() {
  await say("Damn!", 1.5);
  await say("The pages of my newest masterpiece... they're all scattered!", 3);
  await say("I'm gonna need you to help me put them back together...", 3);
}

document.querySelectorAll(".thumb").forEach(thumb => {
  thumb.addEventListener("click", () => {
    const position = Number(thumb.dataset.position);
    const fragment = state.shuffle[position];
    sheet.src = `/static/img/sheets/a${fragment}.png`;
    sheet.hidden = false;
    player.src = `/static/audio/astley${fragment}.mp3`;
    player.play();
  });
});

intro();
