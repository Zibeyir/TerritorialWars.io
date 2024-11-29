const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Serverin yaradılması
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const colors = ["red", "blue", "green", "purple", "orange", "pink", "cyan", "lime", "brown"];
let players = {}; // Oyunçuların məlumatlarını saxlayırıq
let food = []; // Yaranan xallar (food)

// Statik faylları təqdim etmək üçün
app.use(express.static('public'));

// Yeni oyunçu bağlandığında
io.on('connection', (socket) => {
    console.log(`Yeni oyunçu qoşuldu: ${socket.id}`);

    // Oyunçunun rəngini seçirik
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Oyunçunun məlumatlarını serverdə saxlayırıq
    players[socket.id] = {
        id: socket.id,
        color: color,
        circles: generateCircles(socket.id, color), // Dairələr və rəng
        score: 0,
    };

    // Yeni oyunçunun dairələrini və rəngini göndəririk
    socket.emit('gameState', {
        playerCircles: players[socket.id].circles,
        color: color,
        otherPlayers: Object.values(players).map(player => ({
            id: player.id,
            color: player.color,
            circles: player.circles
        })),
        food: food, // Xalları da göndəririk
    });

    // Digər oyunçulara yeni oyunçu barədə məlumat göndəririk
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Dairəni hərəkət etdirmək
socket.on('moveCircle', (data) => {
    console.log("Serverə moveCircle məlumatı gəldi: ", data);

    const player = players[socket.id];
    if (player) {
        // Məlumatda verilən dairənin ID-si ilə uyğun dairə tapılır
        const circle = player.circles.find(c => c.id === data.circleId);

        if (circle) {
            console.log(`Dairə ${circle.id} yeni yerə hərəkət edir: (${data.targetX}, ${data.targetY})`);
            // Dairənin yeni hədəf nöqtəsini təyin edirik
            circle.targetX = data.targetX;
            circle.targetY = data.targetY;

            // Burada, dairənin yeni mövqeyini serverə göndərərək, hər kəsin oyun sahəsində bu dəyişikliyi görməsini təmin edə bilərik
            io.emit('updateCirclePosition', {
                circleId: data.circleId,
                targetX: data.targetX,
                targetY: data.targetY,
                playerId: socket.id,
            });        
        }
    }
});


    // Oyunçunun xal toplaması
    socket.on('collectFood', (circleId) => {
        const player = players[socket.id];
        if (player) {
            const circle = player.circles.find(c => c.id === circleId);
            if (circle) {
                food = food.filter(f => !isColliding(circle, f)); // Yığılmış xalları silirik
                player.score += 10; // Hər qida topladıqda xal artır
            }
        }
    });

    // Oyunçu oyun bitirdikdə
    socket.on('disconnect', () => {
        console.log(`Oyunçu ayrıldı: ${socket.id}`);
        delete players[socket.id];
        socket.broadcast.emit('playerDisconnected', socket.id);
    });
});

// Oyunçular üçün dairələrin yaradılması
function generateCircles(playerId, color) {
    let circles = [];
    for (let i = 0; i < 5; i++) {
        circles.push({
            id: `${playerId}_circle_${i}`,
            x: Math.random() * 500 + 50, // Dairənin başlanğıc mövqeyi (yuxarı sol küncdən uzaqda)
            y: Math.random() * 500 + 50, 
            size: 20, // Başlanğıc ölçüsü - balaca dairələr
            score: 50,
            color: color, // Oyunçunun rəngi
            targetX: null, // Hədəf mövqeyi
            targetY: null, // Hədəf mövqeyi
        });
    }
    return circles;
}

// Yaratmaq üçün təsadüfi food nöqtələri
function generateFood() {
    for (let i = 0; i < 5; i++) {
        food.push({
            x: Math.random() * 500 + 50, 
            y: Math.random() * 500 + 50, 
            size: 5, // Xallar balaca
        });
    }
}

// Qida ilə dairənin toqquşmasını yoxlayırıq
function isColliding(circle, foodItem) {
    const distance = Math.sqrt((circle.x - foodItem.x) ** 2 + (circle.y - foodItem.y) ** 2);
    return distance < circle.size + foodItem.size;
}

// Xallar yaradılır
setInterval(generateFood, 5000);

// Serverin işə salınması
server.listen(3000, () => {
    console.log('Server http://localhost:3000 ünvanında işləyir');
});
