from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify
from flask_socketio import SocketIO, emit, join_room
import os
import json
from hashlib import sha256
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secret!')
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_REQUEST_BYTES', 110 * 1024 * 1024))
socketio = SocketIO(app, cors_allowed_origins='*')

rooms = {}  # room: {'time': float, 'zoom': float, 'drawings': list of dicts}
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', 'collaborative-video-viewer')
FIREBASE_API_KEY = os.environ.get('FIREBASE_API_KEY', 'AIzaSyD1kMohW-RLw0EpfjgL-twy02f9t7Kfgrg')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-3.5-flash')
MAX_INLINE_VIDEO_BYTES = int(os.environ.get('MAX_INLINE_VIDEO_BYTES', 20 * 1024 * 1024))
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get(
        'ALLOWED_ORIGINS',
        'https://collaborative-video-viewer.web.app,'
        'https://collaborative-video-viewer.firebaseapp.com,'
        'http://localhost:5000,'
        'http://127.0.0.1:5000'
    ).split(',')
    if origin.strip()
}

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if '*' in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = '*'
    elif origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

def get_room_id(url):
    return sha256(url.strip().encode('utf-8')).hexdigest()[:16]

def firestore_value(value):
    if isinstance(value, bool):
        return {'booleanValue': value}
    if isinstance(value, int):
        return {'integerValue': value}
    if isinstance(value, float):
        return {'doubleValue': value}
    if isinstance(value, list):
        return {'arrayValue': {'values': [firestore_value(item) for item in value]}}
    if isinstance(value, dict):
        return {'mapValue': {'fields': {key: firestore_value(val) for key, val in value.items()}}}
    return {'stringValue': str(value)}

def create_firestore_room(room, url, role):
    fields = {
        'url': url,
        'role': role,
        'time': 0,
        'playing': False,
        'zoom': 1.0,
        'drawings': []
    }
    body = json.dumps({'fields': {key: firestore_value(value) for key, value in fields.items()}}).encode('utf-8')
    endpoint = (
        f'https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}'
        f'/databases/(default)/documents/rooms/{room}?key={FIREBASE_API_KEY}'
    )
    req = Request(endpoint, data=body, headers={'Content-Type': 'application/json'}, method='PATCH')
    with urlopen(req, timeout=10) as response:
        return response.status

def extract_gemini_text(response_body):
    candidates = response_body.get('candidates', [])
    if not candidates:
        return ''
    parts = candidates[0].get('content', {}).get('parts', [])
    return '\n'.join(part.get('text', '') for part in parts).strip()

def normalize_youtube_url(video_data):
    url = (video_data.get('url') or '').strip()
    video_id = (video_data.get('videoId') or '').strip()
    if url.startswith(('http://', 'https://')):
        return url
    if video_id:
        return f'https://www.youtube.com/watch?v={video_id}'
    if url and len(url) == 11:
        return f'https://www.youtube.com/watch?v={url}'
    return ''

def build_gemini_video_part(video_data):
    video_type = video_data.get('type')
    if video_type == 'youtube':
        url = normalize_youtube_url(video_data)
        if not url:
            raise ValueError('Missing YouTube URL.')
        return {'file_data': {'file_uri': url}}

    if video_type == 'upload':
        data_url = video_data.get('url', '')
        if ',' not in data_url:
            raise ValueError('Uploaded video data is missing.')
        header, base64_data = data_url.split(',', 1)
        estimated_bytes = (len(base64_data) * 3) // 4
        if estimated_bytes > MAX_INLINE_VIDEO_BYTES:
            limit_mb = MAX_INLINE_VIDEO_BYTES // (1024 * 1024)
            raise ValueError(
                f'Uploaded videos sent directly to Gemini must be {limit_mb} MB or smaller. '
                'Use a YouTube URL for longer videos.'
            )
        mime_type = video_data.get('mimeType') or 'video/mp4'
        if header.startswith('data:') and ';' in header:
            mime_type = header[5:].split(';', 1)[0] or mime_type
        return {'inline_data': {'mime_type': mime_type, 'data': base64_data}}

    raise ValueError('Unsupported video type.')

