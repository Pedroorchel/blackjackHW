// Avatar presets and generator utilities for Blackjack Royale

export interface AvatarPreset {
  id: string;
  name: string;
  category: 'casino' | 'character' | 'cyber';
  url: string;
}

// Curated selection of distinctive, high-contrast avatars
export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'high-roller',
    name: 'High Roller',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9'
  },
  {
    id: 'card-master',
    name: 'Mestre do 21',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=ffd5dc,ffdfbf'
  },
  {
    id: 'queen-diamonds',
    name: 'Dama de Ouros',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Victoria&backgroundColor=ffdfbf,ffd5dc'
  },
  {
    id: 'king-clubs',
    name: 'Rei de Paus',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alexander&backgroundColor=d1d4f9,c0aede'
  },
  {
    id: 'ace-spades',
    name: 'Ás de Espadas',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ace&backgroundColor=1e293b,0f172a'
  },
  {
    id: 'croupier-vip',
    name: 'Croupier VIP',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Oliver&backgroundColor=c0aede,b6e3f4'
  },
  {
    id: 'cyber-gambler',
    name: 'Cyber Gambler',
    category: 'cyber',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber77&backgroundColor=0284c7,0369a1'
  },
  {
    id: 'neon-shark',
    name: 'Tubarão da Mesa',
    category: 'cyber',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Shark99&backgroundColor=059669,047857'
  },
  {
    id: 'pixel-hustler',
    name: 'Pixel Gambler',
    category: 'character',
    url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Lucky&backgroundColor=b6e3f4,c0aede'
  },
  {
    id: 'retro-dealer',
    name: 'Dealer Retrô',
    category: 'character',
    url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=CasinoBoss&backgroundColor=ffd5dc,ffdfbf'
  },
  {
    id: 'lucky-cat',
    name: 'Gato da Sorte',
    category: 'character',
    url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Milo&backgroundColor=f59e0b,d97706'
  },
  {
    id: 'golden-fortune',
    name: 'Fortuna de Ouro',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Goldie&backgroundColor=fef08a,fde047'
  },
  {
    id: 'shadow-broker',
    name: 'Jogador Oculto',
    category: 'cyber',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow&backgroundColor=334155,1e293b'
  },
  {
    id: 'lady-luck',
    name: 'Senhora Sorte',
    category: 'character',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Serena&backgroundColor=f472b6,db2777'
  },
  {
    id: 'poker-face',
    name: 'Poker Face',
    category: 'character',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Mystery&backgroundColor=cbd5e1,94a3b8'
  },
  {
    id: 'vip-investor',
    name: 'VIP Investor',
    category: 'casino',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Warren&backgroundColor=bbf7d0,86efac'
  }
];

export type AvatarStyle = 'adventurer' | 'bottts' | 'lorelei' | 'pixel-art' | 'notionists' | 'thumbs';

export interface AvatarStyleOption {
  id: AvatarStyle;
  label: string;
  description: string;
}

export const AVATAR_STYLES: AvatarStyleOption[] = [
  { id: 'adventurer', label: 'Aventureiro', description: 'Personagens ilustrados com acessórios e expressões' },
  { id: 'bottts', label: 'Robô / Cyber', description: 'Estilo cibernético e futurista' },
  { id: 'lorelei', label: 'Moderno Elegante', description: 'Traços limpos e sofisticados' },
  { id: 'pixel-art', label: 'Pixel Art Retrô', description: 'Estilo 8-bit nostálgico de arcade' },
  { id: 'notionists', label: 'Minimalista', description: 'Estilo contemporâneo e executivo' },
  { id: 'thumbs', label: 'Divertido & Emojis', description: 'Design alegre com cores vibrantes' },
];

/**
 * Generates a unique avatar URL with high-contrast background and personalized seed
 */
export function generateUniqueAvatar(style: AvatarStyle = 'adventurer', customSeed?: string): string {
  const seed = customSeed?.trim() || `blackjack-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
  
  // Custom background palettes to ensure casino readability
  const backgroundPalettes = [
    'b6e3f4,c0aede,d1d4f9',
    'ffd5dc,ffdfbf',
    'd1d4f9,c0aede',
    '1e293b,0f172a',
    '0284c7,0369a1',
    '059669,047857',
    'f59e0b,d97706',
    'fef08a,fde047',
    'f472b6,db2777',
    'bbf7d0,86efac'
  ];
  const bgPalette = backgroundPalettes[Math.floor(Math.random() * backgroundPalettes.length)];

  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bgPalette}`;
}

/**
 * Generates a random seed name for fun
 */
export function getRandomAvatarSeed(): string {
  const titles = ['Ace', 'King', 'Queen', 'Jack', 'Joker', 'Vip', 'Lucky', 'Gold', 'Shark', 'Neo', 'Diamond', 'Shadow', 'Fox', 'Wolf'];
  const numbers = Math.floor(100 + Math.random() * 900);
  const title = titles[Math.floor(Math.random() * titles.length)];
  return `${title}${numbers}`;
}
