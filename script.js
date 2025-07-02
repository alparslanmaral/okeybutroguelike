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
let isTouchDragging = false;
let ghost = null;

function getRandomTile(){
    const color = colors[Math.floor(Math.random() * colors.length)];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    return { color, number };
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
        // MASAÜSTÜ drag & drop
        el.addEventListener('dragstart', (e) => {
            if (isTouchDragging) return;
            dragSource = tile;
            dragIndex = idx;
            dragFrom = 'istaka';
            setTimeout(() => el.classList.add('dragging'), 0);
        });
        el.addEventListener('dragend', (e) => {
            if (isTouchDragging) return;
            el.classList.remove('dragging');
            dragSource = null;
            dragIndex = null;
            dragFrom = null;
            removeAllDragOver();
        });
        // MOBİL dokunarak sürükleme
        el.addEventListener('touchstart', (e) => handleTouchStart(e, tile, idx, 'istaka'));
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
        // MASAÜSTÜ drag & drop
        el.addEventListener('dragstart', (e) => {
            if (isTouchDragging) return;
            dragSource = tile;
            dragIndex = idx;
            dragFrom = 'board';
            setTimeout(() => el.classList.add('dragging'), 0);
        });
        el.addEventListener('dragend', (e) => {
            if (isTouchDragging) return;
            el.classList.remove('dragging');
            dragSource = null;
            dragIndex = null;
            dragFrom = null;
            removeAllDragOver();
        });
        // MOBİL dokunarak sürükleme
        el.addEventListener('touchstart', (e) => handleTouchStart(e, tile, idx, 'board'));
        boardDiv.appendChild(el);
    });
}

function setupDroppableAreas() {
    // Board'a taş bırakma
    const boardDiv = document.getElementById('board');
    boardDiv.addEventListener('dragover', (e) => {
        if (isTouchDragging) return;
        e.preventDefault();
        boardDiv.classList.add('drag-over');
    });
    boardDiv.addEventListener('dragleave', (e) => {
        if (isTouchDragging) return;
        boardDiv.classList.remove('drag-over');
    });
    boardDiv.addEventListener('drop', (e) => {
        if (isTouchDragging) return;
        e.preventDefault();
        boardDiv.classList.remove('drag-over');
        if (dragSource && dragFrom === 'istaka' && istaka.length >= dragIndex) {
            if ((board.length + istaka.length) <= istakaSize && istaka.length > 0) {
                board.push(dragSource);
                istaka.splice(dragIndex, 1);
                renderIstaka();
                renderBoard();
            }
        }
    });

    // Istakaya taş bırakma
    const istakaDiv = document.getElementById('istaka');
    istakaDiv.addEventListener('dragover', (e) => {
        if (isTouchDragging) return;
        e.preventDefault();
        istakaDiv.classList.add('drag-over');
    });
    istakaDiv.addEventListener('dragleave', (e) => {
        if (isTouchDragging) return;
        istakaDiv.classList.remove('drag-over');
    });
    istakaDiv.addEventListener('drop', (e) => {
        if (isTouchDragging) return;
        e.preventDefault();
        istakaDiv.classList.remove('drag-over');
        if (dragSource && dragFrom === 'board' && board.length >= dragIndex) {
            // YENİ: Board'dan ıstakaya taş her zaman alınabilmeli!
            istaka.push(dragSource);
            board.splice(dragIndex, 1);
            renderIstaka();
            renderBoard();
        }
    });
}
function removeAllDragOver() {
    document.getElementById('board').classList.remove('drag-over');
    document.getElementById('istaka').classList.remove('drag-over');
}

// --- MOBİL TOUCH SÜRÜKLEME ---
function getTouchTargetArea(x, y) {
    const istakaDiv = document.getElementById('istaka');
    const boardDiv = document.getElementById('board');
    const istakaRect = istakaDiv.getBoundingClientRect();
    const boardRect = boardDiv.getBoundingClientRect();
    if (x > istakaRect.left && x < istakaRect.right && y > istakaRect.top && y < istakaRect.bottom) {
        return 'istaka';
    }
    if (x > boardRect.left && x < boardRect.right && y > boardRect.top && y < boardRect.bottom) {
        return 'board';
    }
    return null;
}

