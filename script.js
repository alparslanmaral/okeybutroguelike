// === OKEY OYUNU TAM SÜRÜM (DÜZELTİLMİŞ WRAP-AROUND SERİ SET DESTEĞİ İLE) ===

const colorCodesForImg = ['kirmizi','siyah','yesil','mavi'];
const numbersForImg = [1,2,3,4,5,6,7,8,9,10,11,12,13];
const allTileImages = [];
colorCodesForImg.forEach(color => {
  numbersForImg.forEach(num => {
    allTileImages.push(`img/${color}-${num}.webp`);
  });
});
allTileImages.push("img/joker.webp");

function preloadTileImages() {
  return Promise.all(allTileImages.map(src => new Promise(res => {
    // Eğer localStorage'da zaten varsa atla
    if (localStorage.getItem('tileImageLoaded_' + src)) return res();
    const img = new Image();
    img.src = src;
    img.onload = () => {
      localStorage.setItem('tileImageLoaded_' + src, '1');
      res();
    };
    img.onerror = () => res(); // hata olursa yine de devam
  })));
}

// Sürüm kontrolü, görselleri değiştirirsen cache temizler
const TILE_IMAGE_CACHE_VERSION = 'v1';
if (localStorage.getItem('tileImageCacheVersion') !== TILE_IMAGE_CACHE_VERSION) {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('tileImageLoaded_')) localStorage.removeItem(key);
  });
  localStorage.setItem('tileImageCacheVersion', TILE_IMAGE_CACHE_VERSION);
}

const colors = ['Kırmızı', 'Siyah', 'Yeşil', 'Mavi'];
const numbers = [1,2,3,4,5,6,7,8,9,10,11,12,13];
const istakaSize = 7;
const JOKER = { color: "Joker", number: 0 };

function getTileImage(tile) {
    if (tile.color === "Joker") return "img/joker.webp";
    const renk = tile.color
        .toLowerCase()
        .replace(/ı/g, "i")
        .replace(/ş/g, "s")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");
    return `img/${renk}-${tile.number}.webp`;
}

const levelTargets = [50, 120, 200, 300, 410, 570, 750, 900, 1200, 2000];
const levelMax = levelTargets.length;
let changeStonesMax = 10;
const openSetMax = 5;

let pool = [];
let istaka = [];
let board = [];
let score = 0;
let level = 1;
let changeStonesRemaining = changeStonesMax;
let openSetRemaining = openSetMax;
let isChangingStones = false;
let selectedForChange = [];
let gameOver = false;

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
    let jokerCount = 2;
    if (ownedMarketItems.includes("joker_upgrade")) jokerCount = 4;
    if (ownedMarketItems.includes("black_knight")) jokerCount = 0;
    for(let i=0; i<jokerCount; i++) arr.push({ ...JOKER });
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
// === KURALLAR (Joker Destekli ve WRAP-AROUND Serili) ===

function isConsecutiveSeries(tiles) {
    if (tiles.length < 3) return false;
    const color = tiles.find(t => !isJoker(t))?.color;
    if (!color) return false;
    if (!tiles.every(t => isJoker(t) || t.color === color)) return false;

    let nums = tiles.map(t => isJoker(t) ? null : t.number);
    let jokers = nums.filter(x => x === null).length;
    let realNums = [...new Set(nums.filter(x => x !== null))];
    if (realNums.length === 0) return false;

    // Tüm wrap-around serileri dene
    for (let start = 1; start <= 13; start++) {
        let seq = [];
        for (let i = 0; i < tiles.length; i++) {
            seq.push(((start + i - 1) % 13) + 1);
        }
        let missing = seq.filter(n => !realNums.includes(n)).length;
        if (missing === jokers) return true;
    }
    return false;
}

function isSameNumberGroup(tiles) {
    if (tiles.length < 3 || tiles.length > 5) return false;
    let realTiles = tiles.filter(t => !isJoker(t));
    const number = realTiles[0]?.number;
    if (!realTiles.every(t => t.number === number)) return false;
    let colorSet = new Set(realTiles.map(t => t.color));
    if (colorSet.size + tiles.filter(isJoker).length !== tiles.length) return false;
    return true;
}

