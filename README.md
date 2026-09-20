# Mozart's Lost Masterpiece

#### Video Demo: https://youtu.be/AfD7yBr0LSI

#### Description:

In its original form, Mozart's Lost Masterpiece was my first ever programming project, and it served as my first CS50 submission: a video game made with Scratch.

For my final CS50 project I decided to go full-circle in every way possible: what you see here is that original game, ported to your favorite web browser thanks to Flask, JavaScript, HTML and CSS.

The game's premise is simple: Mozart has composed the ultimate masterpiece, but a gust of wind has scattered the pages and now he needs the help of another musical mastermind (you, the player) to put them back together in the correct order.

You'll have to listen to the fragments and decide which goes where. You may recognize the piece...

The game is simple and intuitive enough to not need any further instructions. As long as you have a mouse to click on things you'll figure it out.

The project has no accounts, database or saved progress. Flask serves the page and assets; all game state and interaction live in the browser.

The detailed account below explains the translation from Scratch blocks to JavaScript, the alternatives I considered, and the asset and timing problems encountered during development.

## Project files

| File or directory | Contents and purpose |
|---|---|
| `app.py` | Creates the Flask application and defines the `/` route, which renders `index.html`. No gameplay logic runs on the server. |
| `templates/index.html` | Defines the stage, title overlay and Start button, Mozart image, dialogue bubble, Yes/No controls, sheet display, four scrolls, and ending overlay. Jinja's `url_for` links the stylesheet, script and initial images. Each scroll's `data-position` connects it to the shuffled fragment array. |
| `static/game.js` | Implements the four game phases, shuffle, selections, duplicate checks, dialogue, confirmation prompts, audio playback, walking and violin animations, sequential scroll reveal, finale, retries and ending slideshow. It also starts image preloading and attaches the UI handlers. |
| `static/styles.css` | Defines the dark page surround, 960×705 stage, positioned sprites and overlays, speech bubble and tail, buttons and scroll row. Explicit `[hidden]` rules let the title and choice controls disappear despite their flex layouts. |
| `claude-help` | Records Claude's suggestion to use the `PHASE` constants object. It is a development note, not executable code. Its claim that undefined properties necessarily fail visibly is too strong; the discussion below clarifies this. |
| `README.md` | Describes the game, files, setup, design decisions and porting experience. |
| `static/img/mozart/` | Contains 18 final costumes: one standing pose, seven walking frames and ten violin frames. The animation arrays determine their playback order. |
| `static/img/sheets/` | Contains `a0.png`–`a3.png`, indexed by musical order rather than scroll position. |
| `static/img/thumbs/` | Contains the scroll image and four duplicate reveal images inherited from Scratch. The browser uses `score-sprite-no-bg.png` for all four scrolls. |
| `static/img/backdrops/` | Contains the title, concert stage and four ending images. |
| `static/audio/` | Contains the opening theme, ending sonata, four playable fragments (`astley0.mp3`–`astley3.mp3`), footsteps and page-turn effect. The full `astley.mp3` and original `rip.wav` are retained but unused by the game. |

The separately supplied `.sb3` is the original Scratch project. The ZIP also includes a local Python environment; those installed dependencies are not application code I wrote. The asset-extraction script discussed below is not included in the supplied project.

*Note: The table above was created by Claude*

## Running locally

From the extracted project directory, create a fresh Python environment, install Flask, and start the development server:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install Flask
flask --app app run
```

Open `http://127.0.0.1:5000` in a browser with audio enabled. On Windows, activate the environment with `.venv\Scripts\activate` instead. There is no JavaScript build step. The layout is designed for a desktop-sized window; it does not implement responsive scaling for small screens.

## Porting My First Program From Scratch to the Browser


As I mentioned, the program was originally built in Scratch and later ported to Flask + JavaScript. This is a detailed account of the porting process — what's actually inside a `.sb3` file, which parts of the original collapsed into a fraction of the code, which parts got harder, and the specific bugs that cost me the most time.

---

## Part 1: Reading the original

### A .sb3 is a ZIP

The first useful discovery: Scratch project files are ZIP archives. Unzip one and you get a `project.json` plus every asset, named by MD5 hash.

