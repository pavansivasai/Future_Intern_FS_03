const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect('mongodb://localhost/chat-app', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json());

// User schema and model
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});
const User = mongoose.model('User', userSchema);

// Message schema and model
const messageSchema = new mongoose.Schema({
    room: String,
    sender: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// User registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.sendStatus(201);
});

// User login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.sendStatus(401);
    }
    const token = jwt.sign({ userId: user._id }, 'secret');
    res.json({ token });
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('User connected');
    
    socket.on('joinRoom', (room) => {
        socket.join(room);
    });

    socket.on('message', async (data) => {
        const message = new Message(data);
        await message.save();
        io.to(data.room).emit('message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
