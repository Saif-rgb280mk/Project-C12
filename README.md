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

`prompttomotion/`: a text-to-animation generator. Type a description, pick a style (2D Vector, 3D Render, Anime, Pixel Art, Frame-by-Frame), set duration, aspect ratio (16:9, 9:16, 1:1) and FPS, then play, scrub, loop and download as MP4, GIF or Lottie. Past creations are kept in a history gallery so you can reopen and edit them.

- Open `prompttomotion/index.html` in a browser. **Mock (offline)** mode builds a scene from keywords in your prompt, so the whole app works without any AI. Published as an artifact on claude.ai it can also use **Claude AI** to write a new scene for each prompt.
- Tech stack, prompt handling and mock testing are explained in [`prompttomotion/docs/ARCHITECTURE.md`](prompttomotion/docs/ARCHITECTURE.md).
- `python3 prompttomotion/build.py` bundles everything into one HTML file.

`stair-tumble/index.html` is a 3D animation of a character falling down three flights of stairs and getting back up.
