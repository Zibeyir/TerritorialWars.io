const socket = io(); // Socket.io serverinə qoşulma

let playerData = {
    id: null,
    circles: [],
    color: null,
    score: 0,
};

let otherPlayers = [];
let food = []; // Xallar

// HTML-də canvas elementini əldə edirik
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Dairələri render etmək üçün
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Səhifəni təmizləyirik

    // Oyunçunun dairələrini render edirik
    playerData.circles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.size, 0, 2 * Math.PI);
        ctx.fillStyle = circle.color;
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(circle.score, circle.x - 5, circle.y + 5); // Dairənin içində xal göstərilir
    });

    // Digər oyunçuların dairələrini render edirik
    otherPlayers.forEach(player => {
        player.circles.forEach(circle => {
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.size, 0, 2 * Math.PI);
            ctx.fillStyle = circle.color;
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(circle.score, circle.x - 5, circle.y + 5); // Dairənin içində xal göstərilir
        });
    });

    // Xalları render edirik
    food.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, 2 * Math.PI);
        ctx.fillStyle = "yellow";
        ctx.fill();
    });
}

// Oyun vəziyyətini alırıq
socket.on("gameState", (data) => {
    playerData.circles = data.playerCircles;
    playerData.color = data.color;
    otherPlayers = data.otherPlayers;
    food = data.food;
    renderGame();
});

// Yeni oyunçu qoşulanda
socket.on("newPlayer", (player) => {
    otherPlayers.push(player);
    renderGame();
});

// Oyunçu ayrıldıqda
socket.on("playerDisconnected", (playerId) => {
    otherPlayers = otherPlayers.filter(player => player.id !== playerId);
    renderGame();
});
// Serverdən dairənin yeni mövqeyini alırıq
socket.on('updateCirclePosition', (data) => {
    console.log(`Dairə ${data.circleId} yeni mövqeyə gəldi: (${data.targetX}, ${data.targetY})`);

    // Dairənin mövqeyini tapırıq
    const circle = playerData.circles.find(c => c.id === data.circleId);
    if (circle) {
        // Dairənin yeni mövqeyini təyin edirik
        circle.x = data.targetX;
        circle.y = data.targetY;

        // Dairənin ekranda yenilənməsi üçün rəsm çəkməliyik
        drawCircles();
    }
});
function drawCircles() {
    // Ekranı təmizləyirik (təsvirlər əvvəlki mövqedə qalmasın)
    ctx.clearRect(0, 0, canvas.width, canvas.height);  

    // Hər dairəni ekranda yenidən çəkirik
    playerData.circles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.size, 0, Math.PI * 2, false);
        ctx.fillStyle = circle.color;
        ctx.fill();

        // Xəttin çəkilməsi
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Xalın göstərilməsi
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(circle.score, circle.x - 10, circle.y + 5);
    });
}

let selectedCircle = null;  // Seçilmiş dairəni izləyirik
let targetX = null;
let targetY = null;

// Ekranda hərəkət edən dairəni çəkmək
function moveCircle() {
    if (selectedCircle) {
        const dx = targetX - selectedCircle.x;
        const dy = targetY - selectedCircle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            // Dairə hədəfə doğru hərəkət edir
            selectedCircle.x += dx / distance * 5;  // 5px/s sürəti ilə hərəkət
            selectedCircle.y += dy / distance * 5;

            // Yeni mövqeyi çəkmək
            drawCircles();

            // Hərəkət animasiyasını davam etdiririk
            requestAnimationFrame(moveCircle);
        } else {
            // Dairə hədəfə çatdıqda
            selectedCircle.x = targetX;
            selectedCircle.y = targetY;

            // Yeni mövqeyi çəkirik
            drawCircles();

            // Seçimi sıfırlayırıq
            selectedCircle = null;
        }
    }
}

// Müştəridən gələn məlumatla dairəni hərəkət etdiririk
socket.on('updateCirclePosition', (data) => {
    const circle = playerData.circles.find(c => c.id === data.circleId);
    if (circle) {
        targetX = data.targetX;
        targetY = data.targetY;

        // Hərəkəti başlatmaq
        requestAnimationFrame(moveCircle);
    }
});




// Oyunçu dairəni seçəndə
function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
console.log("ClikedCircle");
    if (!selectedCircle) {
        console.log(" İlk kliklə dairə seçilir");

        // İlk kliklə dairə seçilir
        playerData.circles.forEach(circle => {
            const distance = Math.sqrt((circle.x - x) ** 2 + (circle.y - y) ** 2);
            if (distance < circle.size) {
                selectedCircle = circle;
                console.log('Dairə seçildi:', selectedCircle);
            }
        });
    } else {
        // İkinci kliklə hədəf nöqtəsi təyin edilir
        targetX = x;
        targetY = y;
        console.log(`Dairə ${selectedCircle.id} hədəf nöqtəsinə hərəkət edir: (${targetX}, ${targetY})`);

        // Dairənin yeni yerə hərəkət etməsi üçün məlumat göndərilir
        socket.emit('moveCircle', {
            circleId: selectedCircle.id,
            targetX: targetX,
            targetY: targetY,
        });

        // Seçimi sıfırlayıb yeni hərəkəti gözləyirik
        selectedCircle = null;
    }
}

// Mouse klikləmə funksiyası
canvas.addEventListener("click", onCanvasClick);

// Xalları toplamaq üçün funksiyanı da təyin edirik
function collectFood() {
    playerData.circles.forEach(circle => {
        food.forEach((f, index) => {
            const distance = Math.sqrt((circle.x - f.x) ** 2 + (circle.y - f.y) ** 2);
            if (distance < circle.size + f.size) {
                socket.emit('collectFood', circle.id);
                food.splice(index, 1); // Qidayı silirik
            }
        });
    });
}

setInterval(collectFood, 100); // Xalları toplamaq üçün funksiyanı təkrarlayırıq

// Hər 50 ms-də oyunu render edirik
setInterval(renderGame, 50);
