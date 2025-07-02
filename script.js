// === OKEY OYUNU TAM SÜRÜM ===
// - Okey havuzu (106 taş: 4x(1-13)x2 + 2 joker)
// - Her seviye başında havuz sıfırlanır, taşlar havuzdan çekilir
// - Taş değiştirme havuzdan eksiltir, havuzdan çıkan taşlar geri gelmez (level bitene kadar)
// - Kalan taşlar popup'ı ile havuzun güncel durumu gösterilir, kutunun altında "Kalan: n" olarak yazar
// - 5'li, 4'lü, 3'lü grup setleri de desteklenir, en büyükten küçük sete öncelik verilir
// - Her taş bir sette yalnızca bir defa kullanılır

// ------------------------------
// === AYARLAR ===
const colors = ['Kırmızı', 'Siyah', 'Yeşil', 'Mavi'];
const numbers = [1,2,3,4,5,6,7,8,9,10,11,12,13];
const istakaSize = 7;
const JOKER = { color: "Joker", number: 0 }; // Joker taş

const levelTargets = [50, 120, 200, 300, 420, 570, 750, 900, 1200, 2000];
const levelMax = levelTargets.length;
const changeStonesMax = 10;

// ------------------------------
// === OYUN DURUMU ===
let pool = [];      // Havuz (dağıtılmamış taşlar)
let istaka = [];
let board = [];
let score = 0;
let level = 1;
let changeStonesRemaining = changeStonesMax;
let isChangingStones = false;
let selectedForChange = [];

let dragSource = null, dragIndex = null, dragFrom = null;
let isTouchDragging = false;
let ghost = null;