```bash
unzip -o Mozart_s_Lost_Masterpiece.sb3
```

```
0581fd6fca7fcce00af8aec37f2ca97d.mp3
37b9a617cda921c11a8b8f5653982d4a.png
52ad0b3a93e6e87a246ebfa7f10043cc.png
...
project.json
```

`project.json` holds everything else: sprites (called *targets*), their variables, their costume and sound lists, and every block of code as a flat dictionary keyed by opaque ID. Each block records its opcode, its input values, and a `next` pointer to the block below it. Scripts are linked lists; C-blocks like `if` and `repeat` hold their bodies in a `SUBSTACK` input.

Walking that structure gives you a readable dump of the whole program. Mine came to:

| Target | Blocks |
|---|---|
| Stage | 19 |
| mozart | 392 |
| a1 (the sheet display) | 65 |
| score sprite (the scrolls) | 32 |
| **Total** | **508** |

The costume and sound entries in `project.json` also carry their original human names alongside the hashed filenames, which is what makes asset extraction possible at all — otherwise you're staring at forty files called things like `9ce9ca7407df18b7dec4a4d9b6a6d6b5.png`.

### What the original actually did

Six global variables carried the entire game:

- `Choice Order` — a 0–3 counter
- `Sheet music ID` — which fragment is currently displayed
- `Music Order 1` … `Music Order 4` — the player's sequence

*Character sprites are AI-generated (Midjourney)*.

Flow: title backdrop, music, two-second wait, switch to the concert-hall backdrop. Mozart walks in on a footstep loop, delivers four lines, then hits a `repeat until answer = yes` gate around "Will you help me put the music in the right order?" Say no and he taunts you and asks again. There's no escaping that loop.

On yes, the score sprite spawns four clones, one second between each, with a paper-rip sound. Clicking one broadcasts `Sheetmusic1`–`4`.

In the Scratch version, each thumbnail maps to a music fragment, and the correspondence between them is hardcoded. Therefore, all playthroughs are essentially the same. This was fixed in the web app version, in which I added a good-enough randomizer.

In any case, in the Scratch version the correspondence goes like this:

| Thumbnail | Fragment |
|---|---|
| 1 | 4 |
| 2 | 2 |
| 3 | 1 |
| 4 | 3 |

The `a1` sprite displays the full sheet, sets `Sheet music ID`, then dispatches on `Choice Order` to one of four `Mozartorder` handlers. Each plays the fragment, asks whether it goes Nth, and on yes writes `Music Order N = Sheet music ID` and increments the counter. Each handler above the first guards against re-picking an already-used fragment — with a growing chain of comparisons:

```
Mozartorder2:  Sheet music ID = Music Order 1
Mozartorder3:  Sheet music ID = Music Order 1  OR  Sheet music ID = Music Order 2
Mozartorder4:  Sheet music ID = Music Order 1  OR  (... = Music Order 2  OR  ... = Music Order 3)
```

The fourth pick is assigned unconditionally, with no confirmation. Then Mozart switches to the violin costume, plays all four in stored order, and evaluates.

### The win condition

```
(Music Order 1 = 1) AND ((Music Order 2 = 2) AND (Music Order 3 = 3))
```

The last slot isn't evaluated: there's no undo in the game, and the duplicate guards mean a fragment can't be chosen twice. With three placed, only one remains — the fourth pick is forced by elimination, and Mozart assumes you picked it when you click on it, without asking for confirmation. Having the player manually confirm it would only slow things down for no good reason, and having the game logic check the fourth fragment seems unnecessary.

I kept that reasoning in the port. With zero-based fragment IDs, the final check tests the first three picks against 0, 1 and 2.

### What didn't hold up

I never used a list. Even though Scratch has them, I didn't know they existed.

Almost everything ugly in that project flows from that single omission. Four near-identical finale procedures differing only in which `Music Order` variable they read. A playback dispatcher nested four levels deep in `if` blocks where an array index would do. Those growing OR chains above. And one animation handler nested about eight `if` levels deep where a loop belongs.

Custom blocks in Scratch accept parameters, too — so even without lists, those four duplicated procedures could have been one. I didn't know that either.