// --- WRAP-AROUND destekli tüm serileri bulma fonksiyonu ---
function findAllSeriesSets(tiles, usedArr) {
    let sets = [];
    for (let color of colors) {
        // O renkten ve jokerden taşları çek
        let colorTiles = tiles.map((t, i) => ({...t, _idx: i})).filter((t, i) => (t.color === color || isJoker(t)) && !usedArr[t._idx]);
        if (colorTiles.length < 3) continue;
        let numbers = colorTiles.filter(t => !isJoker(t));
        let jokers = colorTiles.filter(t => isJoker(t));
        let uniqNumbers = [...new Set(numbers.map(t => t.number))];
        if (uniqNumbers.length === 0) continue;

        for (let len = colorTiles.length; len >= 3; len--) {
            for (let start = 1; start <= 13; start++) {
                let seq = [];
                for (let i = 0; i < len; i++) {
                    seq.push(((start + i - 1) % 13) + 1);
                }
                let missing = seq.filter(n => !uniqNumbers.includes(n)).length;
                if (missing <= jokers.length) {
                    // Seti oluştur
                    let foundTiles = [];
                    let usedIdxs = [];
                    let jokerUsed = 0;
                    for (let n of seq) {
                        let idx = numbers.findIndex(t => t.number === n && !usedIdxs.includes(t._idx));
                        if (idx !== -1) {
                            foundTiles.push(numbers[idx]);
                            usedIdxs.push(numbers[idx]._idx);
                        } else if (jokerUsed < jokers.length) {
                            foundTiles.push(jokers[jokerUsed]);
                            jokerUsed++;
                        }
                    }
                    // Aynı seti tekrar ekleme
                    let setAlreadyExists = sets.some(s =>
                        s.tiles.length === foundTiles.length &&
                        s.tiles.every((t, i) => t._idx === foundTiles[i]._idx)
                    );
                    if (foundTiles.length === len && !setAlreadyExists) {
                        sets.push({
                            type: 'seri',
                            tiles: foundTiles,
                            indexes: foundTiles.map(t => t._idx)
                        });
                    }
                }
            }
        }
    }
    return sets;
}

function findAllSets(boardTiles) {
    // Her taşın bir kez kullanılmasını garanti edecek şekilde, maksimum kapsayan (en fazla taşlı) set kombinasyonunu bulur.
    function allSetCombos(tiles, used, soFar) {
        let best = soFar.slice();
        let anyFound = false;

        // 1. Grup setleri (aynı sayı, farklı renk, 3-5 taş)
        for (let groupLen = 5; groupLen >= 3; groupLen--) {
            let candidates = tiles.map((t, i) => ({...t, _idx: i}))
                .filter(t => !used[t._idx] && !isJoker(t));
            let uniqueNumbers = [...new Set(candidates.map(t => t.number))];
            for (let num of uniqueNumbers) {
                let groupTiles = [];
                let colorsUsed = new Set();
                for (let t of candidates) {
                    if (t.number === num && !isJoker(t) && !colorsUsed.has(t.color)) {
                        groupTiles.push(t);
                        colorsUsed.add(t.color);
                    }
                }
                let jokers = tiles.map((t, i) => ({...t, _idx: i}))
                    .filter(t => !used[t._idx] && isJoker(t));
                for (let j = 0; j < jokers.length && groupTiles.length < groupLen; j++) {
                    groupTiles.push(jokers[j]);
                }
                if (groupTiles.length === groupLen) {
                    let nextUsed = used.slice();
                    for (let t of groupTiles) nextUsed[t._idx] = true;
                    let candidate = soFar.concat([{
                        type: 'grup',
                        tiles: groupTiles,
                        indexes: groupTiles.map(t => t._idx)
                    }]);
                    let res = allSetCombos(tiles, nextUsed, candidate);
                    if (totalUsed(res) > totalUsed(best)) best = res;
                    anyFound = true;
                }
            }
        }

        // 2. Seri setleri (aynı renk/wrap-around, ardışık, en az 3 taş)
        for (let color of colors) {
            let colorTiles = tiles.map((t, i) => ({...t, _idx: i}))
                .filter(t => (t.color === color || isJoker(t)) && !used[t._idx]);
            if (colorTiles.length < 3) continue;
            let numbers = colorTiles.filter(t => !isJoker(t));
            let jokers = colorTiles.filter(t => isJoker(t));
            let uniqNumbers = [...new Set(numbers.map(t => t.number))];
            if (uniqNumbers.length === 0) continue;

            for (let len = colorTiles.length; len >= 3; len--) {
                for (let start = 1; start <= 13; start++) {
                    let seq = [];
                    for (let i = 0; i < len; i++) {
                        seq.push(((start + i - 1) % 13) + 1);
                    }
                    let missing = seq.filter(n => !uniqNumbers.includes(n)).length;
                    if (missing <= jokers.length) {
                        let foundTiles = [];
                        let usedIdxs = [];
                        let jokerUsed = 0;
                        for (let n of seq) {
                            let idx = numbers.findIndex(t => t.number === n && !usedIdxs.includes(t._idx));
                            if (idx !== -1) {
                                foundTiles.push(numbers[idx]);
                                usedIdxs.push(numbers[idx]._idx);
                            } else if (jokerUsed < jokers.length) {
                                foundTiles.push(jokers[jokerUsed]);
                                jokerUsed++;
                            }
                        }
                        // Aynı seti tekrar deneme
                        let alreadyUsed = foundTiles.some(t => used[t._idx]);
                        if (foundTiles.length === len && !alreadyUsed) {
                            let nextUsed = used.slice();
                            for (let t of foundTiles) nextUsed[t._idx] = true;
                            let candidate = soFar.concat([{
                                type: 'seri',
                                tiles: foundTiles,
                                indexes: foundTiles.map(t => t._idx)
                            }]);
                            let res = allSetCombos(tiles, nextUsed, candidate);
                            if (totalUsed(res) > totalUsed(best)) best = res;
                            anyFound = true;
                        }
                    }
                }
            }
        }

        return best;
    }
    function totalUsed(sets) {
        // Kaç taş kapsandı
        let all = [];
        sets.forEach(s => all = all.concat(s.indexes));
        return new Set(all).size;
    }

    // Her taş bir kere kullanılmalı, maksimum toplam kapsama aranmalı
    let used = Array(boardTiles.length).fill(false);
    return allSetCombos(boardTiles, used, []);
}
function getSetPoints(set) {
    return set.tiles.length * 10;
}

