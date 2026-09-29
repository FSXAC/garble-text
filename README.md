# Garble Text

Garble Text turns every bit of text in Obsidian (notes, file explorer, sidebars,
menus, …) into unreadable scribbles and blurs images, so you can take
screenshots or share your screen without exposing sensitive data.

Use the command palette (`ctrl/cmd+p`) and run **Garble Text: Toggle**, or click
the eye icon in the ribbon (also available on mobile).

## Features

- **Scribble font built in.** The [Redacted Script](https://github.com/christiannaths/Redacted-Font)
  font ships with the plugin, so no extra CSS snippet or font install is needed.
- **Blur mode.** Blurs text instead of (or on top of) scribbling it, which also
  covers scripts the scribble font has no glyphs for, such as non-latin scripts.
- **Image blur.** Images and videos are blurred while garbling is on.
- **Reveal on hover.** Whatever the pointer is over is temporarily readable.
- Works on desktop, mobile and in pop-out windows.

## Settings

| Setting         | Description                                         |
| --------------- | --------------------------------------------------- |
| Garble style    | Scribble, blur, or both.                            |
| Blur images     | Blur images and videos while text is garbled.       |
| Reveal on hover | Temporarily un-garble whatever the pointer is over. |

## Development

The project follows the layout of the
[official Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

```bash
npm install
npm run dev    # build styles.css + watch main.js
npm run build  # type-check and produce a production build
npm run lint   # eslint with eslint-plugin-obsidianmd
```

`styles.css` is generated from the sources in `src/styles` (including the
base64-embedded font) by `build-styles.mjs`, so edit those files instead.

## Credits

Huge thanks to [**Matthias C. Hormann (aka Moonbase59)**](https://github.com/Moonbase59)
for the original CSS snippet this plugin builds on (scribble font, image blur and
ungarble on hover), and to [**Jeremy Valentine (aka Valentine195)**](https://github.com/valentine195)
for testing the plugin on iOS.

Bundled font: [Redacted Script](https://github.com/christiannaths/Redacted-Font)
by Christian Naths, licensed under the SIL Open Font License 1.1
(see `assets/Redacted-Font-OFL.txt`).

## Update log

- **2.0.0**: Rewritten for the current Obsidian API (no more undocumented
  `app.garbleText()`), esbuild-based build, settings tab, ribbon icon, and the
  scribble font is now built in.
- **2021-08-25**: Enabled on mobile; added blur on image when garbled, added
  ungarble on hover.
- **2021-08-13**: Changed from two commands `Garble` and `Ungarble`, to one
  `Toggle Garble`.