## Part 2: Deciding the architecture

The target was a Flask app, but the interesting question was where the game state should live.

**Server-side** means the shuffle and the pick list live in a Flask session, and every thumbnail click becomes a fetch, a route, a JSON response and a re-render. For a click-driven game with dialogue timing, that's a round trip per interaction — more code, more async debugging, and nothing gained. There's no multiplayer, no score to protect, nothing an adversary would want.

**Client-side** means the whole game is a state machine in `game.js`. Flask serves the template and the static assets and otherwise stays out of the way. `app.py` ends up being eight lines:

```python
from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")
```

The honest tradeoff: the answer key ships to the browser and the game is trivially cheatable from the console. For a single-player puzzle with no stakes, that's fine.

### The asset pipeline

Before any game code, the assets had to come out of the `.sb3` with usable names. A Claude script parsing `project.json` mapped each costume and sound's `md5ext` back to its human `name`, slugified it, and copied everything into:

```
static/img/mozart/      19 costumes (standing, 8 walk frames, 10 violin frames)
static/img/sheets/       4 sheet images
static/img/thumbs/       5 thumbnail costumes
static/img/backdrops/    6 backdrops
static/audio/            9 sounds
```

These were the initial extracted assets; the final set has 18 Mozart costumes after dropping `walking001`, and 10 audio files after adding `rip.mp3`. The final fragment filenames use 0–3.

Then `optipng -o2` across the lot, which took 7.66MB down to 5.71MB losslessly with transparency intact. The sheet images compressed best — 72% — because line art on transparency is exactly what PNG is good at.

## Part 3: The port, piece by piece

### The state machine

Scratch handled game phase implicitly through broadcasts. Firing `Mozartorder2` *is* the state — the receiving script knows what it means. In JavaScript I made it a variable:

```js
const PHASE = {
  INTRO: "INTRO",
  SELECTING: "SELECTING",
  CONFIRMING: "CONFIRMING",
  FINALE: "FINALE"
};

const state = {
  phase: PHASE.INTRO,
  picks: [],      // fragment IDs chosen so far, in order
  shuffle: []     // thumbnail position -> fragment ID
};
```

Two things worth noting.

`PHASE` exists so that phase values are never bare strings in the code. A typo like `state.phase = "SELECTNG"` would fail silently — the game just stops responding. `PHASE.SELECTNG` evaluates to `undefined`, but does not automatically throw an error and can also leave the game unresponsive. The constants centralize the names and help editor completion; they do not enforce valid state values. It's the object-of-constants pattern that stands in for an enum in a language that doesn't have them.

`picks.length` replaced `Choice Order` entirely. Two variables that could drift out of sync became one thing that can't.

That single object is also the whole game in one `console.log`, which made debugging the state transitions enormously easier than chasing six separate Scratch variable monitors.

### The four handlers became one

Here's the collapse. All four `Mozartorder` handlers, the duplicate guards, the ordinal question and the win transition, in one function:

```js
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
  const confirmed = state.picks.length === 3
    ? true
    : await ask(`So you think this is the ${ordinal} fragment?`);

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
```

The three growing OR chains became `state.picks.includes(fragment)` — one expression, regardless of how many picks have been made.

The ternary on `picks.length === 3` restores the original's fourth-pick shortcut: with three placed, the last is forced, so asking would be theatre.

The phase guard on the first line prevents another valid selection while playback or a question is in progress. Scratch's waiting blocks suspend their own scripts, not all other scripts: the original scroll-click handler can still broadcast during another script's wait. In the port, an `await` likewise permits other event handlers to run, so I made the selection lock explicit. One remaining limitation is that the already-picked warning returns before setting `CONFIRMING`; rapid clicks during that warning can overlap dialogue, even though duplicate fragments are still rejected.

The guard has to be *inside* the click listener, not in the loop that attaches the listeners. I made that mistake first:

```js
// WRONG — runs once, at page load, when phase is still INTRO
document.querySelectorAll(".thumb").forEach(thumb => {
  if (state.phase !== PHASE.SELECTING) return;
  thumb.addEventListener("click", handleSelect);
});
```

