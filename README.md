# Game Space

A no-cost, static browser game library starter. It runs on GitHub Pages and lets you import HTML browser games, keep them in this browser's IndexedDB, search your library, and launch the HTML games in a sandboxed player. ZIP archives with an HTML entry file can be imported; the ZIP is currently treated as a single HTML entry, so games that rely on separate asset files may not run.

## Run the project

Open `index.html` from a local web server, or enable GitHub Pages for this repository. No server, account, API key, build step, or paid hosting is needed for the static app. For local testing, use a static server such as `python -m http.server` and visit `http://localhost:8000`.

## Import and play

- Select an `.html`/`.htm` browser game, or a `.zip` that contains an HTML entry point.
- Imported game data is saved in IndexedDB in the current browser on the current device.
- Use **Play** to open HTML files in a sandboxed iframe.
- Search and remove games from the library.

The ZIP reader is loaded from a CDN, so ZIP import requires an internet connection. Standalone HTML imports work without that library. Browser security restrictions mean some imported games may not work if they require local files, network access, popups, or permissions excluded by the sandbox.

## Important limits

This version is **not remote cloud storage**: imports do not upload, sync, or back up to a server. GitHub Pages can host the app files, but cannot host user uploads or run arbitrary PC games. The app can only play games built for browsers. Windows `.exe`, console games, and other native game files cannot be made playable by importing them into a website; running those requires a compatible game system. This project does not claim otherwise.

Browser storage can be cleared by the user or browser, so keep your own backup of game files. Only import games you have the right to use.

## GitHub Pages

In the repository settings, open **Pages**, select deployment from the `main` branch and `/ (root)`, and save. GitHub will publish the static app at the Pages URL shown in settings.
