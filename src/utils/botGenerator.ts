import { Player } from '../types';

const FIRST_NAMES = [
  // Nomes Brasileiros e Latinos
  'Lucas', 'Gabriel', 'Matheus', 'Enzo', 'Rafael', 'Rodrigo', 'Felipe', 'Thiago', 'Gustavo', 'Leonardo',
  'Bruno', 'Diego', 'Danilo', 'Guilherme', 'Caio', 'Eduardo', 'Vinicius', 'Alexandre', 'Bernardo', 'Murilo',
  'Isabella', 'Valentina', 'Sophia', 'Alice', 'Helena', 'Manuela', 'Laura', 'Bianca', 'Camila', 'Beatriz',
  'Larissa', 'Mariana', 'Carolina', 'Juliana', 'Fernanda', 'Gabriela', 'Amanda', 'Renata', 'Patricia', 'Luana',
  // Nomes Internacionais / Cassino VIP
  'Dimitri', 'Viktor', 'Matteo', 'Giovanni', 'Marco', 'Hans', 'Klaus', 'Kenji', 'Takeshi', 'Liam',
  'Noah', 'Oliver', 'James', 'Alexander', 'Sebastian', 'Maximilian', 'Chloe', 'Elena', 'Natasha', 'Seraphina',
  'Carlos', 'Javier', 'Alejandro', 'Fernando', 'Ricardo', 'Antonio', 'Esteban', 'Hugo', 'Sergio', 'Raul',
  'Dominic', 'Vincent', 'Sterling', 'Damian', 'Fabrizio', 'Lorenzo', 'Dante', 'Adriano', 'Cristiano', 'Neymar',
  'Mia', 'Zoe', 'Scarlett', 'Victoria', 'Penelope', 'Layla', 'Nora', 'Stella', 'Maya', 'Leila'
];

const NICKNAMES_AND_TITLES = [
  'O Mago das Cartas', 'High Roller', 'All-In King', 'Gênio da Mesa', 'Calculista', 'Tubarão VIP',
  'Blackjack Pro', 'Sorte Pura', 'Ás de Ouro', 'O Estrategista', 'Sem Medo', 'Mestre do 21',
  'Lobo de Vegas', 'Sniper de Fichas', 'Barão do Cassino', 'Imperador', 'Rei de Copas', 'Dama de Espadas',
  'Mão de Ferro', 'Invicto', 'Mestre da Probabilidade', 'Vegas Legend', 'Tigre VIP', 'Pantera Negra',
  'Gold Master', 'Rei do Double', 'Carioca Pro', 'Paulista VIP', 'Milionário', 'O Audacioso',
  'Mente Brilhante', 'Olho de Falcão', 'Senhor 21', 'A Rainha do Cassino', 'Diamante Negro', 'VIP Platinum'
];

const PERSONALITIES: {
  type: string;
  minBetRatio: number;
  maxBetRatio: number;
  riskTolerance: number;
  label: string;
}[] = [
  { type: 'aggressive', minBetRatio: 0.05, maxBetRatio: 0.15, riskTolerance: 0.85, label: 'Agressivo' },
  { type: 'conservative', minBetRatio: 0.02, maxBetRatio: 0.05, riskTolerance: 0.25, label: 'Conservador' },
  { type: 'balanced', minBetRatio: 0.03, maxBetRatio: 0.08, riskTolerance: 0.50, label: 'Estrategista' },
  { type: 'high_roller', minBetRatio: 0.10, maxBetRatio: 0.25, riskTolerance: 0.90, label: 'High Roller VIP' },
  { type: 'casual', minBetRatio: 0.02, maxBetRatio: 0.06, riskTolerance: 0.40, label: 'Casual' },
  { type: 'card_counter', minBetRatio: 0.04, maxBetRatio: 0.12, riskTolerance: 0.65, label: 'Calculista Pro' },
];

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Zoe', 'Jack', 'Leo', 'Milo', 'Bella', 'Jasper', 'Oliver', 'Toby',
  'Sam', 'Max', 'Luna', 'Ruby', 'Oscar', 'Finn', 'Archie', 'Hugo', 'Theo', 'Daisy',
  'Chloe', 'Sophie', 'Lilly', 'Millie', 'Rosie', 'Ella', 'Grace', 'Freya', 'Evie', 'Phoebe',
  'Viper', 'Shadow', 'Ace', 'Joker', 'King', 'Queen', 'Titan', 'Ghost', 'Nova', 'Flash'
];

