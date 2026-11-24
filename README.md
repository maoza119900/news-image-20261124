# news-image-20261124

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/maoza119900/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/maoza119900/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

A Node 22 program (standard library only) that draws a 1024×1024 newspaper
front page for Tuesday 24 November 2026 and writes it to
`$MAKEFUN_OUTPUT_DIR/entry.png`.

Lead: Nvidia unanimously reinstates Jensen Huang as chief executive, with a
hand-drawn chip and rising share-price chart. Plus the Russian war death toll
put near 700,000 from leaked data, Ukraine sinking a Russian warship in Libya,
the COP31 talks ending with no deal, US sanctions on Iran as Gulf tensions
rise, the first Gen Z woman elected to the US Congress, and briefs on the
Indonesia factory fire, Norway's voided oil licences, the 2031 Women's World
Cup hosts and the aid call for flooded Gaza. Every fact is sourced; items
that were only reported are attributed in the text.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Two consecutive runs produce byte-identical output (same SHA-256). No network,
no external images, no `Date.now`, no `Math.random`. The image is drawn in
code with an embedded 5×7 bitmap font and a hand-rolled PNG encoder.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tg8sjp12&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>
