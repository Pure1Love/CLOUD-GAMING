# APK Space

APK Space is a static, mobile-friendly library for keeping Android app package files organized in a browser. It accepts `.apk`, `.xapk`, `.apks`, and `.aab` files, saves them in the browser's IndexedDB, and lets you download them later. It requires no application server, account, API key, or paid hosting to publish as a static website.

## Use it

1. Open the site in the browser on your Android device.
2. Choose **Import APK** and select a package file. The browser asks for access through its normal file picker.
3. Select the saved app and choose **Download to install**. For a single APK, open the downloaded file from Downloads and follow Android's prompts. Android may require you to allow installs from that browser.

Enable GitHub Pages in the repository settings (Pages → deploy from `main` → `/ (root)`) to publish the static app. For local testing, serve the repository with a static web server; service workers and some browser features require HTTPS or localhost.

## Important limitations

- This is **not a virtual Android device, emulator, or cloud storage service**. A website cannot run an APK or install it directly. It only stores a local copy and downloads it for Android's package installer.
- Files are stored in this browser on this device using IndexedDB. They are not uploaded, backed up, or synchronized. Clearing site data or browser storage can delete them. Browser storage limits vary, and large APKs may not fit.
- A single `.apk` can be handed to Android's installer, but it may still be incompatible due to Android version, CPU architecture, required hardware, app restrictions, or Google services.
- `.xapk` and `.apks` are split-app bundles and may require a separate trusted installer that understands that format. `.aab` is a publishing bundle and is not directly installable as-is.
- Installing an APK does not make an app compatible with a device that cannot run it. Do not sideload files from sources you do not trust.

A true virtual Android environment that can run apps incompatible with the physical device requires an Android emulator/virtualization system or a hosted Android instance. That cannot be provided by a static GitHub Pages site alone.
