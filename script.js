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

let dragSource = null, dragIndex = null, dragFrom = null;

function getRandomTile(){
    const color = colors[Math.floor(Math.random() * colors.length)];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    return { color, number };
}

function refillIstaka() {
    while (istaka.length < istakaSize) {
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

// Drag&Drop events
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
            board.push(dragSource);
            istaka.splice(dragIndex, 1);
            renderIstaka();
            renderBoard();
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
            if (istaka.length < istakaSize) {
                istaka.push(dragSource);
                board.splice(dragIndex, 1);
                renderIstaka();
                renderBoard();
            } else {
                showMessage("Istaka dolu! El açmalısın.");
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

// SET KONTROLÜ VE PUANLAMA (Sadece El Aç ile)
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

function handleOpenSet() {
    let i = 0;
    let totalPoints = 0;
    let setsFound = 0;
    let boardCopy = [...board];
    while (i <= boardCopy.length - 3) {
        const candidate = boardCopy.slice(i, i+3);
        const points = checkSet(candidate);
        if (points > 0) {
            totalPoints += points;
            setsFound++;
            boardCopy.splice(i, 3);
        } else {
            i++;
        }
    }
    // Uygula:
    if (setsFound > 0) {
        updateScore(totalPoints);
        showMessage(`${setsFound} set açıldı, +${totalPoints} puan!`, 1700);
        // Gerçek board'u da aynı şekilde güncelle
        i = 0;
        while (i <= board.length - 3) {
            const candidate = board.slice(i, i+3);
            const points = checkSet(candidate);
            if (points > 0) {
                board.splice(i, 3);
            } else {
                i++;
            }
        }
    } else {
        showMessage("Açılacak uygun set yok!", 1700);
    }
    // Eksik taş kadar yeni taş ver
    let eksik = istakaSize - istaka.length;
    for(let k=0; k<eksik; k++) istaka.push(getRandomTile());
    renderIstaka();
    renderBoard();
}

function renderTargetScore(){
    document.getElementById('target-score').innerText = `Hedef Puan: ${targetScore}`;
}

function startGame(){
    istaka = [];
    board = [];
    score = 0;
    for(let i=0;i<istakaSize;i++) istaka.push(getRandomTile());
    renderIstaka();
    renderBoard();
    renderTargetScore();
    updateScore(0);
    showMessage("Taşları sürükleyerek aç, el açınca puan kazanıp yeni taş alırsın.", 3500);
}

window.onload = function() {
    startGame();
    setupDroppableAreas();
    document.getElementById('open-set-btn').onclick = handleOpenSet;
};