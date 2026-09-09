import React, { useState, useRef } from 'react';
import { Player } from '../types';
import { X, DollarSign, Activity, Camera, Trash2, Check, Edit2, Sparkles, Dices, Image as ImageIcon, Grid, RefreshCw, Clock, TrendingUp } from 'lucide-react';
import { resizeProfileImage } from '../utils/image';
import { AVATAR_PRESETS, AVATAR_STYLES, AvatarStyle, generateUniqueAvatar, getRandomAvatarSeed } from '../utils/avatar';
import { formatPlaytimeHuman, getStoredTotalPlaytime } from '../utils/playtime';

interface PlayerProfileModalProps {
  player: Player | null;
  onClose: () => void;
  isSelf?: boolean;
  onUpdateProfile?: (name: string, avatarUrl: string) => void;
  playtimeSeconds?: number;
  onOpenPlaytimeScoreboard?: () => void;
  onOpenStats?: () => void;
  onRequestLoan?: (amount: number) => void;
  onRepayLoan?: (amount: number) => void;
  selfDebtToPlayer?: number;
  selfChips?: number;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  onClose,
  isSelf = false,
  onUpdateProfile,
  playtimeSeconds,
  onOpenPlaytimeScoreboard,
  onOpenStats,
  onRequestLoan,
  onRepayLoan,
  selfDebtToPlayer = 0,
  selfChips = 0
}) => {
  if (!player) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(player.name);
  const [avatarUrl, setAvatarUrl] = useState<string>(player.avatarUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar creation modes: 'generate' | 'presets' | 'upload'
  const [avatarTab, setAvatarTab] = useState<'generate' | 'presets' | 'upload'>('generate');
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>('adventurer');
  const [customSeed, setCustomSeed] = useState(player.name || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalDebts = Object.values(player.debts || {}).reduce((acc: number, curr: unknown) => acc + (typeof curr === 'number' ? curr : 0), 0) as number;

  const handleGenerateAvatar = (style?: AvatarStyle, seed?: string) => {
    const s = style || selectedStyle;
    const rndSeed = seed !== undefined ? seed : `${getRandomAvatarSeed()}-${Date.now()}`;
    const generatedUrl = generateUniqueAvatar(s, rndSeed);
    setAvatarUrl(generatedUrl);
    setError(null);
  };

  const handleSelectPreset = (url: string) => {
    setAvatarUrl(url);
    setError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem é muito grande. Escolha uma foto menor que 10MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const base64 = await resizeProfileImage(file, 140, 140);
      setAvatarUrl(base64);
    } catch (err) {
      console.error('Error optimizing image:', err);
      setError('Falha ao processar a imagem. Tente outra foto.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    setError(null);
  };

  const handleSave = () => {
    if (!editedName.trim()) {
      setError('O nome de jogador não pode ficar vazio.');
      return;
    }
    if (editedName.trim().length > 18) {
      setError('O nome de jogador deve ter no máximo 18 caracteres.');
      return;
    }

    if (onUpdateProfile) {
      onUpdateProfile(editedName.trim(), avatarUrl);
    }
    setIsEditing(false);
    setError(null);
  };

  const seatNumber = player.seatIndex !== undefined ? player.seatIndex + 1 : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Seat Badge */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-5 pr-8">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              {isSelf ? 'Seu Perfil' : 'Perfil do Jogador'}
            </h3>
            <p className="text-[10px] text-stone-400 font-medium">
              {player.isSpectator ? 'Espectador na sala' : `Assento #${seatNumber || 1} na mesa`}
            </p>
          </div>
          {seatNumber !== null && !player.isSpectator && (
            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              Assento #{seatNumber}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Profile Avatar & Header Identity */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative group mb-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 border-4 border-stone-800 overflow-hidden flex items-center justify-center shadow-xl relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={player.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-white uppercase">
                  {(isEditing ? editedName : player.name).substring(0, 2).toUpperCase()}
                </span>
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Quick trigger to open edit state if self */}
            {isSelf && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setEditedName(player.name);
                  setAvatarUrl(player.avatarUrl || '');
                  setIsEditing(true);
                }}
                className="absolute bottom-0 right-0 bg-emerald-500 hover:bg-emerald-400 text-stone-950 p-2 rounded-full cursor-pointer transition-all shadow-md transform hover:scale-110 border-2 border-stone-900"
                title="Editar Avatar e Nome"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Name Display or Input */}
          {isSelf && isEditing ? (
            <div className="w-full px-2 mb-3">
              <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1 text-left">
                Nome de Jogador
              </label>
              <input
                type="text"
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                maxLength={18}
                className="w-full bg-black/40 border border-stone-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white font-bold text-center focus:outline-none"
                placeholder="Seu apelido na mesa"
              />
            </div>
          ) : (
            <div className="px-2">
              <h2 className="text-xl font-black text-white leading-tight mb-1 flex items-center justify-center gap-1.5">
                {player.name}
                {isSelf && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(player.name);
                      setAvatarUrl(player.avatarUrl || '');
                      setIsEditing(true);
                    }}
                    className="text-stone-500 hover:text-emerald-400 transition-colors p-1"
                    title="Editar Perfil"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">
                  {player.isHost ? 'Criador da Sala' : 'Jogador'}
                </span>
                {seatNumber !== null && !player.isSpectator && (
                  <span className="text-[10px] text-stone-500 font-bold">
                    • Assento #{seatNumber}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AVATAR SELECTOR & GENERATOR (Visible when editing) */}
        {isSelf && isEditing && (
          <div className="mb-5 bg-stone-950/70 border border-stone-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Escolha ou Gere seu Avatar
              </span>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" /> Remover
                </button>
              )}
            </div>

            {/* Sub-Tabs: Generate | Presets | Upload */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setAvatarTab('generate')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  avatarTab === 'generate'
                    ? 'bg-emerald-500 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Dices className="w-3 h-3" /> Gerar Único
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('presets')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  avatarTab === 'presets'
                    ? 'bg-emerald-500 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Grid className="w-3 h-3" /> Galeria VIP
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('upload')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  avatarTab === 'upload'
                    ? 'bg-emerald-500 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Camera className="w-3 h-3" /> Enviar Foto
              </button>
            </div>

            {/* Tab 1: GENERATE UNIQUE AVATAR */}
            {avatarTab === 'generate' && (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Estilo Visual
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AVATAR_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setSelectedStyle(style.id);
                          handleGenerateAvatar(style.id);
                        }}
                        className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                          selectedStyle === style.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white hover:border-stone-700 text-[10px]'
                        }`}
                      >
                        <span className="text-[10px] block leading-tight">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerateAvatar(selectedStyle)}
                    className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Dices className="w-3.5 h-3.5" /> Gerar Avatar Aleatório
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateAvatar(selectedStyle, editedName.trim() || player.name)}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white text-xs font-bold rounded-xl border border-stone-700 cursor-pointer transition-colors"
                    title="Gera um avatar baseado no seu apelido"
                  >
                    Meu Nome
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: PRESET GALLERY */}
            {avatarTab === 'presets' && (
              <div className="pt-1">
                <p className="text-[9px] text-stone-400 mb-2">Clique em um dos avatares para selecionar:</p>
                <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 no-scrollbar">
                  {AVATAR_PRESETS.map(preset => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 p-0.5 cursor-pointer transition-all hover:scale-105 ${
                          isSelected
                            ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-950/40'
                            : 'border-stone-800 hover:border-stone-600 bg-stone-900'
                        }`}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-emerald-500 text-stone-950 p-0.5 rounded-full shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: UPLOAD FILE */}
            {avatarTab === 'upload' && (
              <div className="pt-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-stone-800 hover:border-emerald-500/50 rounded-xl transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 mb-2">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white mb-0.5">Envie uma foto do seu dispositivo</p>
                <p className="text-[9px] text-stone-500 mb-2.5">JPG, PNG ou GIF até 10MB (otimização automática)</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black rounded-lg cursor-pointer transition-colors"
                >
                  Selecionar Imagem
                </button>
              </div>
            )}
          </div>
        )}

        {/* Player Stats */}
        <div className="space-y-2.5">
          <div className="bg-stone-800/30 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-400">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Saldo de Fichas</span>
            </div>
            <div className="text-base font-black text-emerald-400 font-mono">
              ${player.chips.toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="bg-stone-800/30 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-400">
              <Activity className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Mesa & Assento</span>
            </div>
            <div className="text-xs font-bold text-stone-300">
              {player.isSpectator ? 'Espectador 👁️' : `Assento #${seatNumber || 1}`}
            </div>
          </div>

          <div className="bg-stone-800/30 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-400">
              <span className="text-sm">🏆</span>
              <span className="text-xs font-bold uppercase tracking-wider">Vitórias Registradas</span>
            </div>
            <div className="text-sm font-black text-white font-mono">
              {player.wins || 0}
            </div>
          </div>

          <div className="bg-stone-800/30 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Tempo no Jogo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 font-mono">
                {formatPlaytimeHuman(playtimeSeconds !== undefined ? playtimeSeconds : getStoredTotalPlaytime())}
              </span>
              {onOpenPlaytimeScoreboard && (
                <button
                  type="button"
                  onClick={onOpenPlaytimeScoreboard}
                  className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase rounded cursor-pointer transition-colors"
                >
                  Placar
                </button>
              )}
            </div>
          </div>

          <div className="bg-stone-800/30 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-400">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Desempenho da Conta</span>
            </div>
            {onOpenStats ? (
              <button
                type="button"
                onClick={onOpenStats}
                className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
              >
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Ver Gráfico</span>
              </button>
            ) : (
              <span className="text-[10px] text-stone-400 font-mono">Atualiza por rodada</span>
            )}
          </div>

          {totalDebts > 0 && (
            <div className="bg-red-950/20 rounded-xl p-3.5 border border-red-500/15 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">Empréstimos a Pagar</span>
              <div className="text-sm font-black text-red-400 font-mono">
                ${totalDebts.toLocaleString('pt-BR')}
              </div>
            </div>
          )}

          {/* Loan Interaction Section for Other Players */}
          {!isSelf && onRequestLoan && (
            <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-xl p-3.5 border border-amber-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Empréstimos & Ajuda
                </span>
                <span className="text-[11px] text-stone-400">
                  Saldo dele: <strong className="text-emerald-400 font-bold">${player.chips.toLocaleString()}</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onRequestLoan(100)}
                  disabled={player.chips < 100}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/40 text-xs font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Pedir $100
                </button>
                <button
                  type="button"
                  onClick={() => onRequestLoan(250)}
                  disabled={player.chips < 250}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/40 text-xs font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Pedir $250
                </button>
                <button
                  type="button"
                  onClick={() => onRequestLoan(500)}
                  disabled={player.chips < 500}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/40 text-xs font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Pedir $500
                </button>
              </div>

              {selfDebtToPlayer > 0 && onRepayLoan && (
                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-stone-300">
                    Você deve: <strong className="text-amber-400">${selfDebtToPlayer.toLocaleString()}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRepayLoan(Math.min(100, selfDebtToPlayer))}
                      disabled={selfChips < Math.min(100, selfDebtToPlayer)}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Pagar $100
                    </button>
                    <button
                      type="button"
                      onClick={() => onRepayLoan(selfDebtToPlayer)}
                      disabled={selfChips < selfDebtToPlayer}
                      className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Quitar Tudo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-2.5">
          {isSelf && isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-400 hover:text-stone-300 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" /> Salvar Perfil
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-750 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