const UNSPLASH_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
];

export const BOT_CHAT_GREETINGS = [
  'Boa noite a todos! Vamos quebrar a banca.',
  'Opa, lugar vago na mesa! Entrando com tudo.',
  'Hoje a probabilidade está ao meu favor.',
  'Salve galera! Preparados pro 21?',
  'Mesa excelente! Vamos ver quem leva mais fichas.',
  'Fala pessoal! O dealer não vai ter chance hoje.',
  'Cheguei pra colocar pressão nessa mesa VIP!',
  'Bora lá, foco total na contagem de cartas.',
  'Aposte alto, ganhe alto! Boa sorte a todos.'
];

export const BOT_WIN_REACTIONS = [
  'Mais um 21 na conta!',
  'A estratégia nunca falha!',
  'Pagamento garantido pelo cassino!',
  'Essa mão foi de mestre.',
  'Show! O cálculo estava 100% certo.',
  'Blackjack limpo! Fichas pra cá!',
  'Excelente rodada!'
];

export const BOT_BUST_REACTIONS = [
  'Arrisquei e estourou... faz parte!',
  'Essa carta alta quebrou a leitura.',
  'O dealer deu sorte nessa, na próxima recupero!',
  'Faz parte da gestão de risco.',
  'Estourou por pouco!'
];

export const GUEST_TITLES = [
  'Rei', 'Rainha', 'Imperador', 'Barão', 'Duque', 'Lorde', 'Mestre', 'Lenda', 'Magnata', 'Tubarão',
  'Ás', 'Falcão', 'Pantera', 'Cobra', 'Tigre', 'Lobo', 'Dragão', 'Fênix', 'Águia', 'Leão',
  'Ninja', 'Samurai', 'Gladiador', 'Centurião', 'Ciborgue', 'Titan', 'Hacker', 'Fantasma', 'Sombra', 'Relâmpago',
  'Trovão', 'Diamante', 'Platina', 'Ouro', 'Estrela', 'Astro', 'Gênio', 'Invicto', 'Valente', 'Destemido',
  'Audaz', 'Misterioso', 'Nobre', 'Lendário', 'Supremo', 'Prime', 'Cyber', 'Galáctico', 'Alfa', 'Ômega',
  'Vegas', 'Macau', 'Royale', 'Monaco', 'Don', 'Comandante', 'Almirante', 'Caçador', 'Cavaleiro', 'Mágico',
  'Ilusionista', 'Vencedor', 'Campeão', 'Predador', 'Guerreiro', 'Visionário', 'Invulnerável', 'Soberano'
];

export const GUEST_THEMES = [
  'DoVinteUm', 'DaMesa', 'DeCopas', 'DeEspadas', 'DeOuros', 'DePaus', 'DoCassino', 'DosDados', 'DaRoleta', 'DoBlackjack',
  'DaSorte', 'DaBanca', 'DoAllIn', 'SemMedo', 'HighRoller', 'SniperVIP', 'Calculista', 'DoTrono', 'DaFortuna', 'DasFichas',
  'DaNoite', 'DeLasVegas', 'DeMonteCarlo', 'DosMilhões', 'Imbatível', 'Invencível', 'Campeão', 'Soberano', 'Estrategista', 'Visionário',
  'Invulnerável', 'Lendário', 'Noturno', 'Secreto', 'Infinito', 'DoDestino', 'DaGlória', 'Supremo', 'Predador', 'Guerreiro',
  'Vencedor', 'Monarca', 'Vitorioso', 'Magnífico', 'Guardião', 'DaElite', 'VIP', 'Platinum', 'Pro', 'Master',
  'Alpha', 'Omega', 'Golden', 'Silver', 'Shadow', 'Dragon', 'Phoenix', 'Tiger', 'Wolf', 'Eagle'
];

export const GUEST_SUFFIX_TAGS = [
  '777', '21', '999', 'VIP', 'PRO', '100K', 'ACE', 'MAX', 'WIN', 'GOLD', 'LV', 'LUX', 'ROYALE', 'PRIME', 'X', '888', '333', '555', 'TOP', 'PLUS'
];

/**
 * Generates an unique, exciting casino guest name out of trillions of procedural combinations
 */
