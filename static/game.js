console.log("game.js loaded");

const PHASE = { // PHASE constant pattern suggested by Claude (as opposed to writing the string literals every time)
  INTRO: "INTRO",
  SELECTING: "SELECTING",
  CONFIRMING: "CONFIRMING",
  FINALE: "FINALE"
};

const ORDINALS = ["first", "second", "third", "fourth"];

const state = {
  phase: PHASE.INTRO,
  picks: [],        // fragment IDs chosen so far, in order
  shuffle: []         // thumbnail position -> fragment ID
};

const WALK_FRAMES = [
  "walking004", "walking007", "walking010",
  "walking013", "walking016", "walking019", "walking022"
];

const VIOLIN_FRAMES = [
  "violin01", "violin04", "violin07", "violin10", "violin13",
  "violin16", "violin19", "violin22", "violin25", "violin28"
];

const mozart = document.getElementById("mozart");
const sheet = document.getElementById("sheet");
const dialogue = document.getElementById("dialogue");
const choices = document.getElementById("choices");
const player = new Audio();

function preload(names) {
  for (const name of names) {
    const img = new Image();
    img.src = `/static/img/mozart/${name}.png`;
  }
}

preload(WALK_FRAMES);
preload(VIOLIN_FRAMES);

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

function playFragment(fragment) {
  return new Promise(resolve => {
    player.src = `/static/audio/astley${fragment}.mp3`;
    player.onended = resolve;
    player.play();
  });
}

async function say(text, seconds) {
  dialogue.textContent = text;
  await sleep(seconds * 1000);
  dialogue.textContent = "";
}

function ask(question) {
  dialogue.textContent = question;
  choices.hidden = false;
  return new Promise(resolve => {
    document.getElementById("yes").onclick = () => {
      choices.hidden = true;
      resolve(true);
    };
    document.getElementById("no").onclick = () => {
      choices.hidden = true;
      resolve(false);
    };
  });
}

async function intro() {
  await sleep(2000);
  await walkIn();
  await sleep(1500);
  await say("Damn!", 1.5);
  await say("The pages of my newest masterpiece... they're all scattered!", 3);
  await say("Despite being the GOAT of composers...", 2);
  await say("I'm gonna need you to help me put them back together...", 3);

  let helping = false;
  while (!helping) {
    helping = await ask("Will you help me put the music in the right order?");
    if (!helping) {
      await say("Come on! I'm the greatest composer who ever lived.", 2);
      await say("You can't deny the one and only WA...", 2);
    }
  }

  await say("Cool! Let's get to it.", 2);
  await revealThumbs();
  await say("Pick one of the fragments and I'll play it for you.", 3);
  state.phase = PHASE.SELECTING;
}

async function handleSelect(event) {
  if (state.phase !== PHASE.SELECTING) return;

  const position = Number(event.currentTarget.dataset.position);
  const fragment = state.shuffle[position];

  if (state.picks.includes(fragment)) {
    await say("But you already picked that one!", 2);
    return;
  }

  state.phase = PHASE.CONFIRMING;
  sheet.src = `/static/img/sheets/a${fragment}.png`;
  sheet.hidden = false;
  await playWithViolin(fragment);

  const ordinal = ORDINALS[state.picks.length];
  const confirmed = await ask(`Do you think this fragment goes ${ordinal}?`);

  if (confirmed) {
    state.picks.push(fragment);
    if (state.picks.length === 4) {
      state.phase = PHASE.FINALE;
      await finale();
      return;
    }
    await say("Ok, let's find the next one, then.", 2);
  } else {
    await say("Ok, let's check another fragment.", 2);
  }

  state.phase = PHASE.SELECTING;
}

document.querySelectorAll(".thumb").forEach(thumb => {
  thumb.addEventListener("click", handleSelect);
});

function walkIn() {
  return new Promise(resolve => {
    let frame = 0;
    let x = -150;

    mozart.style.left = `${x}px`;
    mozart.hidden = false;

    const steps = new Audio("/static/audio/footsteps.wav");
    steps.loop = true;
    steps.play();

    const timer = setInterval(() => {
      mozart.src = `/static/img/mozart/${WALK_FRAMES[frame]}.png`;
      frame = (frame + 1) % WALK_FRAMES.length;

      x += 12;
      mozart.style.left = `${x}px`;

      if (x >= 170) {
        clearInterval(timer);
        steps.pause();
        mozart.src = "/static/img/mozart/mozart.png";
        mozart.style.left = "";
        resolve();
      }
    }, 70);
  });
}

async function revealThumbs() {
  const rip = new Audio("/static/audio/rip.wav");
  for (const thumb of document.querySelectorAll(".thumb")) {
    thumb.hidden = false;
    rip.currentTime = 0;
    rip.play();
    await sleep(1000);
  }
}

async function playWithViolin(fragment) {
  let frame = 0;
  const timer = setInterval(()=> {
    mozart.src = `/static/img/mozart/${VIOLIN_FRAMES[frame]}.png`;
    frame = (frame + 1) % VIOLIN_FRAMES.length;
  }, 100);

  await playFragment(fragment);

  clearInterval(timer);
  mozart.src = "/static/img/mozart/mozart.png";
}

async function finale() {
  sheet.hidden = true;
  await say("So you think this is the last fragment, eh?", 2);
  await say("Well, let's see how it all sounds together!", 2);

  for (const fragment of state.picks) {
    await playWithViolin(fragment);
  }

  // The fourth pick is forced by elimination: with three fragments already placed,
  // only one remains.
  const correct = state.picks[0] === 0 &&
    state.picks[1] === 1 &&
    state.picks[2] === 2;

  if (correct) {
    await say("Yes!! I think this might be it!!", 2);
    await say("I've really done it...", 2);
    await say("This piece is definitely ahead of its time!!", 2);
    await say("The world of music will never be the same...", 2);
    await say("And it's all thanks to you!!", 3);
  } else {
    await say("What? This can't be it, bro...", 2);
    await say("Let's try again.", 2);
    state.picks = [];
    state.phase = PHASE.SELECTING;
  }
}

document.getElementById("start").onclick = async () => {
  document.getElementById("start").hidden = true;

  const theme = new Audio("/static/audio/40.mp3");
  theme.play();

  await sleep(2000);
  document.getElementById("title").hidden = true;

  await intro();
};
