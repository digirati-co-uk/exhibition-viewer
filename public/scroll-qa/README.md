# Scroll preset QA fixtures

With the local Exhibition Viewer running on port 5174, paste either manifest URL into **Open manifest URL** in the Manifest Editor. Choose **Scrolling Story** or **Leeds Exhibition Scroll** from **Choose preview** to try a different template.

| Manifest | Local viewer | Coverage |
| --- | --- | --- |
| [Kitchen sink](http://localhost:5174/scroll-qa/kitchen-sink.json) | [Leeds scroll](http://localhost:5174/preview/leeds/scroll?manifest=/scroll-qa/kitchen-sink.json) · [Delft scroll](http://localhost:5174/preview/delft/scroll?manifest=/scroll-qa/kitchen-sink.json) | Fixed opening cover, floating and split editorial, composed images, Image Choice, long text, two-page scroll tour, manual tour, compact deck, pin tour, paged image details, audio with artwork, MP4, and a YouTube embed. |
| [Navigation and import edge cases](http://localhost:5174/scroll-qa/navigation-edge-cases.json) | [Open scroll](http://localhost:5174/preview/leeds/scroll?manifest=/scroll-qa/navigation-edge-cases.json) | Coverless manifest, empty canvas, empty tour page, conflicting layout hints, and a reordered table of contents. Saved viewer settings hide the cover, progress bar, and side controls and place the contents in the footer. |

Both fixtures use local media already provided under `/slideshow-qa/`. The YouTube test substitutes the iframe response so it can run independently of network access or viewer consent.

Tours frame each stop beside its caption by default. Compare it with [clearance switched off](http://localhost:5174/preview/leeds/scroll?manifest=/scroll-qa/kitchen-sink.json&tour-caption-clearance=false#s6) to see the camera centred under the captions. The tour has a right caption followed by a left caption. Clearance takes effect at viewer widths of 768 pixels and up, and the gap to the caption comes from `--exv-scroll-caption-gap`.

Run the scroll browser tests from the Manifest Editor checkout with the two dev servers running and the editor resolving the current workspace packages.

```sh
EXHIBITION_VIEWER_URL=http://localhost:5174 E2E_TARGET=watch pnpm --filter playwright exec playwright test 10-scroll --reporter=list
```
