import React, { useState } from 'react';
import { ArrowLeft, Camera, Compass, Play, Sparkles, Swords } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { SkinId } from '../game/character/CharacterSkinManager';
import { SlotCharacterSelection } from '../game/character/CharacterUnlockManager';
import { MATCH_FORMAT_CONFIG, MatchFormat, PlayerSlot } from '../game/TwoPlayerMatch';
import { getWorldById, WorldId } from '../game/worlds/WorldRegistry';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface TwoPlayerSetupProps {
  initialPlayer1Name: string;
  initialPlayer2Name: string;
  initialFormat: MatchFormat;
  player1FaceImg: HTMLImageElement | null;
  player2FaceImg: HTMLImageElement | null;
  player1Selection: SlotCharacterSelection;
  player2Selection: SlotCharacterSelection;
  player1SkinId: SkinId;
  player2SkinId: SkinId;
  activeWorldId: WorldId;
  onChangeWorld: (p1Name: string, p2Name: string, format: MatchFormat) => void;
  onSelectCharacter: (slot: PlayerSlot, p1Name: string, p2Name: string, format: MatchFormat) => void;
  onEditFace: (slot: PlayerSlot, p1Name: string, p2Name: string, format: MatchFormat) => void;
  onStartMatch: (p1Name: string, p2Name: string, format: MatchFormat) => void;
  onBack: () => void;
}

const FORMAT_ORDER: readonly MatchFormat[] = ['quick', 'bo3', 'bo5'];