That returns immediately for all four thumbnails and never attaches a single listener. The `forEach` body is *setup*; the listener body is *response*. Anything that depends on current state belongs in the second.

### The shuffle

The original's scramble was hardcoded — same every play. Randomising it per session makes the game replayable, which is a small but real improvement over the original.

The textbook answer is Fisher-Yates. I went with something simpler that I can explain in one sentence: draw names from a hat.

```js
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
```

Pick a random index from the pool, push that value, remove it from the pool. Four iterations, pool empties, every value appears exactly once because it's gone after being drawn.

Then one deliberate rejection:

```js
state.shuffle = shuffled();
while (state.shuffle.join() === "0,1,2,3") {
  state.shuffle = shuffled();
}
```

With four fragments there are 24 permutations, so the already-solved order comes up once in 24 loads. A player who happens to click left to right and wins instantly hasn't played the game. This isn't a correctness fix — every permutation is equally valid — it's a UX judgement about one outcome that reads as broken.

The `.join()` is necessary because `[0,1,2,3] === [0,1,2,3]` is `false` in JavaScript. Array comparison compares references, not contents.

### Blocking, and the absence of it

This is the conceptual heart of the port.

Scratch's `say for 2 seconds` stops the script. `play sound until done` stops the script. That's how Mozart's four opening lines appear one after another instead of all at once.

JavaScript has no equivalent. Write four lines setting `dialogue.textContent` and all four execute in under a millisecond. You see the last one.

The replacement is Promises plus `async`/`await`:

```js
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function say(text, seconds) {
  dialogue.textContent = text;
  await sleep(seconds * 1000);
  dialogue.textContent = "";
}
```

Which makes the intro read almost exactly like the Scratch blocks it replaced:

```js
await say("Damn!", 1.5);
await say("The pages of my newest masterpiece... they're all scattered!", 3);
await say("Despite being the GOAT of composers...", 2);
await say("I'm gonna need you to help me put them back together...", 3);
```

The important distinction: `await` suspends the *containing function*, not the program. Clicks still register, animations still run, the page stays responsive. Scratch's waiting blocks pause one script; `await` suspends the current async function until its Promise settles.

The implementation uses the same Promise pattern for **four kinds of asynchronous completion**, with image-loading events as a possible extension:

**A timer** — `sleep`, above.

**A button click:**

```js
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
```

Note `onclick =` rather than `addEventListener`. Assignment *replaces* the previous handler, so calling `ask` repeatedly doesn't stack listeners. Using `addEventListener` repeatedly without removing old handlers would accumulate callbacks. Previously settled Promises would not resolve a second time, but their callbacks would still run.

That turns the original's `repeat until answer = yes` into:

```js
let helping = false;
while (!helping) {
  helping = await ask("Will you help me put the music in the right order?");
  if (!helping) {
    await say("Come on! I'm the greatest composer who ever lived.", 2);
    await say("You can't deny the one and only WA...", 2);
  }
}
```

**An audio `ended` event:**

```js
function playFragment(fragment) {
  return new Promise(resolve => {
    player.src = `/static/audio/astley${fragment}.mp3`;
    player.onended = resolve;
    player.play();
  });
}
```

`player.play()` returns a Promise, but it resolves when playback *starts*, not when it ends — so awaiting that won't sequence anything. The `ended` event is what you want.

**A position condition** — the walk-in, below.

**Image `load` events (possible extension)** — the current preloader starts requests without waiting for them; it does not wrap these events.

Four implemented event sources, one pattern. That repetition is the single clearest illustration of what changes when you leave an environment that blocks for you.

### Animation

Scratch's walk cycle was a `repeat until` containing a sequence of `if` blocks, each switching to the next costume, waiting 0.07s, and doing `change x by 9`. Frame advance and movement in one loop.

`setInterval` does both jobs in one timer:

```js
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
```

The `% WALK_FRAMES.length` wrap replaces the entire chain of costume-switching `if` blocks. The position check replaces `repeat until`.

`mozart.style.left = ""` at the end is worth explaining. Writing to `style.left` creates an *inline* style, which overrides the stylesheet permanently. Setting it to an empty string deletes the override, so his resting position goes back to being CSS's business:

```css
#mozart {
  position: absolute;
  height: 230px;
  left: 170px;    /* walkIn's stopping condition must match this */
  bottom: 0px;
}
```

That's one number coupling two files, which is the ugliest thing in the codebase. It needs a comment on both sides.

The violin animation is the same shape, but it runs on *every* fragment playback, not just the finale. Which produced a subtle bug once the finale played four fragments back to back:

```js
async function playWithViolin(fragment) {
  let frame = 0;
  const timer = setInterval(() => { /* cycle violin frames */ }, 100);
  await playFragment(fragment);
  clearInterval(timer);
  mozart.src = "/static/img/mozart/mozart.png";   // ← the problem
}
```

Called four times in a row, Mozart snaps back to the standing pose between every fragment. The fix is to split the responsibility — one function that animates across a *sequence* rather than setup-play-teardown per item:

```js
async function playSequenceWithViolin(fragments) {
  let frame = 0;
  const timer = setInterval(() => { /* cycle violin frames */ }, 100);

  for (const fragment of fragments) {
    await playFragment(fragment);
  }

  clearInterval(timer);
  mozart.src = "/static/img/mozart/mozart.png";
}
```

One timer for the whole sequence, cleared once at the end. The two functions duplicate a few lines; at this size that's clearer than the abstraction would be.

### Layout: from stage to canvas

Scratch gives you a fixed 480×360 stage with a coordinate system. The browser gives you document flow, which is the wrong model for a game.

The fix is to declare a fixed canvas and position everything absolutely inside it:

```css
#stage {
  position: relative;       /* reference frame for absolute children */
  width: 960px;
  height: 705px;            /* matches the backdrop's native dimensions */
  background-image: url("/static/img/backdrops/stage2.png");
  overflow: hidden;         /* clips Mozart while he's still offstage left */
}
```

`position: relative` on the container is what makes `absolute` children position against *it* rather than the page. `overflow: hidden` is what lets Mozart start at `left: -150px` without the page growing a horizontal scrollbar.

The speech bubble is pure CSS — a rounded box plus a triangular tail made with the zero-dimension border trick:

```css
#dialogue::after {
  content: "";
  position: absolute;
  bottom: -18px;
  left: 1rem;
  border-width: 18px 12px 0 0;
  border-style: solid;
  border-color: #f4f0e4 transparent transparent transparent;
}
```

An element with zero width and height but thick borders renders as four triangles meeting at a point, because adjacent borders meet on a diagonal. Make three transparent and one triangle survives. `content: ""` is mandatory — a pseudo-element without a `content` property doesn't render at all.

And hiding the bubble when nobody's speaking:

```css
#dialogue:empty { display: none; }
```

`:empty` matches an element with no child nodes, which is why `say()` clears `textContent` when it finishes.

## Part 4: The bugs

### Identifiers fail quietly

Twice I typed `WALK-FRAMES` instead of `WALK_FRAMES`. A hyphen isn't valid in a JavaScript identifier, so the parser reads it as subtraction — `WALK` minus `FRAMES`. Both undefined, so you get a `ReferenceError`, but only when that line actually executes.

Worth internalising the asymmetry: punctuation typos fail loudly at parse time. Identifier typos fail quietly at run time. A stray `)` breaks the file immediately; a wrong variable name waits until you trigger the code path.

### The sprite that kept flinching

Mozart flashed larger once per walk cycle. My first diagnosis was image loading — frames being fetched mid-animation. I added a preloader. No difference whatsoever.

The real cause was geometry. The CSS set a fixed `height` and let width follow the natural aspect ratio — and the frames didn't share one:

| File | Canvas |
|---|---|
| `walking001.png` | 188×320 |
| `walking004`–`022` | 500×500 |
| `mozart.png` | 169×413 |

Three aspect ratios in one element, so the element's computed width changed on every `src` swap, and the browser reflowed.

Scratch provides costume rotation centres and sprite sizing. My original also explicitly changes sprite size between standing, walking and violin costumes; the browser port instead normalizes the image canvases. On the web, the element and the image are separate things with separate opinions about size.

