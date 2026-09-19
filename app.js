/*
 * app.js — F-01 계산·표시 함수 (R-01 정상 단계)
 * 계산은 전부 이 파일의 함수가 합니다. 화면에 쓰는 값을 손으로 계산해 넣지 않았습니다.
 * 구현 순서: R-01(이 파일) → R-02(빈값) → R-03(잘못된 입력) → R-04(데이터·저장 실패)
 */
var MEMO_KEY = 'f01_judgment_memo';

/* 변화율(%) = (뒤 - 앞) ÷ 앞 × 100, 소수 둘째 자리 반올림 */
function pctChange(from, to) {
  return Math.round(((to - from) / from) * 10000) / 100;
}

/* 이틀 등락률 두 개를 복리로 합친 누적 변화율(%) */
function compoundChange(a, b) {
  return Math.round(((1 + a / 100) * (1 + b / 100) - 1) * 10000) / 100;
}

/* 화면 표시: 부호(+ / −)와 % 를 붙임. 하락은 진짜 마이너스 기호(−) */
function fmtPct(n) {
  var sign = n > 0 ? '+' : (n < 0 ? '−' : '');
  return sign + Math.abs(n) + '%';
}

/* 화면 표시: 쉼표와 소수 둘째 자리 */
function fmtNum(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* 선택한 업종의 카드 내용을 만든다 (CARD_DATA 사용) */
function buildCard(sector) {
  var data = window.CARD_DATA;
  var s = data && data.sectors ? data.sectors[sector] : null;
  if (!s) { return { ok: false }; } /* 잘못된 업종 안내 문구는 R-03에서 구현 */
  var facts = s.facts.map(function (f) {
    var value = f.value;
    if (f.kind === 'daily2') {
      value = '3월 3일 ' + fmtPct(f.a) + ' → 3월 4일 ' + fmtPct(f.b) +
              ' (이틀 누적 ' + fmtPct(compoundChange(f.a, f.b)) + ')';
    }
    return { label: f.label, value: value, asOf: f.asOf, source: f.source, limit: f.limit };
  });
  return {
    ok: true,
    title: data.event + ', 이 업종은 어땠나요?',
    market: {
      label: data.market.label,
      pct: pctChange(data.market.prev, data.market.close),
      range: fmtNum(data.market.prev) + ' → ' + fmtNum(data.market.close),
      dateText: data.market.dateText,
      source: data.market.source,
      limit: data.market.limit
    },
    fx: {
      label: data.fx.label,
      pct: pctChange(data.fx.from, data.fx.to),
      range: fmtNum(data.fx.from) + ' → ' + fmtNum(data.fx.to) + '원',
      dateText: data.fx.dateText,
      source: data.fx.source,
      limit: data.fx.limit
    },
    facts: facts,
    unknown: s.unknown.slice()
  };
}

/* R-02 빈값 검사 — 안내 문구는 docs/requirements.md 의 정확한 문장 */
var MSG_SECTOR_EMPTY = '보유 업종을 먼저 골라 주세요.';
var MSG_Q1_EMPTY = '내 판단을 하나 골라 주세요.';
var MSG_Q2_EMPTY = '이유가 지금도 같은지 골라 주세요.';
var MSG_Q3_EMPTY = '이유를 한 줄로 적어 주세요.';

/* R-03 잘못된 입력 — 안내 문구는 docs/requirements.md 의 정확한 문장 */
var SECTORS = ['반도체', '방산'];
var MAX_REASON = 80;
var MSG_SECTOR_UNKNOWN = '지원하지 않는 업종이에요. 반도체 또는 방산 중에서 골라 주세요.';

/* 글자 수 (앞뒤 공백을 뺀 뒤 센다) */
function reasonLength(text) {
  return Array.from(String(text || '').trim()).length;
}

/* 업종 검사. 빈값(R-02)과 목록에 없는 업종(R-03)에 안내 문구를 돌려준다. */
function validateSector(value) {
  if (!value) { return { ok: false, message: MSG_SECTOR_EMPTY }; }
  if (SECTORS.indexOf(value) === -1) { return { ok: false, message: MSG_SECTOR_UNKNOWN }; }
  return { ok: true };
}

/* 질문 3개 검사. 비어 있는 칸(R-02)과 너무 긴 이유(R-03)마다 안내 문구를 errors 에 담는다. */
function validateMemo(memo) {
  var errors = {};
  if (!memo.q1) { errors.q1 = MSG_Q1_EMPTY; }
  if (!memo.q2) { errors.q2 = MSG_Q2_EMPTY; }
  if (!memo.q3 || !String(memo.q3).trim()) {
    errors.q3 = MSG_Q3_EMPTY;
  } else if (reasonLength(memo.q3) > MAX_REASON) {
    errors.q3 = '이유는 ' + MAX_REASON + '자 이내로 적어 주세요. (현재 ' + reasonLength(memo.q3) + '자)';
  }
  return { ok: Object.keys(errors).length === 0, errors: errors };
}

/* 저장 요약 한 줄 */
function buildMemoSummary(memo) {
  return '내 판단: ' + memo.q1 + ' · 이유 유지: ' + memo.q2 + ' · 이유: ' + memo.q3;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

/* 저장 시각 표시: YYYY-MM-DD HH:mm */
function fmtDateTime(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
         ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/* R-04 데이터·저장 실패 — 안내 문구는 docs/requirements.md 의 정확한 문장 */
var MSG_DATA_FAIL = '카드 데이터를 불러오지 못했어요. 페이지를 새로 고침해 주세요.';
var MSG_SAVE_FAIL = '이 브라우저에서는 메모를 저장할 수 없어요. 화면의 내용은 그대로 두었어요.';

/* 카드 데이터가 있는지 검사한다. 없거나 업종이 빠졌으면 안내 문구를 돌려준다. */
function loadCardData(data) {
  var ok = !!(data && data.sectors && SECTORS.every(function (s) { return data.sectors[s]; }));
  return ok ? { ok: true } : { ok: false, message: MSG_DATA_FAIL };
}

/* 메모 저장. 저장소를 못 쓰면 오류를 던지지 않고 안내 문구를 돌려준다. */
function saveMemo(memo, storage) {
  try {
    storage = storage || window.localStorage;
    var savedAt = fmtDateTime(new Date());
    storage.setItem(MEMO_KEY, JSON.stringify({
      sector: memo.sector, q1: memo.q1, q2: memo.q2, q3: memo.q3, savedAt: savedAt
    }));
    return { ok: true, savedAt: savedAt };
  } catch (e) {
    return { ok: false, message: MSG_SAVE_FAIL };
  }
}

/* 같은 업종의 지난 메모를 돌려준다. 없거나 저장소를 못 쓰면 null (화면이 멈추지 않게) */
function loadMemo(sector, storage) {
  try {
    storage = storage || window.localStorage;
    var raw = storage.getItem(MEMO_KEY);
    if (!raw) { return null; }
    var m = JSON.parse(raw);
    return m && m.sector === sector ? m : null;
  } catch (e) {
    return null;
  }
}

/* ---------------- 화면 연결 (app.html에서만 실행) ---------------- */
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) { e.className = cls; }
  if (text !== undefined) { e.textContent = text; }
  return e;
}

function numberCard(m, kindClass) {
  var box = el('div', 'numcard');
  box.appendChild(el('p', 'what', m.label));
  box.appendChild(el('p', 'big ' + kindClass, fmtPct(m.pct)));
  box.appendChild(el('p', '', m.range + ' · ' + m.dateText));
  box.appendChild(el('p', 'src', '출처: ' + m.source + ' · 한계: ' + m.limit));
  return box;
}

function renderCard(sector) {
  var host = document.getElementById('card');
  host.textContent = '';
  var c = buildCard(sector);
  if (!c.ok) { return; }
  host.appendChild(el('h2', '', c.title));
  var grid = el('div', 'grid2');
  grid.appendChild(numberCard(c.market, c.market.pct < 0 ? 'down' : 'up'));
  grid.appendChild(numberCard(c.fx, 'warnc'));
  host.appendChild(grid);
  c.facts.forEach(function (f) {
    var row = el('div', 'fact');
    row.appendChild(el('p', 'what', f.label));
    row.appendChild(el('p', 'val', f.value));
    row.appendChild(el('p', 'src', '기준일: ' + f.asOf + ' · 출처: ' + f.source + ' · 한계: ' + f.limit));
    host.appendChild(row);
  });
  var unk = el('div', 'unknown');
  unk.appendChild(el('h3', '', '이 카드로 알 수 없는 것'));
  var ul = el('ul');
  c.unknown.forEach(function (u) { ul.appendChild(el('li', '', u)); });
  unk.appendChild(ul);
  host.appendChild(unk);
}

function renderPrevMemo(sector) {
  var host = document.getElementById('prev');
  host.textContent = '';
  var m = loadMemo(sector);
  if (!m) { return; }
  host.appendChild(el('h3', '', '지난 메모'));
  host.appendChild(el('p', 'summary', buildMemoSummary(m)));
  host.appendChild(el('p', 'src', '저장 시각: ' + m.savedAt));
}

function selectedValue(name) {
  var r = document.querySelector('input[name="' + name + '"]:checked');
  return r ? r.value : '';
}

function onSectorChange() {
  var sector = document.getElementById('sector').value;
  showError('err-sector', ''); /* 업종을 새로 고르면 이전 안내는 지운다 */
  document.getElementById('result').textContent = '';
  if (!sector) {
    document.getElementById('card').textContent = '';
    document.getElementById('card').appendChild(el('p', 'placeholder', '보유 업종을 고르면 2026-03 이란 전쟁 카드를 보여 드려요.'));
    document.getElementById('prev').textContent = '';
    return;
  }
  renderCard(sector);
  renderPrevMemo(sector);
}

function showError(id, message) {
  var box = document.getElementById(id);
  if (!box) { return; }
  box.textContent = message || '';
}

function clearErrors() {
  ['err-sector', 'err-q1', 'err-q2', 'err-q3', 'err-save'].forEach(function (id) { showError(id, ''); });
}

function onSave() {
  var memo = {
    sector: document.getElementById('sector').value,
    q1: selectedValue('q1'),
    q2: selectedValue('q2'),
    q3: document.getElementById('q3').value.trim()
  };
  clearErrors();
  document.getElementById('result').textContent = '';
  var vs = validateSector(memo.sector);
  var vm = validateMemo(memo);
  if (!vs.ok) { showError('err-sector', vs.message); }
  if (!vm.ok) {
    showError('err-q1', vm.errors.q1);
    showError('err-q2', vm.errors.q2);
    showError('err-q3', vm.errors.q3);
  }
  if (!vs.ok || !vm.ok) { return; } /* 저장하지 않고, 입력한 값은 그대로 둔다 */
  var r = saveMemo(memo);
  if (!r.ok) { showError('err-save', r.message); return; } /* 입력한 값은 그대로 두고 저장만 실패로 처리 */
  var out = document.getElementById('result');
  out.textContent = '';
  out.appendChild(el('p', 'ok', '메모를 저장했어요.'));
  out.appendChild(el('p', 'summary', buildMemoSummary(memo)));
  out.appendChild(el('p', 'src', '저장 시각: ' + r.savedAt));
}

/* 주소의 ?sector=값 이 있으면 검사한다. 목록에 없으면 안내만 보이고 카드는 보이지 않는다. */
function initSectorFromUrl() {
  var param = null;
  try { param = new URLSearchParams(window.location.search).get('sector'); } catch (e) { param = null; }
  if (param === null) { return; }
  var v = validateSector(param);
  if (!v.ok) { showError('err-sector', v.message); return; }
  document.getElementById('sector').value = param;
  onSectorChange();
}

/* 데이터를 못 읽었을 때: 안내만 보이고 입력·버튼은 눌리지 않는다 */
function showDataFailure(message) {
  var card = document.getElementById('card');
  card.textContent = '';
  var p = el('p', 'err', message);
  p.setAttribute('role', 'alert');
  card.appendChild(p);
  var controls = document.querySelectorAll('#app select, #app input, #app button');
  for (var i = 0; i < controls.length; i++) { controls[i].disabled = true; }
}

function initApp() {
  var d = loadCardData(window.CARD_DATA);
  if (!d.ok) { showDataFailure(d.message); return; }
  document.getElementById('sector').addEventListener('change', onSectorChange);
  document.getElementById('save').addEventListener('click', onSave);
  onSectorChange();
  initSectorFromUrl();
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  initApp();
}
