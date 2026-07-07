# Exhibition Viewer

A React component library for creating immersive IIIF exhibition experiences. Built for the Delft University of Technology Heritage collections.

[![npm version](https://img.shields.io/npm/v/exhibition-viewer.svg)](https://www.npmjs.com/package/exhibition-viewer)
[![Preview](https://img.shields.io/badge/preview-live-blue)](https://preview.exhibitionviewer.org/)

## Installation

```sh
npm install exhibition-viewer
```

## Viewer Variations

The library provides four distinct viewer variations, each suited to different presentation needs:

| Variation             | Component           | Best For                                          |
| --------------------- | ------------------- | ------------------------------------------------- |
| **Delft Exhibition**  | `DelftExhibition`   | Grid-based layouts with scrollable content blocks |
| **Scroll Exhibition** | `ScrollExhibition`  | Immersive, full-screen scrolling experiences      |
| **Delft Slideshow**   | `DelftSlideshow`    | Carousel-based presentations                      |
| **Presentation Mode** | `DelftPresentation` | Full-screen presentation/kiosk displays           |

---

## React Component Usage

### Importing Styles

The library requires CSS to be imported. Choose one of the following approaches:

```jsx
// Option 1: Import the bundled CSS (recommended)
import "exhibition-viewer/dist/lib.css";

// Option 2: If using Tailwind, you can also import the base styles
import "exhibition-viewer/dist/index.css";
```

### DelftExhibition

A grid-based exhibition viewer with support for presentation mode dialog.

```jsx
import { DelftExhibition } from "exhibition-viewer";
import "exhibition-viewer/dist/lib.css";

function MyExhibition() {
  return (
    <DelftExhibition
      manifest="https://example.org/iiif/manifest.json"
      language="en"
      options={{
        cutCorners: true, // Enable cut-corner visual style
        fullTitleBar: true, // Use compact title bar
        hideTitle: false, // Show exhibition title
        hideTableOfContents: false, // Show table of contents navigation
        hideTitleCard: false, // Show title card
        disablePresentation: false, // Enable presentation mode button
        fullWidthGrid: false, // Force full-width grid items
        coverImages: false, // Use cover fit for images
        alternativeImageMode: true, // Alternative image rendering
        transitionScale: false, // Enable scale transitions
        imageInfoIcon: false, // Show image info icons
      }}
      content={{
        exhibition: "Exhibition",
        tableOfContents: "Table of Contents",
      }}
      viewObjectLinks={[]}
    />
  );
}
```

### ScrollExhibition

An immersive scrolling experience with sticky images and floating/split text overlays.

```jsx
import { ScrollExhibition } from "exhibition-viewer";
import "exhibition-viewer/dist/lib.css";

function MyScrollExhibition() {
  return (
    <ScrollExhibition
      manifest="https://example.org/iiif/manifest.json"
      language="en"
      showTableOfContents={true}
      options={{
        titleBlock: {
          fullHeight: true, // Title block takes full viewport height
        },
      }}
      viewObjectLinks={[]}
    />
  );
}
```

### DelftSlideshow

A carousel-based presentation with manual navigation controls.

```jsx
import { DelftSlideshow } from "exhibition-viewer";
import "exhibition-viewer/dist/lib.css";

function MySlideshowViewer() {
  return (
    <div style={{ height: "600px", width: "800px" }}>
      <DelftSlideshow
        manifest={manifestObject} // Requires pre-loaded manifest object
        language="en"
        options={{
          alternativeImageMode: true,
          transitionScale: false,
          imageInfoIcon: false,
          coverImages: false,
        }}
        viewObjectLinks={[]}
      />
    </div>
  );
}
```

### DelftPresentation

Full-screen presentation mode, typically launched from DelftExhibition but can be used standalone.

```jsx
import { DelftPresentation } from "exhibition-viewer";
import "exhibition-viewer/dist/lib.css";

function MyPresentation() {
  return (
    <div style={{ height: "100vh" }}>
      <DelftPresentation
        manifest="https://example.org/iiif/manifest.json"
        language="en"
        options={{
          cutCorners: true,
          autoPlay: true, // Auto-advance slides
          isFloating: false, // Enable floating text panels
          floatingPosition: "bottom-left", // Position: top-left, top-right, bottom-left, bottom-right
        }}
        viewObjectLinks={[]}
      />
    </div>
  );
}
```

### Loading a Manifest

All viewers accept either a manifest URL (string) or a pre-loaded manifest object:

```jsx
// Using a URL (manifest will be fetched automatically)
<DelftExhibition manifest="https://example.org/iiif/manifest.json" />;

// Using a pre-loaded manifest object
const manifest = await fetch("https://example.org/iiif/manifest.json").then(
  (r) => r.json(),
);
<DelftExhibition manifest={manifest} skipLoadManifest />;
```

---

## Embedding

The Exhibition Viewer can be embedded via iframe using the hosted preview at `https://preview.exhibitionviewer.org/`.

### Basic Embed

```html
<iframe
  src="https://preview.exhibitionviewer.org/?manifest=YOUR_MANIFEST_URL"
  width="100%"
  height="800"
  frameborder="0"
  allowfullscreen
></iframe>
```

### Embed URL Parameters

| Parameter           | Values                                                 | Description                                       |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `manifest`          | URL                                                    | **Required.** URL to the IIIF manifest            |
| `type`              | `presentation`, `scroll`, `slideshow`                  | Viewer variation (default: exhibition grid)       |
| `cut-corners`       | `true`, `false`                                        | Enable/disable cut-corner style (default: `true`) |
| `full-title-bar`    | `true`, `false`                                        | Use full title bar (default: `false`)             |
| `floating`          | `true`, `false`                                        | Enable floating text panels (presentation mode)   |
| `floating-position` | `top-left`, `top-right`, `bottom-left`, `bottom-right` | Floating panel position                           |

### Embed Examples

**Standard Exhibition Grid:**

```html
<iframe
  src="https://preview.exhibitionviewer.org/?manifest=https://example.org/manifest.json"
  width="100%"
  height="800"
></iframe>
```

**Scroll Exhibition:**

```html
<iframe
  src="https://preview.exhibitionviewer.org/?manifest=https://example.org/manifest.json&type=scroll"
  width="100%"
  height="100vh"
></iframe>
```

**Presentation Mode:**

```html
<iframe
  src="https://preview.exhibitionviewer.org/?manifest=https://example.org/manifest.json&type=presentation"
  width="100%"
  height="600"
></iframe>
```

**Presentation with Floating Panels:**

```html
<iframe
  src="https://preview.exhibitionviewer.org/?manifest=https://example.org/manifest.json&type=presentation&floating=true&floating-position=bottom-right"
  width="100%"
  height="600"
></iframe>
```

---

## Theming

The viewer supports CSS custom properties for theming. Override these variables in your CSS:

```css
:root {
  /* Base colors */
  --delft-bg-primary: rgb(229 231 235);
  --delft-bg-secondary: #fff;
  --delft-bg-overlay: rgba(0, 0, 0, 0.3);

  /* Text colors */
  --delft-text-primary: #fff;
  --delft-text-secondary: #000;
  --delft-image-caption: #fff;
  --delft-annotation-selected: rgb(250, 204, 21);

  /* UI elements */
  --delft-control-bar: #6d6e70;
  --delft-control-bar-border: #5a5b5d;
  --delft-control-hover: rgba(0, 0, 0, 0.1);
  --delft-progress-bar: #fff;

  /* Close button */
  --delft-close-background: #000;
  --delft-close-background-hover: #373737;
  --delft-close-text: #fff;

  /* Title elements */
  --delft-title-card: rgb(250 204 21);
  --delft-title-card-text: #000;

  /* Info blocks */
  --delft-info-block: #000;
  --delft-info-block-text: #fff;

  /* Viewer elements */
  --delft-viewer-background: #373737;
  --delft-title-transform: uppercase;
}
```

### Scroll Exhibition Theme Variables

```css
.exv-scroll {
  /* Title section */
  --exv-scroll-title-background: #fff;
  --exv-scroll-title-color: #444;

  /* Annotation overlays */
  --exv-scroll-annotation-background: #fff;
  --exv-scroll-annotation-color: #333;
  --exv-scroll-annotation-radius: 0px;
  --exv-scroll-annotation-max-width: 30em;

  /* Info blocks */
  --exv-scroll-info-block-background: #fff;
  --exv-scroll-info-block-color: #444;
}
```

### Manifest Theme Service

The viewers can also read theme data from a custom IIIF Manifest `service` block with profile `https://exhibitionviewer.org/iiif/theme-service`.

```json
{
  "id": "https://example.org/manifest#exhibition-viewer-theme",
  "type": "Service",
  "profile": "https://exhibitionviewer.org/iiif/theme-service",
  "label": { "en": ["Exhibition viewer theme"] },
  "theme": {
    "version": 1,
    "preset": "gallery"
  }
}
```

Built-in presets currently include `delft`, `gallery`, and `minimal`.

Each main viewer now accepts:

- `theme`: runtime theme overrides using the same shape as the manifest `theme` object
- `useManifestTheme`: defaults to `true`; set to `false` to ignore the manifest service
- `preferManifestStyle`: keeps runtime `options` as the final override layer, but lets manifest theme values override the `theme` prop

Default precedence is:

1. Viewer defaults
2. Manifest theme service
3. `theme` prop
4. Existing viewer `options` prop

---

## Canvas Behaviors

Control how canvases are displayed using IIIF `behavior` values. See [docs/CANVAS_BEHAVIORS.md](./docs/CANVAS_BEHAVIORS.md) for complete documentation.

### Quick Reference

```json
{
  "id": "https://example.org/canvas/1",
  "type": "Canvas",
  "behavior": ["h-8", "w-6", "left"],
  "label": { "en": ["My Canvas"] },
  "summary": { "en": ["Description text"] }
}
```

**Common behaviors:**

- `h-1` to `h-12` - Height/row span (Delft Exhibition)
- `w-1` to `w-12` - Width/column span (Delft Exhibition)
- `left`, `right`, `top`, `bottom` - Text panel position
- `floating`, `float-top-left`, etc. - Floating panel mode
- `backdrop-light`, `backdrop-dark` - Overlay appearance
- `cover`, `image-cover` - Image display mode
- `non-linear-tour` - Full-screen canvas with clickable annotation pins that zoom to each tour stop

---

## Advanced Usage

### Using the Library Export

For more granular control, import individual components from the library export:

```jsx
import {
  // Main viewers
  DelftExhibition,
  DelftPresentation,
  DelftSlideshow,
  ScrollExhibition,

  // Individual blocks
  ImageBlock,
  InfoBlock,
  MediaBlock,

  // Helpers
  getClassName,
  getFloatingFromBehaviours,
  getScrollLayoutConfig,
} from "exhibition-viewer/library";
```

### Tailwind Integration

If you're using Tailwind CSS, you can import the Tailwind configuration:

```js
// tailwind.config.js
import exhibitionTailwind from "exhibition-viewer/tailwind";

export default {
  // ... your config
  presets: [exhibitionTailwind],
};
```

---

## Live Preview

Explore the viewer variations with sample exhibitions at:

**[https://preview.exhibitionviewer.org/](https://preview.exhibitionviewer.org/)**

---

## License

MIT © [Digirati](https://digirati.com)
