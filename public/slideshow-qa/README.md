# Slideshow QA fixtures

With the exhibition viewer running on port 5174, paste either URL into **Open manifest URL** in the Manifest Editor.

| Manifest | Local preview | Coverage |
| --- | --- | --- |
| [kitchen-sink.json](http://localhost:5174/slideshow-qa/kitchen-sink.json) | [Open slideshow](http://localhost:5174/preview/leeds/slideshow?manifest=/slideshow-qa/kitchen-sink.json) | 14 slides covering an opening cover, timed stills, four editorial placements, floating text, multiple images, Image Choice, long-form text, linear and pin tours, audio, MP4, and a YouTube embed. |
| [import-edge-cases.json](http://localhost:5174/slideshow-qa/import-edge-cases.json) | [Open slideshow](http://localhost:5174/preview/leeds/slideshow?manifest=/slideshow-qa/import-edge-cases.json) | Five slides covering an empty canvas, a canvas without layout behavior, title-only text, a saved custom text region and background, and a tour across two annotation pages. The table of contents uses a partial, reordered range. |

The images, two-second audio tone, and two-second video clip are generated and served locally. The manifests use absolute localhost URLs for their IIIF identifiers and local media. The browser tests stub the YouTube iframe response.

Run the cross-app browser tests from the Manifest Editor checkout with both dev servers already running.

```sh
EXHIBITION_VIEWER_URL=http://localhost:5174 E2E_TARGET=watch pnpm --filter playwright exec playwright test 09-slideshow --reporter=list
```
