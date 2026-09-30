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
