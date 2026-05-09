from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
import os
import json
from hashlib import sha256
from urllib.request import Request, urlopen

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secret!')
socketio = SocketIO(app)

rooms = {}  # room: {'time': float, 'zoom': float, 'drawings': list of dicts}
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', 'collaborative-video-viewer')
FIREBASE_API_KEY = os.environ.get('FIREBASE_API_KEY', 'AIzaSyD1kMohW-RLw0EpfjgL-twy02f9t7Kfgrg')

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

@app.route('/', methods=['GET', 'POST'])
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