Normalising the canvases with ImageMagick fixed most of it:

```bash
magick mozart.png -trim +repage -resize x324 \
       -background none -gravity center -extent 500x500 mozart.png
```

Trimmed figure heights before this were 413 (standing), 322 (walk), 326 (violin) — a 28% difference. Resizing the standing pose to 324 brought all three into line.

`+repage` is the non-obvious flag. After `-trim`, ImageMagick records the original offset as canvas metadata rather than discarding it, and `-extent` then applies that stale offset when building the new canvas. Without `+repage` the offsets compound across operations. Mine went `+668`, then `+3277+654` — content flung entirely off the canvas — partly because of that and partly because I kept retrying against the previous *failed result* instead of the original file.

Two lessons, both learned the slow way: `+repage` after `-trim`, and back up before in-place edits so every retry starts from a known state.

### The frame that was never there at all

`walking001` still looked wrong after normalising, and no amount of repositioning helped. Eventually I checked what was actually inside it:

```bash
magick walking001.png -trim info:
# 39x156
```

The other frames' figures are roughly 200px wide. This one contained a 39-pixel sliver — the file was damaged during export. I'd spent twenty minutes trying to reposition content that didn't exist.

I dropped it from the array. The final animation uses seven frames, advancing every 70 milliseconds, throughout a walk lasting about two seconds.

The general lesson: check what an asset *contains* before trying to fix how it's positioned.

### A hop between costume types

Once the canvases matched, a vertical hop appeared at the moment the walk ended and the standing pose swapped in. Same root cause one level down — matching canvas size doesn't mean matching content *placement* within that canvas:

```bash
for f in walking0*.png; do
  echo -n "$f: "; magick "$f" -trim info: | awk '{print $4}'
done
```

Walk frames sat at vertical offset ~138; standing and violin at ~88. Fifty pixels in a 500px canvas, about 23px at display size.

Re-centring the walk frames brought everything to 86–90. The few pixels of remaining variance is real animation — arms swinging, legs at different angles — and flattening that would be flattening the movement.

### The sound that fetched but never played

The page-turn effect refused to play. Flask returned HTTP 206. `mpv` played the file fine. The browser console said nothing.

I chased a volume setting for a while — completely the wrong theory, but pushing on it rather than shrugging is what surfaced the answer. Eventually I asked the browser directly instead of inferring:

```js
const r = new Audio("/static/audio/rip.wav");
r.play().catch(e => console.log("blocked:", e));
// blocked: NotSupportedError: Failed to load because no supported source was found.
```

`.wav` is a container, not a codec. Scratch had exported something `mpv` decodes happily and Chrome refuses to touch — this particular WAV uses IMA ADPCM rather than the PCM encoding used by the working footsteps file. One `ffmpeg` conversion to MP3 and it worked.

The 206 had convinced me the fetch side was fine, which it was. I simply hadn't asked about the decode side. A file arriving successfully and a file being *playable* are separate claims.

### The browser that won't let you make a sound

Mozart's footsteps were silent:

```
NotAllowedError: play() failed because the user didn't interact with the document first.
```

Browsers block audio until the user has interacted with the page. Every other sound in the game followed a click — a button, a scroll — but the walk-in fires on load with no prior interaction.

The fix is a title screen with a Start button. The click both begins the game and unlocks audio for the rest of the session:

```js
document.getElementById("start").onclick = async () => {
  document.getElementById("start").hidden = true;

  const theme = new Audio("/static/audio/40.mp3");
  theme.play();

  await sleep(2000);
  document.getElementById("title").hidden = true;

  await intro();
};
```

Which is exactly what the Scratch version did with the clickable green flag.

### `hidden` is weaker than it looks

The Yes/No buttons were visible from page load despite `<div id="choices" hidden>`.

The `hidden` attribute works by applying `display: none` from the browser's *default* stylesheet. My rule set `display: flex` to lay the buttons out in a row, and an ID selector beats the default sheet. The attribute lost.

```css
#choices[hidden] {
  display: none;
}
```

