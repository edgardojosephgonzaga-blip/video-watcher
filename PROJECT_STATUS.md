# Project Status

## Repository

GitHub repo:

```text
https://github.com/edgardojosephgonzaga-blip/video-watcher
```

Current local checkout:

```text
C:\Users\Edgardo Joseph DG\Downloads\video-watcher
```

## Deployment Decision

Use Railway for the app deployment.

Reason: this project has a Flask + Socket.IO backend in `app.py`. Firebase Hosting alone cannot run the Python backend.

Firebase should be used for:

- Firebase Auth
- Realtime Database
- Firestore/rules if needed later

Railway should be used for:

- Running `app.py`
- Serving the app over a public URL
- Handling Socket.IO/backend runtime

## Railway Setup

Railway deployment files are present:

- `Procfile`
- `railway.json`
- `requirements.txt`

Start command:

```bash
gunicorn --worker-class eventlet -w 1 app:app
```

`app.py` reads Railway's `PORT` environment variable.

Deploy from Railway dashboard:

1. Create a new Railway project.
2. Choose "Deploy from GitHub repo".
3. Select `edgardojosephgonzaga-blip/video-watcher`.
4. Deploy branch `main`.
5. Generate a public domain under Railway service settings.

## Firebase Project

Firebase project:

```text
collaborative-video-viewer
```

Realtime Database instance:

```text
collaborative-video-viewer-default-rtdb
```

The current static UI uses Firebase Auth and Realtime Database through:

```text
js/firebase.js
```

The Realtime Database URL currently configured is:

```text
https://collaborative-video-viewer-default-rtdb.asia-southeast1.firebasedatabase.app
```

Firestore also exists in the Firebase project, and Firestore rules were added earlier, but the current `pages/` UI primarily uses Realtime Database.

## Current App Routing

Railway runs `app.py`.

`app.py` serves the static GitHub UI:

- `/` -> `pages/index.html`
- `/role.html` -> `pages/role.html`
- `/host.html` -> `pages/host.html`
- `/viewer.html` -> `pages/viewer.html`
- `/css/...` -> `css/...`
- `/js/...` -> `js/...`

Older Flask templates still exist in `templates/`, but they are not the main UI currently served by Railway.

## Important Recent Commits

- `74afb92 Prepare Flask app for Railway`
- `4048f84 Serve static GitHub UI on Railway`
- `ef1db48 Ignore Python cache files`

## Known History

The deployed UI previously looked different from the GitHub UI because Flask was serving `templates/login.html`.

That was fixed by changing `app.py` to serve the static UI under:

- `pages/`
- `css/`
- `js/`

## Next Things To Check

If login or room creation fails:

1. Check Firebase Auth settings.
2. Check Realtime Database rules.
3. Confirm `js/firebase.js` points to `collaborative-video-viewer`.

If Railway still shows the old UI:

1. Confirm Railway deployed the latest `main` commit.
2. Redeploy the Railway service.
3. Clear browser cache or test in an incognito window.

