// Renkler ve sayılar
const colors = ['Kırmızı', 'Siyah', 'Yeşil', 'Mavi'];
const colorCodes = {
    'Kırmızı': '#e74c3c',
    'Siyah': '#2d3436',
    'Yeşil': '#27ae60',
    'Mavi': '#2980b9'
};
const numbers = [1,2,3,4,5,6,7,8,9,10,11,12,13];

const istakaSize = 12;
let istaka = [];
let board = [];
let score = 0;
const targetScore = 100;

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
        el.onclick = () => {
            // Taşı board'a ekle, ıstakadan çıkar
            board.push(tile);
            istaka.splice(idx, 1);
            refillIstaka();
            renderIstaka();
            renderBoard();
            autoCheckSet(); // her eklemede otomatik set kontrolü
        };
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
        el.onclick = () => {
            // Taşı geri ıstakaya al (en sağa ekle)
            istaka.push(tile);
            board.splice(idx, 1);
            refillIstaka();
            renderIstaka();
            renderBoard();
            autoCheckSet();
        };
        boardDiv.appendChild(el);
    });
}

function showMessage(msg, timeout = 2000) {
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
            showMessage(points + " puan kazandınız!", 1800);
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

// Oyun başlangıcı
function startGame(){
    istaka = [];
    board = [];
    score = 0;
    refillIstaka();
    renderIstaka();
    renderBoard();
    renderTargetScore();
    updateScore(0);
    showMessage("Taş eklemek için ISTAKA'daki taşa tıkla. Açılan taşları geri almak için üzerine tıkla.", 4000);
}

startGame();