// ------------------------------
// === ARAYÜZ ===

function renderIstaka() {
    const istakaDiv = document.getElementById('istaka');
    istakaDiv.innerHTML = '';
    istaka.forEach((tile, idx) => {
        const el = document.createElement('div');
        el.className = 'tile istaka';

        // Sallanma animasyonu
        if (isChangingStones) el.classList.add('shake');
        // Seçili taş yukarı kalksın
        if (selectedForChange.includes(idx)) el.classList.add('selected');

        el.title = isJoker(tile) ? "Joker" : tile.color + ' ' + tile.number;
        el.setAttribute('draggable', String(!isChangingStones && !gameOver));

        // Görsel ekle
        el.innerHTML = '';
        const img = document.createElement('img');
        img.src = getTileImage(tile);
        img.alt = isJoker(tile) ? 'Joker' : `${tile.color} ${tile.number}`;
        img.className = 'tile-img';
        el.appendChild(img);

        if (isChangingStones) {
            el.classList.add('selectable');
            el.onclick = () => {
                if (selectedForChange.includes(idx)) {
                    selectedForChange = selectedForChange.filter(i => i !== idx);
                } else {
                    if (selectedForChange.length < 5) selectedForChange.push(idx);
                }
                renderIstaka();
                renderChangeStonesArea();
                renderOpenSetArea();
            };
        } else {
            el.onclick = null;
            el.addEventListener('dragstart', (e) => {
                if (isTouchDragging || gameOver) return;
                dragSource = tile;
                dragIndex = idx;
                dragFrom = 'istaka';
                setTimeout(() => el.classList.add('dragging'), 0);
            });
            el.addEventListener('dragend', (e) => {
                if (isTouchDragging || gameOver) return;
                el.classList.remove('dragging');
                dragSource = null;
                dragIndex = null;
                dragFrom = null;
                removeAllDragOver();
            });
            el.addEventListener('touchstart', (e) => {
                if (gameOver) return;
                handleTouchStart(e, tile, idx, 'istaka');
            });
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
        el.title = isJoker(tile) ? "Joker" : tile.color + ' ' + tile.number;
        el.setAttribute('draggable', String(!gameOver));

        // Görsel ekle
        el.innerHTML = '';
        const img = document.createElement('img');
        img.src = getTileImage(tile);
        img.alt = isJoker(tile) ? 'Joker' : `${tile.color} ${tile.number}`;
        img.className = 'tile-img';
        el.appendChild(img);

        el.addEventListener('dragstart', (e) => {
            if (isTouchDragging || gameOver) return;
            dragSource = tile;
            dragIndex = idx;
            dragFrom = 'board';
            setTimeout(() => el.classList.add('dragging'), 0);
        });
        el.addEventListener('dragend', (e) => {
            if (isTouchDragging || gameOver) return;
            el.classList.remove('dragging');
            dragSource = null;
            dragIndex = null;
            dragFrom = null;
            removeAllDragOver();
        });
        el.addEventListener('touchstart', (e) => {
            if (gameOver) return;
            handleTouchStart(e, tile, idx, 'board');
        });
        boardDiv.appendChild(el);
    });
}
function setupDroppableAreas() {
    const boardDiv = document.getElementById('board');
    boardDiv.addEventListener('dragover', (e) => {
        if (isTouchDragging || isChangingStones || gameOver) return;
        e.preventDefault();
        boardDiv.classList.add('drag-over');
    });
    boardDiv.addEventListener('dragleave', (e) => {
        if (isTouchDragging || isChangingStones || gameOver) return;
        boardDiv.classList.remove('drag-over');
    });
    boardDiv.addEventListener('drop', (e) => {
        if (isTouchDragging || isChangingStones || gameOver) return;
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
        if (isTouchDragging || isChangingStones || gameOver) return;
        e.preventDefault();
        istakaDiv.classList.add('drag-over');
    });
    istakaDiv.addEventListener('dragleave', (e) => {
        if (isTouchDragging || isChangingStones || gameOver) return;
        istakaDiv.classList.remove('drag-over');
    });
    istakaDiv.addEventListener('drop', (e) => {
        if (isTouchDragging || isChangingStones || gameOver) return;
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
    ghost.innerHTML = '';
    const ghostImg = document.createElement('img');
    ghostImg.src = getTileImage(tile);
    ghostImg.alt = isJoker(tile) ? 'Joker' : `${tile.color} ${tile.number}`;
    ghostImg.className = 'tile-img';
    ghost.appendChild(ghostImg);
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
    if (gameOver) return;
    if (openSetRemaining <= 0) {
        showMessage("El açma hakkın bitti!", 1700);
        checkGameOverAfterRights();
        return;
    }
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
    openSetRemaining--;
    renderOpenSetArea();
    renderIstaka();
    renderBoard();
    renderChangeStonesArea();
    if (openSetRemaining === 0) {
        checkGameOverAfterRights();
    }
}
function renderTargetScore(){
    document.getElementById('target-score').innerText = `Seviye: ${level} / 10 — Hedef Puan: ${levelTargets[level-1]}`;
}
function checkGameOverAfterRights() {
    // Eğer seviye tamamlandıysa kaybettirme!
    if (score >= levelTargets[level - 1]) return;
    let allHand = istaka.slice();
    if (findAllSets(allHand).length === 0) {
        showGameOver();
    }
}
function showGameOver() {
    gameOver = true;
    document.getElementById('gameover-modal').style.display = "block";
    showMessage("Oyunu kaybettin!", 0);
}
function hideGameOver() {
    gameOver = false;
    document.getElementById('gameover-modal').style.display = "none";
    level = 1;
    score = 0;
    startGame();
}

// --- Taş değiştirme tuşları eventleri (onayla & iptal) ---
function setupChangeStonesEvents() {
    const changeBtn = document.getElementById('change-stones-btn');
    const confirmBtn = document.getElementById('confirm-change-btn');
    const cancelBtn = document.getElementById('cancel-change-btn');

    let newChangeBtn = changeBtn.cloneNode(true);
    changeBtn.parentNode.replaceChild(newChangeBtn, changeBtn);

    let newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    let newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    document.getElementById('change-stones-btn').onclick = () => {
        if (changeStonesRemaining > 0 && !isChangingStones && pool.length > 0 && !gameOver) {
            isChangingStones = true;
            selectedForChange = [];
            renderIstaka();
            renderChangeStonesArea();
            renderOpenSetArea();
        }
    };
    document.getElementById('confirm-change-btn').onclick = () => {
        if (selectedForChange.length === 0) return;
        let newTiles = drawFromPool(selectedForChange.length);
        selectedForChange.forEach((idx, i) => {
            istaka[idx] = newTiles[i] ?? istaka[idx];
        });
        changeStonesRemaining--;
        isChangingStones = false;
        selectedForChange = [];
        renderIstaka();
        renderChangeStonesArea();
        renderOpenSetArea();
        showMessage("Seçilen taşlar değiştirildi.", 1400);
        if (changeStonesRemaining === 0) {
            checkGameOverAfterRights();
        }
    };

    document.getElementById('cancel-change-btn').onclick = () => {
        isChangingStones = false;
        selectedForChange = [];
        renderIstaka();
        renderChangeStonesArea();
        renderOpenSetArea();
        showMessage("Taş değiştirme iptal edildi.", 1200);
    };
}

function renderChangeStonesArea() {
    const btn = document.getElementById('change-stones-btn');
    const confirmBtn = document.getElementById('confirm-change-btn');
    const cancelBtn = document.getElementById('cancel-change-btn');
    btn.disabled = changeStonesRemaining === 0 || isChangingStones || pool.length === 0 || gameOver;
    confirmBtn.style.display = isChangingStones ? 'inline-block' : 'none';
    confirmBtn.disabled = selectedForChange.length === 0;
    cancelBtn.style.display = isChangingStones ? 'inline-block' : 'none';
}

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

function renderOpenSetArea() {
    const el = document.getElementById('open-set-rights');
    if (el) {
        if (openSetRemaining > 1) el.innerText = `Kalan el açma hakkı: ${openSetRemaining} adet`;
        else if (openSetRemaining === 1) el.innerText = `Kalan el açma hakkı: 1 adet (son hak!)`;
        else el.innerText = `El açma hakkın kalmadı.`;
    }
    const hak = document.getElementById('change-stones-hak');
    if (hak) hak.innerText = `(Kalan taş değiştirme hakkı: ${changeStonesRemaining})`;
}

function renderTargetScore(){
    document.getElementById('target-score').innerText = `Seviye: ${level} / 10 — Hedef Puan: ${levelTargets[level-1]}`;
}

function startGame() {
    pool = createPool();
    istaka = [];
    board = [];
    changeStonesMax = getChangeStonesMax(); // <--- güncel taş değiştirme hakkı
    changeStonesRemaining = changeStonesMax;
    openSetRemaining = openSetMax;
    isChangingStones = false;
    selectedForChange = [];
    gameOver = false;
    istaka = drawFromPool(istakaSize);
    renderIstaka();
    renderBoard();
    renderTargetScore();
    renderChangeStonesArea();
    renderOpenSetArea();
    renderChips();
    document.getElementById('score').innerText = `Puan: ${score}`;
    showMessage("Taşları sürükleyerek aç, el açınca puan kazanıp yeni taş alırsın.", 1800);
    setupChangeStonesEvents();
}

window.onload = function() {
    document.getElementById('preloader').style.display = 'flex';
    preloadTileImages().then(() => {
        document.getElementById('preloader').style.display = 'none';

        startGame();
        setupDroppableAreas();
        document.getElementById('open-set-btn').onclick = handleOpenSet;
        setupPoolModalEvents();
        document.getElementById('restart-btn').onclick = hideGameOver;
    });
};

// CHIP/MARKET DEĞİŞKENLERİ
let userChips = 0; // Çip bakiyesi
let ownedMarketItems = []; // Alınan market ürünleri (key listesi)
let marketOpen = false;
let nextMarketItems = [];
const ALL_MARKET_ITEMS = [
    { key: "red_boost", name: "Kırmızı Yükseltmesi", price: 15, desc: "Kırmızı taşlar kullanılarak açılan ellerde kullanılan kırmızı taş başına 20 puan kazanılır." },
    { key: "black_boost", name: "Siyah Yükseltmesi", price: 15, desc: "Siyah taşlar kullanılarak açılan ellerde kullanılan siyah taş başına 20 puan kazanılır." },
    { key: "green_boost", name: "Yeşil Yükseltmesi", price: 15, desc: "Yeşil taşlar kullanılarak açılan ellerde kullanılan yeşil taş başına 20 puan kazanılır." },
    { key: "blue_boost", name: "Mavi Yükseltmesi", price: 15, desc: "Mavi taşlar kullanılarak açılan ellerde kullanılan mavi taş başına 20 puan kazanılır." },
    { key: "red_set", name: "Kırmızı Set", price: 10, desc: "Sadece kırmızı taşlar kullanılarak açılan ellerde ekstra 70 puan kazanılır." },
    { key: "black_set", name: "Siyah Set", price: 10, desc: "Sadece siyah taşlar kullanılarak açılan ellerde ekstra 70 puan kazanılır." },
    { key: "green_set", name: "Yeşil Set", price: 10, desc: "Sadece yeşil taşlar kullanılarak açılan ellerde ekstra 70 puan kazanılır." },
    { key: "blue_set", name: "Mavi Set", price: 10, desc: "Sadece mavi taşlar kullanılarak açılan ellerde ekstra 70 puan kazanılır." },
    { key: "three_power", name: "Üçlü Olsun, Güçlü Olsun", price: 6, desc: "3 sayısındaki taşlar kullanılarak açılan ellerde kullanılan 3 sayılı taş başına 20 puan kazanılır." },
    { key: "five_power", name: "Beşi Bir Arada", price: 6, desc: "5 sayısındaki taşlar kullanılarak açılan ellerde kullanılan 5 sayılı taş başına 20 puan kazanılır." },
    { key: "joker_upgrade", name: "Joker Yükseltmesi", price: 20, desc: "Havuzdaki Joker sayısı 4'e çıkar." },
    { key: "seven_legend", name: "Birimiz Hepimiz, Hepimiz Birimiz", price: 10, desc: "7 taşlık bir el açtığında ekstra 1000 puan kazanılır." },
    { key: "joker_dream", name: "Joker'in Rüyası", price: 8, desc: "En az 2 Joker kullanılarak açılan ellerde ekstra 50 puan kazanılır." },
    { key: "last_chance", name: "Günü Kurtar", price: 10, desc: "Hiç taş değiştirme hakkı yokken el açılırsa ekstra 50 puan kazanılır." },
    { key: "black_knight", name: "Kara Şövalye Yükseliyor", price: 5, desc: "Havuzdaki Joker sayısı 0 olur ama açılan her elde ekstra 20 puan kazanılır." },
    { key: "justice", name: "Hak, Hukuk, Adalet!", price: 18, desc: "Taş değiştirme hakkını kalıcı olarak 5 artır." },
    { key: "harley", name: "Harley Quinn", price: 7, desc: "Joker kullanılarak açılan ellerde kullanılan her Joker başına 35 puan kazanılacak." },
    { key: "super_boost", name: "Süper Yükseltme", price: 20, desc: "Açılan her elden ekstra 45 puan kazanılacak." },
    { key: "alex", name: "Alex De Souza", price: 6, desc: "10 sayısındaki taşlar kullanılarak açılan ellerde (renk fark etmez) kullanılan 10 sayılı taş başına 20 puan kazanılacak." },
    { key: "alone", name: "Yalnızım Dostlarım", price: 12, desc: "Tek sayı taşlar kullanılarak açılan ellerde (renk fark etmez) kullanılan tek sayılı taş başına 10 puan kazanılacak." },
    { key: "sugar_daddy", name: "Sugar Daddy", price: 5, desc: "Her el açtığında fazladan 1 çip kazanılacak." }
];

function getChangeStonesMax() {
    let base = 10;
    if (ownedMarketItems.includes("justice")) base += 5;
    return base;
}

// Çip gösterimi
function renderChips() {
    if (document.getElementById('chip-count'))
        document.getElementById('chip-count').innerHTML = `Çip: ${userChips} <span class="chip-emoji">🟡</span>`;
}

// Market ürünleri arayüzü
function renderMarket() {
    const marketDiv = document.getElementById('market-items');
    const chipDiv = document.getElementById('market-chip-count');
    const ownedDiv = document.getElementById('market-owned-list');
    marketDiv.innerHTML = "";
    chipDiv.innerHTML = `Çip: ${userChips} <span class="chip-emoji">🟡</span>`;
    nextMarketItems.forEach(key => {
        const item = ALL_MARKET_ITEMS.find(i => i.key === key);
        if (!item) return;
        const owned = ownedMarketItems.includes(key);
        const itemDiv = document.createElement('div');
        itemDiv.className = "market-item" + (owned ? " owned" : "");
        itemDiv.innerHTML = `
            <div class="market-item-title">${item.name}</div>
            <div class="market-item-desc">${item.desc}</div>
            <div class="market-item-buy">
                <span class="market-price">${item.price} <span class="chip-emoji">🟡</span></span>
                <button class="btn buy-btn" ${owned ? "disabled" : ""} data-key="${key}">
                    ${owned ? "Satın Alındı" : "Satın Al"}
                </button>
            </div>
        `;
        marketDiv.appendChild(itemDiv);
    });
    marketDiv.querySelectorAll(".buy-btn").forEach(btn => {
        btn.onclick = () => {
            buyMarketItem(btn.getAttribute("data-key"));
        };
    });

    // Owned Upgrades listesi ve sat butonu
    ownedDiv.innerHTML = '';
    if (ownedMarketItems.length > 0) {
        ownedMarketItems.forEach(key => {
            const item = ALL_MARKET_ITEMS.find(i => i.key === key);
            if (!item) return;
            const row = document.createElement('div');
            row.className = 'market-owned-row';
            row.innerHTML = `
                <span class="market-owned-name">${item.name}</span>
                <button class="btn sell-btn" data-key="${key}">Sat (+${Math.floor(item.price/2)} 🟡)</button>
            `;
            row.querySelector('.sell-btn').onclick = () => {
                userChips += Math.floor(item.price/2);
                ownedMarketItems = ownedMarketItems.filter(x => x !== key);
                renderMarket();
                renderChips();
            };
            ownedDiv.appendChild(row);
        });
    } else {
        ownedDiv.innerHTML = '<i>Hiç geliştirmen yok.</i>';
    }

    renderChips();
}

function getRandomMarketItems() {
    const available = ALL_MARKET_ITEMS.filter(item =>
        !ownedMarketItems.includes(item.key)
    );
    let shuffled = available.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3).map(item => item.key); // SADECE KEY'ler döner
}
function openMarket() {
    marketOpen = true;
    nextMarketItems = getRandomMarketItems();
    renderMarket();
    document.getElementById('market-modal').style.display = "block";
}
function closeMarket() {
    marketOpen = false;
    nextMarketItems = [];
    document.getElementById('market-modal').style.display = "none";
    level++;
    score = 0;
    startGame();
}
function buyMarketItem(key) {
    const item = ALL_MARKET_ITEMS.find(i => i.key === key);
    if (!item) return;
    if (userChips < item.price) {
        showMessage("Yeterli çipin yok!", 1600);
        return;
    }
    userChips -= item.price;
    ownedMarketItems.push(item.key);
    renderMarket();
    renderChips();

    // --- Buraya EKLE ---
    changeStonesMax = getChangeStonesMax();
    changeStonesRemaining = changeStonesMax;
    renderChangeStonesArea();
}
function resetGameProgress() {
    userChips = 0;
    ownedMarketItems = [];
    renderChips();
}

// Market bonus puan hesaplama
function calcSetBonusPoints(boardSnapshot) {
    let totalBonus = 0;
    let items = ownedMarketItems;
    let colorCount = { "Kırmızı": 0, "Siyah": 0, "Yeşil": 0, "Mavi": 0 };
    let numberCount = {};
    let jokerCount = 0;
    for (const t of boardSnapshot) {
        if (isJoker(t)) jokerCount++;
        else {
            colorCount[t.color] = (colorCount[t.color]||0) + 1;
            numberCount[t.number] = (numberCount[t.number]||0) + 1;
        }
    }
    if (items.includes("red_boost")) totalBonus += 20 * (colorCount["Kırmızı"]||0);
    if (items.includes("black_boost")) totalBonus += 20 * (colorCount["Siyah"]||0);
    if (items.includes("green_boost")) totalBonus += 20 * (colorCount["Yeşil"]||0);
    if (items.includes("blue_boost")) totalBonus += 20 * (colorCount["Mavi"]||0);

    const allSameColor = (col) => boardSnapshot.every(t => isJoker(t) || t.color === col);
    if (items.includes("red_set") && allSameColor("Kırmızı")) totalBonus += 70;
    if (items.includes("black_set") && allSameColor("Siyah")) totalBonus += 70;
    if (items.includes("green_set") && allSameColor("Yeşil")) totalBonus += 70;
    if (items.includes("blue_set") && allSameColor("Mavi")) totalBonus += 70;

    if (items.includes("three_power") && numberCount[3]) totalBonus += 20 * numberCount[3];
    if (items.includes("five_power") && numberCount[5]) totalBonus += 20 * numberCount[5];

    if (items.includes("seven_legend") && boardSnapshot.length === 7) totalBonus += 1000;
    if (items.includes("joker_dream") && jokerCount >= 2) totalBonus += 50;
    if (items.includes("last_chance") && changeStonesRemaining === 0) totalBonus += 50;
    if (items.includes("black_knight")) totalBonus += 20;

    // --- Yeni Market Ürünleri ---
    // Harley Quinn: Joker ile açılan ellerde her joker başına 35 puan
    if (items.includes("harley") && jokerCount > 0) totalBonus += 35 * jokerCount;
    // Süper Yükseltme: Açılan her elden +45 puan
    if (items.includes("super_boost")) totalBonus += 45;
    // Alex De Souza: 10 sayılı taş başına 20 puan
    if (items.includes("alex") && numberCount[10]) totalBonus += 20 * numberCount[10];
    // Yalnızım Dostlarım: Tek sayı taş başına 10 puan
    if (items.includes("alone")) {
        let oddCount = Object.keys(numberCount).filter(n=>parseInt(n)%2===1).reduce((acc, n)=>acc+numberCount[n],0);
        totalBonus += 10 * oddCount;
    }
    return totalBonus;
}
// MARKET & ÇİP SİSTEMİ EKLEMESİ SONU

// === MARKETLİ UPDATE SCORE FONKSİYONU (orijinali silme, sadece override et) ===
const _originalUpdateScore = updateScore;
updateScore = function(points) {
    score += points;
    document.getElementById('score').innerText = `Puan: ${score}`;
    if (score >= levelTargets[level - 1]) {
        let chipWin = 15 + 2 * openSetRemaining;
        userChips += chipWin;
        renderChips();
        if (level === levelMax) {
            showFinalModal(); // Final ekranı aç
        } else {
            showMessage(`Level ${level} tamamlandı! Marketten alışveriş yapabilirsin!`, 2100);
            setTimeout(() => openMarket(), 1300);
        }
    }
}

// === MARKETLİ handleOpenSet (bonus puanları dahil) ===
const _originalHandleOpenSet = handleOpenSet;
handleOpenSet = function() {
    if (gameOver) return;
    if (openSetRemaining <= 0) {
        showMessage("El açma hakkın bitti!", 1700);
        checkGameOverAfterRights();
        return;
    }
    if (board.length < 3) {
        showMessage("En az 3 taş açmalısın!", 1700);
        return;
    }
    let sets = findAllSets(board);
    if (sets.length === 0) {
        showMessage("Açılacak uygun set yok!", 1700);
        return;
    }
    let boardSnapshot = board.slice();
    let totalPoints = 0;
    let allIndexes = [];
    for (let set of sets) {
        totalPoints += getSetPoints(set);
        allIndexes = allIndexes.concat(set.indexes);
    }
    let bonus = calcSetBonusPoints(boardSnapshot);

    // --- Sugar Daddy bonus çip ---
    if (ownedMarketItems.includes("sugar_daddy")) {
        userChips += 1;
        renderChips();
    }

    if (bonus > 0)
        showMessage(`Set(ler) açıldı! +${totalPoints} puan +${bonus} bonus!`, 1900);
    else
        showMessage(`${sets.length} set açıldı, +${totalPoints} puan!`, 1700);

    updateScore(totalPoints + bonus);

    allIndexes = Array.from(new Set(allIndexes));
    allIndexes.sort((a,b)=>b-a).forEach(idx => board.splice(idx,1));
    let toplamTas = istaka.length + board.length;
    let eksik = istakaSize - toplamTas;
    let newTiles = drawFromPool(eksik);
    istaka = istaka.concat(newTiles);
    openSetRemaining--;
    renderOpenSetArea();
    renderIstaka();
    renderBoard();
    renderChangeStonesArea();
    if (openSetRemaining === 0) {
        checkGameOverAfterRights();
    }
};

function showFinalModal() {
    document.getElementById('final-modal').style.display = "block";
}

// --- Oyun kaybedildiğinde market/çip sıfırla ---
const _originalShowGameOver = showGameOver;
showGameOver = function() {
    gameOver = true;
    document.getElementById('gameover-modal').style.display = "block";
    showMessage("Oyunu kaybettin! Çip ve market eşyaların sıfırlandı.", 0);
    resetGameProgress();
}

// --- startGame fonksiyonunda çip gösterimini de çağır ---
const _originalStartGame = startGame;
startGame = function() {
    changeStonesMax = getChangeStonesMax();
    pool = createPool();
    istaka = [];
    board = [];
    changeStonesRemaining = changeStonesMax;
    openSetRemaining = openSetMax;
    isChangingStones = false;
    selectedForChange = [];
    gameOver = false;
    istaka = drawFromPool(istakaSize);
    renderIstaka();
    renderBoard();
    renderTargetScore();
    renderChangeStonesArea();
    renderOpenSetArea();
    renderChips();
    document.getElementById('score').innerText = `Puan: ${score}`;
    showMessage("Taşları sürükleyerek aç, el açınca puan kazanıp yeni taş alırsın.", 1800);
    setupChangeStonesEvents();
}

// --- window.onload'da market modal butonunu bağla ---
const _originalOnLoad = window.onload;
window.onload = function() {
    if (_originalOnLoad) _originalOnLoad();
    // Market kapatma
    if (document.getElementById('market-close-btn')) {
        document.getElementById('market-close-btn').onclick = closeMarket;
    }

    // Baştan Başla butonu ve modalı
    if (document.getElementById('reset-game-btn')) {
        document.getElementById('reset-game-btn').onclick = function() {
            document.getElementById('reset-modal').style.display = 'block';
        };
    }
    if (document.getElementById('reset-no-btn')) {
        document.getElementById('reset-no-btn').onclick = function() {
            document.getElementById('reset-modal').style.display = 'none';
        };
    }
    if (document.getElementById('reset-yes-btn')) {
        document.getElementById('reset-yes-btn').onclick = function() {
            location.reload();
        };
    }
    window.addEventListener('click', function(evt) {
        const modal = document.getElementById('reset-modal');
        if (evt.target === modal) modal.style.display = "none";
    });

    if (document.getElementById('final-restart-btn')) {
        document.getElementById('final-restart-btn').onclick = function() {
            location.reload();
        };
    }
    // Aktif Yükseltmeler butonu ve modalı
    if (document.getElementById('show-upgrades-btn')) {
        document.getElementById('show-upgrades-btn').onclick = function() {
            document.getElementById('upgrades-modal').style.display = 'block';
        }
    }
    if (document.getElementById('close-upgrades-modal')) {
        document.getElementById('close-upgrades-modal').onclick = function() {
            document.getElementById('upgrades-modal').style.display = 'none';
        }
    }
    // Diğer gerekli buton ve modal bağlamalarını da burada yapabilirsin.

    renderChips();
};


// --- Havuzda Joker market etkisiyle değişmeli ---
const _originalCreatePool = createPool;
createPool = function() {
    let arr = [];
    for (const c of colors) {
        for (const n of numbers) {
            arr.push({ color: c, number: n });
            arr.push({ color: c, number: n });
        }
    }
    let jokerCount = 2;
    if (ownedMarketItems.includes("joker_upgrade")) jokerCount = 4;
    if (ownedMarketItems.includes("black_knight")) jokerCount = 0;
    for(let i=0; i<jokerCount; i++) arr.push({ ...JOKER });
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Aktif Yükseltmeler butonuna tıklayınca açılan modal fonksiyonu
function renderActiveUpgrades() {
    const upgradesDiv = document.getElementById('active-upgrades-list');
    if (!ownedMarketItems.length) {
        upgradesDiv.innerHTML = '<i>Şu anda aktif bir yükseltme yok.</i>';
        return;
    }
    let html = '';
    ownedMarketItems.forEach(key => {
        const item = ALL_MARKET_ITEMS.find(i => i.key === key);
        if (!item) return;
        html += `
            <div class="market-item owned">
                <div class="market-item-title">${item.name}</div>
                <div class="market-item-desc">${item.desc}</div>
            </div>
        `;
    });
    upgradesDiv.innerHTML = html;
}

// Modal açma/kapama eventleri
function setupUpgradesModalEvents() {
    const modal = document.getElementById('upgrades-modal');
    document.getElementById('show-upgrades-btn').onclick = () => {
        renderActiveUpgrades();
        modal.style.display = "block";
    };
    document.getElementById('close-upgrades-modal').onclick = () => {
        modal.style.display = "none";
    };
    window.addEventListener('click', function(evt) {
        if (evt.target === modal) modal.style.display = "none";
    });
}

// window.onload içine şunu ekle:
const _originalOnLoad2 = window.onload;
window.onload = function() {
    if (_originalOnLoad2) _originalOnLoad2();
    setupUpgradesModalEvents();
};
