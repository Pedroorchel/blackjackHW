// script.js - Cliente Blackjack Multiplayer (Vanilla JS)
const socket = io();

// Elementos da UI
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const inputName = document.getElementById('input-name');
const inputRoomCode = document.getElementById('input-room-code');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const lobbyError = document.getElementById('lobby-error');

const displayRoomCode = document.getElementById('display-room-code');
const displayRound = document.getElementById('display-round');
const btnCopyCode = document.getElementById('btn-copy-code');
const btnLeave = document.getElementById('btn-leave');

const dealerCards = document.getElementById('dealer-cards');
const dealerScore = document.getElementById('dealer-score');
const playersContainer = document.getElementById('players-container');

const bettingControls = document.getElementById('betting-controls');
const turnControls = document.getElementById('turn-controls');
const roundOverControls = document.getElementById('round-over-controls');
const currentBetDisplay = document.getElementById('current-bet-display');
const turnStatusBanner = document.getElementById('turn-status-banner');
const roundSummaryText = document.getElementById('round-summary-text');

const btnReady = document.getElementById('btn-ready');
const btnStart = document.getElementById('btn-start');
const btnHit = document.getElementById('btn-hit');
const btnStand = document.getElementById('btn-stand');
const btnDouble = document.getElementById('btn-double');
const btnNewRound = document.getElementById('btn-new-round');

let currentBet = 25;
let currentRoom = null;

// Criar Sala
btnCreateRoom.addEventListener('click', () => {
  const name = inputName.value.trim() || 'Jogador 1';
  socket.emit('room:create', { playerName: name }, (res) => {
    if (res.success) {
      currentRoom = res.roomId;
      showGameScreen();
    } else {
      lobbyError.textContent = res.error || 'Erro ao criar sala.';
    }
  });
});

// Entrar em Sala
btnJoinRoom.addEventListener('click', () => {
  const code = inputRoomCode.value.trim().toUpperCase();
  const name = inputName.value.trim() || 'Jogador';
  if (!code) return;

  socket.emit('room:join', { roomId: code, playerName: name }, (res) => {
    if (res.success) {
      currentRoom = code;
      showGameScreen();
    } else {
      lobbyError.textContent = res.error || 'Erro ao entrar na sala.';
    }
  });
});

// Sair da Sala
btnLeave.addEventListener('click', () => {
  location.reload();
});

// Copiar código
btnCopyCode.addEventListener('click', () => {
  if (currentRoom) {
    navigator.clipboard.writeText(currentRoom);
    btnCopyCode.textContent = '✅';
    setTimeout(() => { btnCopyCode.textContent = '📋'; }, 2000);
  }
});

function showGameScreen() {
  lobbyScreen.classList.remove('active');
  gameScreen.classList.add('active');
  displayRoomCode.textContent = currentRoom;
}

// Apostas
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const val = parseInt(chip.dataset.amount, 10);
    currentBet = Math.min(1000, currentBet + val);
    currentBetDisplay.textContent = `$${currentBet}`;
    socket.emit('player:bet', { amount: currentBet });
  });
});

btnReady.addEventListener('click', () => {
  socket.emit('player:ready');
});

btnStart.addEventListener('click', () => {
  socket.emit('game:start');
});

// Ações de Turno
btnHit.addEventListener('click', () => socket.emit('player:hit'));
btnStand.addEventListener('click', () => socket.emit('player:stand'));
btnDouble.addEventListener('click', () => socket.emit('player:double'));
btnNewRound.addEventListener('click', () => socket.emit('game:new_round'));

// Renderizar Estado Recebido pelo Socket
socket.on('room:state', (state) => {
  displayRound.textContent = `Rodada #${state.roundNumber}`;
  const myPlayer = state.players.find(p => p.id === socket.id);
  const isHost = myPlayer?.isHost;

  // Atualizar Dealer
  dealerCards.innerHTML = '';
  state.dealer.cards.forEach(card => {
    dealerCards.appendChild(createCardElement(card));
  });
  dealerScore.textContent = `Total: ${state.dealer.score}`;

  // Atualizar Jogadores
  playersContainer.innerHTML = '';
  state.players.forEach(p => {
    const isTurn = state.activePlayerId === p.id;
    const isSelf = p.id === socket.id;

    const pBox = document.createElement('div');
    pBox.className = `player-card-box ${isTurn ? 'active-turn' : ''}`;

    let cardsHtml = p.cards.map(c => renderCardHtml(c)).join('');
    let outcomeTag = '';
    if (state.phase === 'round_over' && p.outcome) {
      outcomeTag = `<div style="color: #fef08a; font-weight: bold; margin-bottom: 4px;">${p.outcome.toUpperCase()} (+$${p.payout})</div>`;
    }

    pBox.innerHTML = `
      ${outcomeTag}
      <div style="display: flex; gap: -15px; margin-bottom: 8px;">${cardsHtml}</div>
      <div style="font-weight: bold; font-size: 0.85rem; color: #fff;">${p.name} ${isSelf ? '(Você)' : ''}</div>
      <div style="font-size: 0.75rem; color: #34d399;">Fichas: $${p.chips}</div>
      <div style="font-size: 0.75rem; color: #fbbf24;">Aposta: $${p.currentBet}</div>
    `;
    playersContainer.appendChild(pBox);
  });

  // Alternar painéis de controle
  bettingControls.classList.add('hidden');
  turnControls.classList.add('hidden');
  roundOverControls.classList.add('hidden');

  if (state.phase === 'betting') {
    bettingControls.classList.remove('hidden');
    btnStart.style.display = isHost ? 'inline-block' : 'none';
  } else if (state.phase === 'player_turns') {
    turnControls.classList.remove('hidden');
    const isMyTurn = state.activePlayerId === socket.id;
    btnHit.disabled = !isMyTurn;
    btnStand.disabled = !isMyTurn;
    btnDouble.disabled = !isMyTurn || (myPlayer && myPlayer.cards.length !== 2);
    turnStatusBanner.textContent = isMyTurn ? '★ É SUA VEZ DE JOGAR!' : 'Aguardando outro jogador...';
  } else if (state.phase === 'round_over') {
    roundOverControls.classList.remove('hidden');
    if (myPlayer) {
      roundSummaryText.textContent = `Resultado: ${myPlayer.outcome || 'Finalizado'}`;
    }
  }
});

function createCardElement(card) {
  const div = document.createElement('div');
  div.className = `playing-card ${card.hidden ? 'hidden' : ''} ${card.suit === '♥' || card.suit === '♦' ? 'red' : ''}`;
  if (!card.hidden) {
    div.innerHTML = `<span>${card.rank}</span><span>${card.suit}</span>`;
  }
  return div;
}

function renderCardHtml(card) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return `
    <div class="playing-card ${isRed ? 'red' : ''}">
      <span>${card.rank}</span>
      <span>${card.suit}</span>
    </div>
  `;
}
