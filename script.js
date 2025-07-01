// Mobil dikey Okey oyunu: 7 taş, sürükle bırak ile taş ekle/geri al (çift yönlü drag & drop)

const colors = ['Kırmızı', 'Siyah', 'Yeşil', 'Mavi'];
const colorCodes = {
    'Kırmızı': '#e74c3c',
    'Siyah': '#2d3436',
    'Yeşil': '#27ae60',
    'Mavi': '#2980b9'
};
const numbers = [1,2,3,4,5,6,7,8,9,10,11,12,13];

const istakaSize = 7;
let istaka = [];
let board = [];
let score = 0;
const targetScore = 100;

// Sürüklenen taş bilgisi
let dragSource = null;   // taş objesi
let dragIndex = null;    // taşın indexi
let dragFrom = null;     // 'istaka' veya 'board'

function getRandomTile(){
    const color = colors[Math.floor(Math.random() * colors.length)];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    return { color, number };
}

function refillIstaka(){
    while (istaka.length < istakaSize){
        istaka.push(getRandomTile());
    }
}

function renderIstaka(){
    const istakaDiv = document.getElementById('istaka');
    istakaDiv.innerHTML = '';
    istaka.forEach((tile, idx) => {
        const el = document.createElement('div');
        el.className = 'tile istaka';
        el.style.background = colorCodes[tile.color];
        el.style.color = tile.color === 'Siyah' ? '#fff' : '#222';
        el.innerText = tile.number;
        el.title = tile.color + ' ' + tile.number;
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            dragSource = tile;
            dragIndex = idx;
            dragFrom = 'istaka';
            setTimeout(() => el.classList.add('dragging'), 0);
        });
        el.addEventListener('dragend', (e) => {
            el.classList.remove('dragging');
            dragSource = null;
            dragIndex = null;
            dragFrom = null;
            removeAllDragOver();
        });
        istakaDiv.appendChild(el);
    });
}

function renderBoard(){
    const boardDiv = document.getElementById('board');
    boardDiv.innerHTML = '';
    board.forEach((tile, idx) => {
        const el = document.createElement('div');
        el.className = 'tile board';
        el.style.background = colorCodes[tile.color];
        el.style.color = tile.color === 'Siyah' ? '#fff' : '#222';
        el.innerText = tile.number;
        el.title = tile.color + ' ' + tile.number;
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            dragSource = tile;
            dragIndex = idx;
            dragFrom = 'board';
            setTimeout(() => el.classList.add('dragging'), 0);
        });
        el.addEventListener('dragend', (e) => {
            el.classList.remove('dragging');
            dragSource = null;
            dragIndex = null;
            dragFrom = null;
            removeAllDragOver();
        });
        boardDiv.appendChild(el);
    });
}

// Drag & Drop events
function setupDroppableAreas() {
    // Board'a taş bırakma
    const boardDiv = document.getElementById('board');
    boardDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
        boardDiv.classList.add('drag-over');
    });
    boardDiv.addEventListener('dragleave', (e) => {
        boardDiv.classList.remove('drag-over');
    });
    boardDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        boardDiv.classList.remove('drag-over');
        if (dragSource && dragFrom === 'istaka' && istaka.length >= dragIndex) {
            // Taşı istakadan board'a taşı
            board.push(dragSource);
            istaka.splice(dragIndex, 1);
            refillIstaka();
            renderIstaka();
            renderBoard();
            autoCheckSet();
        } else if (dragSource && dragFrom === 'board') {
            // Board'dan board'a sürükleme: bir şey yapma
        }
    });

    // Istakaya taş bırakma
    const istakaDiv = document.getElementById('istaka');
    istakaDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
        istakaDiv.classList.add('drag-over');
    });
    istakaDiv.addEventListener('dragleave', (e) => {
        istakaDiv.classList.remove('drag-over');
    });
    istakaDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        istakaDiv.classList.remove('drag-over');
        if (dragSource && dragFrom === 'board' && board.length >= dragIndex) {
            // Taşı board'dan istakaya al (en sağa ekle)
            if (istaka.length < istakaSize) {
                istaka.push(dragSource);
                board.splice(dragIndex, 1);
                refillIstaka();
                renderIstaka();
                renderBoard();
                autoCheckSet();
            } else {
                showMessage("Istaka dolu! Önce taş aç.");
            }
        }
    });
}
function removeAllDragOver() {
    document.getElementById('board').classList.remove('drag-over');
    document.getElementById('istaka').classList.remove('drag-over');
}

function showMessage(msg, timeout = 2200) {
    const msgDiv = document.getElementById('message');
    msgDiv.innerText = msg;
    msgDiv.classList.remove('hidden');
    msgDiv.classList.add('visible');
    if (timeout > 0) {
        setTimeout(() => {
            msgDiv.classList.remove('visible');
            msgDiv.classList.add('hidden');
        }, timeout);
    }
}

function updateScore(points){
    score += points;
    document.getElementById('score').innerText = `Puan: ${score}`;
    if (score >= targetScore) {
        showMessage("Tebrikler! Hedef puana ulaştınız!", 0);
        setTimeout(() => {
            location.reload();
        }, 3000);
    }
}

// --- SET KONTROLÜ VE OTOMATİK PUANLAMA ---
function checkSet(tiles){
    if(tiles.length !== 3) return 0;
    // Aynı renk kontrolü (numaralar farklı olacak)
    if(tiles[0].color === tiles[1].color && tiles[1].color === tiles[2].color){
        if(!(tiles[0].number === tiles[1].number && tiles[1].number === tiles[2].number)){
            return 10; // Aynı renk, farklı numaralar
        }
    }
    // Aynı sayı kontrolü (renk farklı olabilir)
    if(tiles[0].number === tiles[1].number && tiles[1].number === tiles[2].number){
        return 15; // Aynı sayı, renkler önemli değil
    }
    // Art arda artan numaralar (renk önemli değil)
    const nums = tiles.map(t => t.number).sort((a,b) => a-b);
    if(nums[1] === nums[0]+1 && nums[2] === nums[1]+1){
        return 20; // Sıralı, renk önemli değil
    }
    return 0;
}

// Board üstünde her yeni eklemede baştan sona 3lü setleri kontrol et
function autoCheckSet() {
    let i = 0;
    let anySet = false;
    while (i <= board.length - 3) {
        const candidate = board.slice(i, i+3);
        const points = checkSet(candidate);
        if (points > 0) {
            // Set bulundu: puan ver, board'dan 3'lü grubu sil
            updateScore(points);
            showMessage(points + " puan kazandınız!", 1400);
            board.splice(i, 3);
            renderBoard();
            anySet = true;
            // Aynı yerde tekrar kontrol et (yeni kayma olabilir)
        } else {
            i++;
        }
    }
}

function renderTargetScore(){
    document.getElementById('target-score').innerText = `Hedef Puan: ${targetScore}`;
}

function startGame(){
    istaka = [];
    board = [];
    score = 0;
    refillIstaka();
    renderIstaka();
    renderBoard();
    renderTargetScore();
    updateScore(0);
    showMessage("Taşları sürükleyerek yukarı açabilir, geri almak için aşağıya çekebilirsin!", 3500);
}

window.onload = function() {
    startGame();
    setupDroppableAreas();
};