function handleTouchStart(e, tile, idx, from) {
    if (e.touches.length > 1) return;
    isTouchDragging = true;
    dragSource = tile;
    dragIndex = idx;
    dragFrom = from;
    ghost = document.createElement('div');
    ghost.className = 'tile ghost-drag';
    ghost.style.position = 'fixed';
    ghost.style.left = (e.touches[0].clientX - 24) + 'px';
    ghost.style.top = (e.touches[0].clientY - 34) + 'px';
    ghost.style.background = colorCodes[tile.color];
    ghost.style.color = tile.color === 'Siyah' ? '#fff' : '#222';
    ghost.style.width = '48px';
    ghost.style.height = '68px';
    ghost.style.zIndex = '9999';
    ghost.innerText = tile.number;
    document.body.appendChild(ghost);

    document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.body.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchMove(e) {
    if (!ghost || !isTouchDragging) return;
    e.preventDefault();
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    ghost.style.left = (x - 24) + 'px';
    ghost.style.top = (y - 34) + 'px';

    const target = getTouchTargetArea(x, y);
    document.getElementById('istaka').classList.toggle('drag-over', target === 'istaka');
    document.getElementById('board').classList.toggle('drag-over', target === 'board');
}

function handleTouchEnd(e) {
    if (!ghost || !isTouchDragging) return;
    let x = 0, y = 0;
    if (e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
    } else if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    }
    const target = getTouchTargetArea(x, y);

    document.getElementById('istaka').classList.remove('drag-over');
    document.getElementById('board').classList.remove('drag-over');

    if (target && dragSource !== null && dragFrom !== null) {
        if (dragFrom === 'istaka' && target === 'board') {
            if ((board.length + istaka.length) <= istakaSize && istaka.length > 0) {
                board.push(dragSource);
                istaka.splice(dragIndex, 1);
                renderIstaka();
                renderBoard();
            }
        } else if (dragFrom === 'board' && target === 'istaka') {
            // YENİ: Board'dan ıstakaya taş her zaman alınabilmeli!
            istaka.push(dragSource);
            board.splice(dragIndex, 1);
            renderIstaka();
            renderBoard();
        }
    }
    document.body.removeEventListener('touchmove', handleTouchMove);
    document.body.removeEventListener('touchend', handleTouchEnd);
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    ghost = null;
    dragSource = null; dragIndex = null; dragFrom = null;
    isTouchDragging = false;
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

function checkSet(tiles){
    if(tiles.length !== 3) return 0;
    if(tiles[0].color === tiles[1].color && tiles[1].color === tiles[2].color){
        if(!(tiles[0].number === tiles[1].number && tiles[1].number === tiles[2].number)){
            return 10;
        }
    }
    if(tiles[0].number === tiles[1].number && tiles[1].number === tiles[2].number){
        return 15;
    }
    const nums = tiles.map(t => t.number).sort((a,b) => a-b);
    if(nums[1] === nums[0]+1 && nums[2] === nums[1]+1){
        return 20;
    }
    return 0;
}

function handleOpenSet() {
    let i = 0;
    let totalPoints = 0;
    let setsFound = 0;
    let removeIndices = [];
    while (i <= board.length - 3) {
        const candidate = board.slice(i, i+3);
        const points = checkSet(candidate);
        if (points > 0) {
            totalPoints += points;
            setsFound++;
            removeIndices.push(i, i+1, i+2);
            i += 3;
        } else {
            i++;
        }
    }
    if (setsFound > 0) {
        updateScore(totalPoints);
        showMessage(`${setsFound} set açıldı, +${totalPoints} puan!`, 1700);
        removeIndices.sort((a,b)=>b-a).forEach(idx => board.splice(idx,1));
        // Sadece set açılırsa eksik taş ver
        let toplamTas = istaka.length + board.length;
        let eksik = istakaSize - toplamTas;
        for(let k=0; k<eksik; k++) istaka.push(getRandomTile());
    } else {
        showMessage("Açılacak uygun set yok!", 1700);
        // HİÇ YENİ TAŞ VERME!
    }
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