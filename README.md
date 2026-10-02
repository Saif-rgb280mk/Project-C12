# MarketMind

A stock market game in the browser. You get $10,000 and 60 trading days to beat three AI traders:

- **Nana Prudence**: careful, keeps half in cash, buys dips and takes small profits.
- **Moonshot Max**: bets everything on the hottest stock and chases the news.
- **Quant-9**: splits money evenly and rebalances every 5 days.

Prices move by random daily changes plus news events. At the end you get a report explaining why the winner won and what your own trades show.

## Run it

Open `index.html` in any browser. No install needed.

Keys: `B` buy, `S` sell, `Space` pause, `↑`/`↓` switch stock.

---

# Frameshift

`frameshift/index.html`: describe any animation in words ("a dragon flying over mountains breathing fire"), pick a style, and Claude writes the animation code and plays it on the page. You can then ask for changes ("make it night time"), view or copy the code, and save it as its own HTML file.

Generating new animations uses Claude, so it works when the page is opened as an artifact on claude.ai. Opened as a plain file, the four built-in example animations still play.

---

# PromptToMotion

`prompttomotion/`: a text-to-animation generator with a fully animated interface. Type a description, pick a style (2D Vector, 3D Render, Anime, Pixel Art, Frame-by-Frame), set duration, aspect ratio (16:9, 9:16, 1:1) and FPS (up to 60), then direct it like a film: **camera moves** (push, pull, pan, orbit, crane, handheld), **lighting looks** (natural sunlight, cinematic, neon glow, golden hour, moonlit, studio), **motion blur**, **scene detail** and **fluid character physics**. Play, scrub, loop and download as MP4, GIF or Lottie. Past creations are kept in a history gallery so you can reopen and edit them.

Scenes include a physics-driven runner, a dragon with a simulated tail and fire breath, a castle with cloth flags, swaying pine forests and a UFO. Drag any preview to steer the camera, and turn on **Sound** for a procedural soundscape synced to the action (footsteps, thunder, wingbeats).

The interface is kept clean: the studio shows only the essentials and folds camera, lighting, blur, detail and the rest into one **Advanced** section.

The site itself is animated: a particle entrance with a logo reveal, an interactive particle-mesh hero whose preview generates live as example prompts type, typing example prompts, glowing buttons, animated gradient borders and a loading orb that opens into your finished animation.

- Open `prompttomotion/index.html` in a browser. **Mock (offline)** mode builds a scene from keywords in your prompt, so the whole app works without any AI. Published as an artifact on claude.ai it can also use **Claude AI** to write a new scene for each prompt.
- Tech stack, prompt handling, the detail engine and mock testing: [`prompttomotion/docs/ARCHITECTURE.md`](prompttomotion/docs/ARCHITECTURE.md).
- The animated UI, loading states and prompt-to-preview transition (with a React and Framer Motion version): [`prompttomotion/docs/ANIMATED_UI.md`](prompttomotion/docs/ANIMATED_UI.md).
- `python3 prompttomotion/build.py` bundles everything into one HTML file.

`stair-tumble/index.html` is a 3D animation of a character falling down three flights of stairs and getting back up.
