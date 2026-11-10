AFCSC SENIOR COURSE 48 – PSYCHOLOGY FLASHCARD APP

CONTENTS
- index.html, styles.css, app.js: the flashcard web app
- data/flashcards.json: the 300-card dataset
- manifest.webmanifest and sw.js: installable/offline PWA support

FEATURES
- 300 question-and-answer cards across 12 modules
- Module selector
- Reveal answer / show question
- Previous and Next navigation
- Shuffle
- Mark cards as Known or Need to Review
- Progress saved locally in the browser
- Offline use after first successful load

RUN LOCALLY
Browsers generally restrict fetch() from file:// URLs. Serve this folder through a local web server,
or publish it with GitHub Pages / another static web host.

GITHUB PAGES
1. Extract this ZIP.
2. Upload the CONTENTS of this folder to the root of your GitHub repository.
3. Enable GitHub Pages from Settings > Pages, using the main branch and root folder.
4. Open the published URL on your phone.
5. Android: use browser menu > Install app / Add to Home screen.
   iPhone: open in Safari > Share > Add to Home Screen.

IMPORTANT
- Progress is stored on the device/browser using local storage. It is not synced across devices.
- This is a Progressive Web App (PWA), not a compiled Android APK.
- The dataset is included as JSON and can be reused in a native app.