More specific than `#choices` alone, so it wins when the attribute is present. This bites constantly with flex and grid layouts, because those are precisely the cases where you need an explicit `display`.

### Assets arrive lazily

Even after the geometry was fixed, the first run of each animation stuttered — the browser fetching each frame at the moment it was first requested. Scratch loads every costume into memory when the project starts; the browser does not.

```js
function preload(names) {
  for (const name of names) {
    const img = new Image();
    img.src = `/static/img/mozart/${name}.png`;
  }
}

preload(WALK_FRAMES);
preload(VIOLIN_FRAMES);
```

`new Image()` creates an element that never enters the DOM. Assigning `src` triggers the fetch, the browser caches the result, the object is discarded. Later `mozart.src = ...` assignments can reuse cached images, reducing first-use delays; this does not guarantee that loading and decoding have completed.

It's fire-and-forget, so a cold load can still race it. For a production concern you'd wait on the `load` events — another application of the same Promise-wrapping pattern.

### The mapping that was silently wrong

Late on, with the shuffle logging a clean `[0,1,2,3]`, the fragments still came out in the wrong musical order.

The cause wasn't in the code at all. In the original, the costume names (`a1`–`a4`) followed the *visual* order the sprites appeared in, while `Sheet music ID` carried the *musical* identity — and those were deliberately different. My extraction script had faithfully preserved the costume names and thereby destroyed the mapping.

Fixing it meant identifying each fragment by ear and renaming the files so that `a{n}.png` and `astley{n}.mp3` refer to the same piece of music. The final mapping, verified against the supplied Scratch assets, is:

| Browser ID | Original sheet costume | Original sound |
|---|---|---|
| 0 | `a3` | `astley1` |
| 1 | `a2` | `astley2` |
| 2 | `a4` | `astley3` |
| 3 | `a1` | `astley4` |

The manifest still describes the earlier extraction names rather than this final mapping.

Worth dwelling on, because this would have silently invalidated the win check. The code would have been correct and the game would have been wrong. Verify your data before building logic on top of it.

## Other differences and current limitations

The browser replaces Scratch's typed answers with Yes/No buttons. During the final performance, Scratch's playback procedures also broadcast sheet changes; the port hides the sheet and plays the chosen sequence with continuous violin animation. The original even uses sound volume (90 versus 100) as a signal controlling violin animation; the port uses timer lifetime instead.

Audio completion currently depends on the `ended` event, with no rejection or media-error recovery. If playback fails, the pending selection can remain locked. The Start click provides the intended user gesture for audio, but it is not a universal guarantee that every browser will allow every later playback. These are limitations of the supplied implementation, rather than features already solved by the port.

## What the numbers look like

(*This section was entirely generated by Claude*)

| | Scratch | JavaScript |
|---|---|---|
| Four `Mozartorder` handlers | ~160 blocks | 1 function |
| Four finale procedures | ~120 blocks | 3-line `for` loop |
| Duplicate check | 3 growing OR chains | `picks.includes(fragment)` |
| Win condition | 3 chained comparisons | 3 chained comparisons |
| Walk animation | 8 `if` blocks + outer loop | 1 `setInterval` |
| Total | 508 blocks | 278 lines in the supplied `game.js`, including comments and blank lines |

(*End of AI-generated section)*

## The part I didn't expect

I assumed the rebuild would be a demonstration of how much better the code is now. It is better — one function where there were four, one loop where there were eight nested conditionals, one expression where there were three chained comparisons.

But none of the *ideas* are new.

Separating a fragment's musical identity from its screen position: original. The accumulating duplicate guard: original. The elimination-based win condition: original.

What actually changed from my first week of CS50 to the last isn't that I approach the problem in a completely different manner (not most of the time, at least), but rather that I am aware of standardized solutions for the same logical problems, I know more of the lingo, and I have a wider array of tools to carry out my programming goals.

All in all, CS50 has been a fantastic experience. I thoroughly enjoyed every lecture. It's been my stepping stone into the tech world as something more than a hobbyist, and it definitely contributed to my recent career switch from classical music to Linux system administration.

---

*The port is a Flask app serving one page; the game runs entirely in the browser. Roughly fifteen hours of work.*
