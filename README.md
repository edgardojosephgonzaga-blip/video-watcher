# video-watcher

Collaborative video watcher with Firebase login/rooms, Railway Flask backend, and Gemini-generated study notes.

## Railway environment variables

Set these on the Railway service before deploying:

```text
GEMINI_API_KEY=<your Google AI Studio API key>
SECRET_KEY=<any long random string>
GEMINI_MODEL=gemini-3.5-flash
```

Optional:

```text
MAX_INLINE_VIDEO_BYTES=20971520
MAX_REQUEST_BYTES=115343360
ALLOWED_ORIGINS=https://your-railway-app.up.railway.app,http://localhost:5000,http://127.0.0.1:5000
```

Get a Gemini key from Google AI Studio: https://aistudio.google.com/app/apikey

Do not commit a real Gemini API key to this repo.