// ------------------------------
// === HAVUZ OLUŞTURMA VE TAŞ ÇEKME ===
function createPool() {
    let arr = [];
    for (const c of colors) {
        for (const n of numbers) {
            arr.push({ color: c, number: n });
            arr.push({ color: c, number: n });
        }
    }
    arr.push({ ...JOKER });
    arr.push({ ...JOKER });
    // Karıştır:
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function drawFromPool(count) {
    let drawn = [];
    for (let i = 0; i < count; i++) {
        if (pool.length === 0) break;
        drawn.push(pool.pop());
    }
    return drawn;
}
function isJoker(tile) {
    return tile.color === "Joker";
}
const colorCodes = {
    'Kırmızı': '#e74c3c',
    'Siyah': '#2d3436',
    'Yeşil': '#27ae60',
    'Mavi': '#2980b9',
    'Joker': '#e67e22'
};

// ------------------------------
// === KURALLAR (Joker Destekli) ===
function isConsecutiveSeries(tiles) {
    if (tiles.length < 3) return false;
    const color = tiles.find(t => !isJoker(t))?.color;
    if (!color) return false;
    if (!tiles.every(t => isJoker(t) || t.color === color)) return false;

    let nums = tiles.map(t => isJoker(t) ? null : t.number);
    let jokers = nums.filter(x => x === null).length;
    let realNums = nums.filter(x => x !== null);
    realNums.sort((a, b) => a - b);

    let min = realNums[0];
    let expected = [];
    for (let i = 0; i < tiles.length; i++) {
        let val = min + i;
        if (val > 13) val = val - 13;
        expected.push(val);
    }
    let missing = expected.filter(x => !realNums.includes(x)).length;
    return missing === jokers;
}

// 5'li grup set desteği!
function isSameNumberGroup(tiles) {
    if (tiles.length < 3 || tiles.length > 5) return false; // 5'li gruplara izin ver
    let realTiles = tiles.filter(t => !isJoker(t));
    const number = realTiles[0]?.number;
    if (!realTiles.every(t => t.number === number)) return false;
    let colorSet = new Set(realTiles.map(t => t.color));
    // Her renk en fazla 1 kez, toplam taş kadar farklı renk + joker olmalı
    if (colorSet.size + tiles.filter(isJoker).length !== tiles.length) return false;
    // 4 renk + 1 joker olursa tamam
    return true;
}

// EN BÜYÜK GRUP SETİ ÖNCELİKLİ, HER TAŞ YALNIZCA BİR SETTE
function findAllSets(boardTiles) {
    let sets = [];
    let used = Array(boardTiles.length).fill(false);

    // --- 1. GRUP SETLER (5-3 taş arası, büyükten küçüğe, aynı sayıdan farklı renk+joker) ---
    // Her farklı number için, kullanılmayan taşlardan en büyük possible group seti bul:
    let unusedTiles = boardTiles.map((t, i) => ({...t, _idx: i}));
    for (let groupLen = 5; groupLen >= 3; groupLen--) {
        // Sadece kullanılmayan taşlar!
        let candidates = unusedTiles.filter((t, i) => !used[t._idx] && !isJoker(t));
        let uniqueNumbers = [...new Set(candidates.map(t => t.number))];
        for (let num of uniqueNumbers) {
            // Bu numaradaki kullanılmayan renkleri ve jokerleri topla
            let groupTiles = [];
            let colorsUsed = new Set();
            // Renkli taşlar
            for (let t of candidates) {
                if (t.number === num && !isJoker(t) && !colorsUsed.has(t.color)) {
                    groupTiles.push(t);
                    colorsUsed.add(t.color);
                }
            }
            // Jokerleri ekle
            let jokers = unusedTiles.filter(t => !used[t._idx] && isJoker(t));
            for (let j = 0; j < jokers.length && groupTiles.length < groupLen; j++) {
                groupTiles.push(jokers[j]);
            }
            // Set uygun uzunlukta ve renkler farklıysa
            if (groupTiles.length === groupLen) {
                // Seti sırala: renkli->joker
                groupTiles.sort((a,b) => isJoker(a) - isJoker(b));
                // Set olarak ekle
                sets.push({
                    type: 'grup',
                    tiles: groupTiles,
                    indexes: groupTiles.map(t => t._idx)
                });
                // Kullanılan taşları işaretle
                for (let t of groupTiles) used[t._idx] = true;
            }
        }
    }

    // --- 2. SERİ SETLER (3+ taş, sıralı, renk aynı, joker destekli) ---
    for (let i = 0; i < boardTiles.length; i++) {
        for (let j = i + 3; j <= boardTiles.length; j++) {
            if (used.slice(i, j).some(u => u)) continue;
            let slice = boardTiles.slice(i, j);
            if (isConsecutiveSeries(slice)) {
                sets.push({ type: 'seri', tiles: slice, indexes: Array.from({length: slice.length}, (_, k) => i + k) });
                for (let k = i; k < j; k++) used[k] = true;
            }
        }
    }
    return sets;
}

function getSetPoints(set) {
    return set.tiles.length * 10;
}

// ------------------------------
// === ARAYÜZ ===

function renderIstaka(){
    const istakaDiv = document.getElementById('istaka');
    istakaDiv.innerHTML = '';
    istaka.forEach((tile, idx) => {
        const el = document.createElement('div');
        el.className = 'tile istaka';
        el.style.background = colorCodes[tile.color];
        el.style.color = tile.color === 'Siyah' ? '#fff' : '#222';
        el.innerText = isJoker(tile) ? "🃏" : tile.number;
        el.title = isJoker(tile) ? "Joker" : tile.color + ' ' + tile.number;
        el.setAttribute('draggable', String(!isChangingStones));

        // Taş değiştirme modunda taş seçimi
        if (isChangingStones) {
            el.classList.add('selectable');
            if (selectedForChange.includes(idx)) {
                el.classList.add('selected');
            }
            el.onclick = () => {
                if (selectedForChange.includes(idx)) {
                    selectedForChange = selectedForChange.filter(i => i !== idx);
                } else {
                    if (selectedForChange.length < 5) selectedForChange.push(idx);
                }
                renderIstaka();
                renderChangeStonesArea();
            };
        } else {
            el.onclick = null;
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
            el.addEventListener('touchstart', (e) => handleTouchStart(e, tile, idx, 'istaka'));
        }
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
        el.innerText = isJoker(tile) ? "🃏" : tile.number;
        el.title = isJoker(tile) ? "Joker" : tile.color + ' ' + tile.number;
        el.setAttribute('draggable', 'true');
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
        el.addEventListener('touchstart', (e) => handleTouchStart(e, tile, idx, 'board'));
        boardDiv.appendChild(el);
    });
}

function setupDroppableAreas() {
    const boardDiv = document.getElementById('board');
    boardDiv.addEventListener('dragover', (e) => {
        if (isTouchDragging || isChangingStones) return;
        e.preventDefault();
        boardDiv.classList.add('drag-over');
    });
    boardDiv.addEventListener('dragleave', (e) => {
        if (isTouchDragging || isChangingStones) return;
        boardDiv.classList.remove('drag-over');
    });
    boardDiv.addEventListener('drop', (e) => {
        if (isTouchDragging || isChangingStones) return;
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

    const istakaDiv = document.getElementById('istaka');
    istakaDiv.addEventListener('dragover', (e) => {
        if (isTouchDragging || isChangingStones) return;
        e.preventDefault();
        istakaDiv.classList.add('drag-over');
    });
    istakaDiv.addEventListener('dragleave', (e) => {
        if (isTouchDragging || isChangingStones) return;
        istakaDiv.classList.remove('drag-over');
    });
    istakaDiv.addEventListener('drop', (e) => {
        if (isTouchDragging || isChangingStones) return;
        e.preventDefault();
        istakaDiv.classList.remove('drag-over');
        if (dragSource && dragFrom === 'board' && board.length >= dragIndex) {
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

// ---- TOUCH DRAG ---------------------------------------------------
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
    ghost.innerText = isJoker(tile) ? "🃏" : tile.number;
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

// ---------------------------------------------------------------

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
    if (score >= levelTargets[level - 1]) {
        if (level === levelMax) {
            showMessage(`Tebrikler! 10. seviyeyi de tamamladın. Oyun başa döndü!`, 3000);
            setTimeout(() => {
                level = 1; score = 0;
                startGame();
            }, 3200);
        } else {
            showMessage(`Level ${level} tamamlandı! Şimdi ${level + 1}. seviyedesin!`, 2500);
            setTimeout(() => {
                level++;
                score = 0;
                startGame();
            }, 2000);
        }
    }
}

function handleOpenSet() {
    if (board.length < 3) {
        showMessage("En az 3 taş açmalısın!", 1700);
        return;
    }
    let sets = findAllSets(board);
    if (sets.length === 0) {
        showMessage("Açılacak uygun set yok!", 1700);
        return;
    }
    let totalPoints = 0;
    let allIndexes = [];
    for (let set of sets) {
        totalPoints += getSetPoints(set);
        allIndexes = allIndexes.concat(set.indexes);
    }
    updateScore(totalPoints);
    showMessage(`${sets.length} set açıldı, +${totalPoints} puan!`, 1700);

    allIndexes = Array.from(new Set(allIndexes));
    allIndexes.sort((a,b)=>b-a).forEach(idx => board.splice(idx,1));

    let toplamTas = istaka.length + board.length;
    let eksik = istakaSize - toplamTas;
    let newTiles = drawFromPool(eksik);
    istaka = istaka.concat(newTiles);
    renderIstaka();
    renderBoard();
    renderChangeStonesArea();
}

function renderTargetScore(){
    document.getElementById('target-score').innerText = `Seviye: ${level} / 10 — Hedef Puan: ${levelTargets[level-1]}`;
}

// === TAŞ DEĞİŞTİRME ALANI ===
function renderChangeStonesArea() {
    const countDiv = document.getElementById('change-stones-count');
    countDiv.innerText = `(${changeStonesRemaining} hak)`;
    const btn = document.getElementById('change-stones-btn');
    btn.disabled = changeStonesRemaining === 0 || isChangingStones || pool.length === 0;
    const confirmBtn = document.getElementById('confirm-change-btn');
    confirmBtn.style.display = isChangingStones ? 'inline-block' : 'none';
    confirmBtn.disabled = selectedForChange.length === 0;
}

function startGame(){
    pool = createPool();
    istaka = [];
    board = [];
    changeStonesRemaining = changeStonesMax;
    isChangingStones = false;
    selectedForChange = [];
    istaka = drawFromPool(istakaSize);
    renderIstaka();
    renderBoard();
    renderTargetScore();
    renderChangeStonesArea();
    document.getElementById('score').innerText = `Puan: ${score}`;
    showMessage("Taşları sürükleyerek aç, el açınca puan kazanıp yeni taş alırsın.", 1800);
    setupChangeStonesEvents();
}

// --- Taş değiştirme tuşları eventleri ---
function setupChangeStonesEvents() {
    const changeBtn = document.getElementById('change-stones-btn');
    const confirmBtn = document.getElementById('confirm-change-btn');

    let newChangeBtn = changeBtn.cloneNode(true);
    changeBtn.parentNode.replaceChild(newChangeBtn, changeBtn);

    let newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    document.getElementById('change-stones-btn').onclick = () => {
        if (changeStonesRemaining > 0 && !isChangingStones && pool.length > 0) {
            isChangingStones = true;
            selectedForChange = [];
            renderIstaka();
            renderChangeStonesArea();
        }
    };
    document.getElementById('confirm-change-btn').onclick = () => {
        if (selectedForChange.length === 0) return;
        let newTiles = drawFromPool(selectedForChange.length);
        selectedForChange.forEach((idx, i) => {
            istaka[idx] = newTiles[i] ?? istaka[idx]; // havuz biterse eski taş kalır
        });
        changeStonesRemaining--;
        isChangingStones = false;
        selectedForChange = [];
        renderIstaka();
        renderChangeStonesArea();
        showMessage("Seçilen taşlar değiştirildi.", 1400);
    };
}

// === HAVUZ MODALI ===
function renderPoolModal() {
    const poolListDiv = document.getElementById('pool-list');
    let counts = {};
    for (const t of pool) {
        let key = t.color + "-" + t.number;
        counts[key] = (counts[key] || 0) + 1;
    }
    let order = ["Kırmızı","Siyah","Mavi","Yeşil"];
    let html = "";
    for (const c of order) {
        for (let n = 1; n <= 13; n++) {
            let key = c + "-" + n;
            let adet = counts[key] || 0;
            if (adet > 0) {
                html += `
                <div class="pool-tile-outer">
                    <div class="pool-tile ${c.toLowerCase()}">${n}</div>
                    <div class="pool-tile-kalan">Kalan: ${adet}</div>
                </div>`;
            }
        }
    }
    let jokerCount = pool.filter(t=>t.color==="Joker").length;
    if (jokerCount > 0) {
        html += `
        <div class="pool-tile-outer">
            <div class="pool-tile joker">🃏</div>
            <div class="pool-tile-kalan">Kalan: ${jokerCount}</div>
        </div>`;
    }
    poolListDiv.innerHTML = html || "<i>Havuzda hiç taş kalmadı.</i>";
}
function setupPoolModalEvents() {
    const modal = document.getElementById('pool-modal');
    document.getElementById('show-pool-btn').onclick = () => {
        renderPoolModal();
        modal.style.display = "block";
    };
    document.getElementById('close-pool-modal').onclick = () => {
        modal.style.display = "none";
    };
    window.addEventListener('click', function(evt) {
        if (evt.target === modal) modal.style.display = "none";
    });
}

// === BAŞLAT ===
window.onload = function() {
    startGame();
    setupDroppableAreas();
    document.getElementById('open-set-btn').onclick = handleOpenSet;
    setupPoolModalEvents();
};