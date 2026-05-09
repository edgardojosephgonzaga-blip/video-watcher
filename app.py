from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secret!')
socketio = SocketIO(app)

rooms = {}  # room: {'time': float, 'zoom': float, 'drawings': list of dicts}

@app.route('/', methods=['GET', 'POST'])
def index():
    role = request.args.get('role')
    if request.method == 'POST':
        url = request.form.get('url')
        role = request.form.get('role')
        if not url:
            return redirect(url_for('index'))
        # simple room name based on url
        room = url.replace('https://','').replace('/','_')
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
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