def transcribe_with_gemini(video_data):
    if not GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY is not set on the server.')

    prompt = (
        'Transcribe the spoken content from this video into clear study notes. '
        'Keep the notes useful for students: include a short summary, important points, '
        'and any action items or terms mentioned. If the video has no speech, describe '
        'the visible content briefly instead.'
    )
    payload = {
        'contents': [{
            'parts': [
                build_gemini_video_part(video_data),
                {'text': prompt}
            ]
        }]
    }
    endpoint = (
        f'https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:'
        'generateContent'
    )
    req = Request(
        endpoint,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY},
        method='POST'
    )
    with urlopen(req, timeout=120) as response:
        body = json.loads(response.read().decode('utf-8'))
    transcript = extract_gemini_text(body)
    if not transcript:
        raise RuntimeError('Gemini returned an empty transcript.')
    return transcript

@app.route('/')
def static_index():
    return send_from_directory('pages', 'index.html')

@app.route('/role.html')
def static_role():
    return send_from_directory('pages', 'role.html')

@app.route('/host.html')
def static_host():
    return send_from_directory('pages', 'host.html')

@app.route('/viewer.html')
def static_viewer():
    return send_from_directory('pages', 'viewer.html')

@app.route('/css/<path:filename>')
def static_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def static_js(filename):
    return send_from_directory('js', filename)

@app.route('/api/transcribe-video', methods=['POST'])
def transcribe_video():
    data = request.get_json(silent=True) or {}
    video_data = data.get('videoData') or {}
    try:
        transcript = transcribe_with_gemini(video_data)
        return jsonify({'transcript': transcript, 'model': GEMINI_MODEL})
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({'error': str(exc)}), 500
    except HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='replace')
        app.logger.error('Gemini API error: %s', error_body)
        return jsonify({'error': 'Gemini API rejected the video request.'}), exc.code
    except URLError:
        app.logger.exception('Unable to reach Gemini API')
        return jsonify({'error': 'Unable to reach Gemini API.'}), 502
    except Exception:
        app.logger.exception('Unexpected transcription failure')
        return jsonify({'error': 'Unexpected transcription failure.'}), 500

@app.route('/flask-watch', methods=['GET', 'POST'])
def index():
    role = request.args.get('role')
    if request.method == 'POST':
        url = request.form.get('url')
        role = request.form.get('role')
        if not url:
            return redirect(url_for('index'))
        room = get_room_id(url)
        try:
            create_firestore_room(room, url, role)
        except Exception as exc:
            app.logger.exception('Failed to create Firestore room')
            return render_template('index.html', role=role, error='Unable to create the room in Firestore. Please try again.')
        return render_template('watch.html', url=url, role=role, room=room)
    if role:
        return render_template('index.html', role=role)
    else:
        return render_template('login.html')

@socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)
    # send current state to new client if available
    state = rooms.get(room, {'time': 0, 'zoom': 1, 'drawings': [], 'playing': False})
    emit('state', {'action': 'full_state', **state}, room=request.sid)

@socketio.on('state')
def update_state(data):
    room = data['room']
    if room not in rooms:
        rooms[room] = {'time': 0, 'zoom': 1, 'drawings': []}
    if data['action'] == 'state_change':
        rooms[room]['time'] = data.get('time', 0)
        rooms[room]['playing'] = data.get('state') == 1  # YT.PlayerState.PLAYING
    elif data['action'] == 'zoom':
        rooms[room]['zoom'] = data['zoom']
    elif data['action'] == 'draw':
        rooms[room]['drawings'].append({'x0': data['x0'], 'y0': data['y0'], 'x1': data['x1'], 'y1': data['y1'], 'color': data['color']})
    emit('state', data, room=room, include_self=False)

@socketio.on('ping')
def on_ping(data):
    emit('pong', data)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG') == '1')