export function generateTrillionGuestName(): string {
  const title = GUEST_TITLES[Math.floor(Math.random() * GUEST_TITLES.length)];
  const theme = GUEST_THEMES[Math.floor(Math.random() * GUEST_THEMES.length)];
  const tag = GUEST_SUFFIX_TAGS[Math.floor(Math.random() * GUEST_SUFFIX_TAGS.length)];
  const randomNum = Math.floor(100 + Math.random() * 999900);

  const formats = [
    `${title}${theme}_${randomNum}`,
    `${title}_${theme}_${tag}`,
    `${title}${theme}${tag}_${Math.floor(10 + Math.random() * 990)}`,
    `${title}_${randomNum}_${tag}`,
    `${title}${theme}#${randomNum}`
  ];

  const generated = formats[Math.floor(Math.random() * formats.length)];
  return generated.slice(0, 18);
}

/**
 * Generates a completely fresh guest profile with $1,000 chips, 0 wins, 0 playtime, and no avatar
 */
export function generateFreshGuestProfile() {
  const guestName = generateTrillionGuestName();
  const guestId = `guest-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    id: guestId,
    name: guestName,
    chips: 1000,
    wins: 0,
    playtime_seconds: 0,
    longest_session_seconds: 0,
    avatar_url: ''
  };
}

let globalBotCounter = 1;

/**
 * Procedural generator capable of creating millions of unique bot profiles
 */
export function generateUniqueBot(seatIndex: number, excludedIds: string[] = []): Player {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const nickname = NICKNAMES_AND_TITLES[Math.floor(Math.random() * NICKNAMES_AND_TITLES.length)];
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  
  // Format variations: "Lucas (High Roller)", "Matteo 'Tubarão' VIP", "Valentina (Estrategista)", etc.
  const nameFormats = [
    `${firstName} (${nickname})`,
    `${firstName} '${nickname}'`,
    `${firstName} • ${personality.label}`,
    `${firstName} [VIP ${Math.floor(Math.random() * 99 + 1)}]`
  ];
  const botName = nameFormats[Math.floor(Math.random() * nameFormats.length)];

  // Unique ID
  globalBotCounter++;
  const uniqueId = `bot-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}-${globalBotCounter}`;

  // Avatar variation
  let avatarUrl: string;
  if (Math.random() > 0.4) {
    const unsplashIdx = Math.floor(Math.random() * UNSPLASH_AVATARS.length);
    avatarUrl = UNSPLASH_AVATARS[unsplashIdx];
  } else {
    const seed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)] + Math.floor(Math.random() * 9999);
    const avatarStyles = ['avataaars', 'bottts', 'adventurer', 'micah', 'personas'];
    const style = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
    avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  }

  // Realistic bankrolls & win counts based on personality
  let chips = 1500;
  let wins = Math.floor(Math.random() * 30 + 5);

  if (personality.type === 'high_roller') {
    chips = Math.floor(Math.random() * 15000 + 5000);
    wins = Math.floor(Math.random() * 80 + 35);
  } else if (personality.type === 'aggressive') {
    chips = Math.floor(Math.random() * 5000 + 2000);
    wins = Math.floor(Math.random() * 45 + 15);
  } else if (personality.type === 'conservative') {
    chips = Math.floor(Math.random() * 2500 + 1000);
    wins = Math.floor(Math.random() * 25 + 10);
  } else {
    chips = Math.floor(Math.random() * 3500 + 1200);
    wins = Math.floor(Math.random() * 35 + 8);
  }

  // Calculate opening bet
  const minBet = Math.max(10, Math.floor(chips * personality.minBetRatio));
  const maxBet = Math.max(25, Math.floor(chips * personality.maxBetRatio));
  let initialBet = Math.floor(Math.random() * (maxBet - minBet + 1) + minBet);
  initialBet = Math.round(initialBet / 5) * 5; // Round to nearest multiple of 5
  initialBet = Math.max(10, Math.min(initialBet, chips - 50));

  return {
    id: uniqueId,
    name: botName,
    chips: chips - initialBet,
    currentBet: initialBet,
    cards: [],
    status: 'ready',
    outcome: null,
    payout: 0,
    isHost: false,
    isReady: true,
    seatIndex,
    debts: {},
    wins,
    avatarUrl,
    isBot: true,
    botPersonality: personality.type,
  };
}