export const TwoPlayerSetup: React.FC<TwoPlayerSetupProps> = ({
  initialPlayer1Name,
  initialPlayer2Name,
  initialFormat,
  player1FaceImg,
  player2FaceImg,
  player1Selection,
  player2Selection,
  player1SkinId,
  player2SkinId,
  activeWorldId,
  onChangeWorld,
  onSelectCharacter,
  onEditFace,
  onStartMatch,
  onBack,
}) => {
  const [p1Input, setP1Input] = useState(
    initialPlayer1Name === 'PLAYER 1' ? '' : initialPlayer1Name
  );
  const [p2Input, setP2Input] = useState(
    initialPlayer2Name === 'PLAYER 2' ? '' : initialPlayer2Name
  );
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>(initialFormat);

  const activeFormatMeta = MATCH_FORMAT_CONFIG[selectedFormat];
  const isTournament = selectedFormat !== 'quick';
  const activeWorld = getWorldById(activeWorldId);

  const p1UseCustom = player1Selection.mode === 'custom_face' && Boolean(player1FaceImg);
  const p2UseCustom = player2Selection.mode === 'custom_face' && Boolean(player2FaceImg);
  const p1Char = getCharacterById(player1Selection.characterId);
  const p2Char = getCharacterById(player2Selection.characterId);

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-4 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-1.5">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[40px] px-3 py-1.5 text-xs sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-1.5 text-center">
          <Swords className="h-4 w-4 text-[#FFD84D] drop-shadow-[0_2px_0_#24415C] sm:h-5 sm:w-5" />
          <h2 className="font-display text-stroke-dark text-base font-bold tracking-wide text-white sm:text-lg">
            {isTournament ? 'TOURNAMENT LOBBY' : '2 PLAYER CHALLENGE'}
          </h2>
        </div>

        <div className="w-[64px]" aria-hidden="true" />
      </div>

      {/* Setup Card */}
      <div className="mx-auto my-auto flex w-full max-w-[358px] flex-col overflow-y-auto py-1">
        <div className="anim-panel-pop game-panel p-3.5 sm:p-4">
          {/* Format Selector: Quick Match / Best of 3 / Best of 5 */}
          <div>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-1">
              {FORMAT_ORDER.map((fmt) => {
                const meta = MATCH_FORMAT_CONFIG[fmt];
                const active = selectedFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      audioManager.playButton();
                      setSelectedFormat(fmt);
                    }}
                    className={`rounded-xl px-1.5 py-1.5 text-center transition-all ${
                      active
                        ? 'border-2 border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]'
                        : 'border-2 border-transparent text-[#24415C]/65 hover:text-[#24415C]'
                    }`}
                  >
                    <div className="font-display text-[11px] leading-tight font-bold">
                      {meta.label}
                    </div>
                    <div className="text-[9px] font-black opacity-75">{meta.shortLabel}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-center text-[11px] font-extrabold text-[#24415C]/75">
              {activeFormatMeta.subtitle}
            </p>
          </div>

          {/* Player 1 vs Player 2 Split Cards */}
          <div className="relative mt-2.5 grid grid-cols-2 gap-2.5">
            <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <span className="font-display inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#24415C] bg-[#FFD84D] text-xs font-bold text-[#24415C] shadow-[0_2px_0_#24415C]">
                VS
              </span>
            </div>

            {/* PLAYER 1 CARD */}
            <div className="flex flex-col items-center rounded-2xl border-2 border-[#3998F7] bg-[#EEF7FF] p-2.5 text-center">
              <span className="rounded-lg border border-[#24415C] bg-[#3998F7] px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
                PLAYER 1
              </span>

              <div className="my-1">
                <CharacterShowcaseCanvas
                  customFaceImg={p1UseCustom ? player1FaceImg : null}
                  characterId={player1Selection.characterId}
                  skinId={player1SkinId}
                  rarity={p1UseCustom ? undefined : p1Char.rarity}
                  size={64}
                />
              </div>

              <div className="mb-1 line-clamp-1 text-[9px] font-black text-[#3998F7] uppercase">
                {p1UseCustom ? 'CUSTOM FACE' : p1Char.name}
              </div>

              <label className="sr-only" htmlFor="p1-name-input">
                Nama Player 1
              </label>
              <input
                id="p1-name-input"
                type="text"
                maxLength={14}
                value={p1Input}
                onChange={(e) => setP1Input(e.target.value)}
                placeholder="PLAYER 1"
                className="w-full rounded-xl border-2 border-[#24415C]/30 bg-white px-2 py-1 text-center text-xs font-black tracking-wide text-[#24415C] uppercase placeholder:text-[#24415C]/40 focus:border-[#3998F7] focus:outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onSelectCharacter(
                    1,
                    p1Input || 'PLAYER 1',
                    p2Input || 'PLAYER 2',
                    selectedFormat
                  );
                }}
                className="btn-base btn-primary mt-1.5 min-h-[32px] w-full px-1.5 py-1 text-[10px]"
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>CHARACTER</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onEditFace(1, p1Input || 'PLAYER 1', p2Input || 'PLAYER 2', selectedFormat);
                }}
                className="btn-base btn-secondary mt-1.5 min-h-[32px] w-full px-1.5 py-1 text-[10px]"
              >
                <Camera className="h-3 w-3 shrink-0 text-[#3998F7]" />
                <span>{player1FaceImg ? 'EDIT FACE' : 'CUSTOM FACE'}</span>
              </button>
            </div>

            {/* PLAYER 2 CARD */}
            <div className="flex flex-col items-center rounded-2xl border-2 border-[#FF6B6B] bg-[#FFF2F2] p-2.5 text-center">
              <span className="rounded-lg border border-[#24415C] bg-[#FF6B6B] px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
                PLAYER 2
              </span>

              <div className="my-1">
                <CharacterShowcaseCanvas
                  customFaceImg={p2UseCustom ? player2FaceImg : null}
                  characterId={player2Selection.characterId}
                  skinId={player2SkinId}
                  rarity={p2UseCustom ? undefined : p2Char.rarity}
                  size={64}
                />
              </div>

              <div className="mb-1 line-clamp-1 text-[9px] font-black text-[#FF6B6B] uppercase">
                {p2UseCustom ? 'CUSTOM FACE' : p2Char.name}
              </div>

              <label className="sr-only" htmlFor="p2-name-input">
                Nama Player 2
              </label>
              <input
                id="p2-name-input"
                type="text"
                maxLength={14}
                value={p2Input}
                onChange={(e) => setP2Input(e.target.value)}
                placeholder="PLAYER 2"
                className="w-full rounded-xl border-2 border-[#24415C]/30 bg-white px-2 py-1 text-center text-xs font-black tracking-wide text-[#24415C] uppercase placeholder:text-[#24415C]/40 focus:border-[#FF6B6B] focus:outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onSelectCharacter(
                    2,
                    p1Input || 'PLAYER 1',
                    p2Input || 'PLAYER 2',
                    selectedFormat
                  );
                }}
                className="btn-base btn-primary mt-1.5 min-h-[32px] w-full px-1.5 py-1 text-[10px]"
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>CHARACTER</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onEditFace(2, p1Input || 'PLAYER 1', p2Input || 'PLAYER 2', selectedFormat);
                }}
                className="btn-base btn-secondary mt-1.5 min-h-[32px] w-full px-1.5 py-1 text-[10px]"
              >
                <Camera className="h-3 w-3 shrink-0 text-[#FF6B6B]" />
                <span>{player2FaceImg ? 'EDIT FACE' : 'CUSTOM FACE'}</span>
              </button>
            </div>
          </div>

          {/* Shared Arena World Banner */}
          <div className="mt-2.5 flex items-center justify-between rounded-xl border-2 border-[#24415C]/15 bg-[#EEF7FF] px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 shrink-0 text-[#3998F7]" />
              <div className="text-left">
                <div className="text-[9px] font-black tracking-wider text-[#24415C]/60 uppercase">
                  SHARED ARENA WORLD
                </div>
                <div className="font-display text-xs leading-tight font-bold text-[#24415C]">
                  {activeWorld.name}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onChangeWorld(p1Input || 'PLAYER 1', p2Input || 'PLAYER 2', selectedFormat);
              }}
              className="btn-base btn-secondary min-h-[28px] px-2.5 py-0.5 text-[10px]"
            >
              CHANGE
            </button>
          </div>

          {/* Primary Actions */}
          <div className="mt-2.5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onStartMatch(p1Input, p2Input, selectedFormat);
              }}
              className="btn-base btn-green min-h-[48px] w-full text-base tracking-wide sm:text-lg"
            >
              <Play className="h-5 w-5 fill-white text-white" />
              <span>{isTournament ? 'START TOURNAMENT' : 'START MATCH'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onBack();
              }}
              className="btn-base btn-secondary min-h-[38px] w-full text-xs"
            >
              <span>BACK TO MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
