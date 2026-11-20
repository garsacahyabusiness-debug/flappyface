import { characterSkinManager, SkinId } from '../character/CharacterSkinManager';
import { characterUnlockManager } from '../character/CharacterUnlockManager';
import { missionManager } from '../missions/MissionManager';
import { AvatarFrameId } from '../missions/MissionTypes';
import { currencyManager } from '../powerups/CurrencyManager';
import { LEVEL_REWARD_MAP } from './LevelRewardRegistry';
import { playerProgressionManager } from './PlayerProgressionManager';
import { LevelRewardGrantOutcome, ProgressionProfileId } from './PlayerProgressTypes';
import { getTitleById } from './TitleRegistry';

/**
 * Coordinates atomic Level Reward claims across Currency, Characters, Skins,
 * Titles, Avatar Frames, and Exclusive World Theme without circular manager dependencies.
 */
export function claimLevelRewardWithGrant(
  level: number,
  profileId: ProgressionProfileId = 'solo'
): LevelRewardGrantOutcome {
  const def = LEVEL_REWARD_MAP.get(level);
  if (!def) {
    return {
      success: false,
      level,
      coinsGranted: 0,
      gemsGranted: 0,
      summaryLabel: 'Reward tidak ditemukan',
    };
  }

  const profile = playerProgressionManager.getProfile(profileId);
  if (profile.claimedLevelRewards.includes(level)) {
    return {
      success: false,
      level,
      alreadyClaimed: true,
      coinsGranted: 0,
      gemsGranted: 0,
      summaryLabel: 'Reward sudah diklaim',
    };
  }

  if (profile.currentLevel < level) {
    return {
      success: false,
      level,
      coinsGranted: 0,
      gemsGranted: 0,
      summaryLabel: `Capai Level ${level} untuk membuka hadiah ini`,
    };
  }

  const marked = playerProgressionManager.markLevelRewardClaimed(level, profileId);
  if (!marked) {
    return {
      success: false,
      level,
      alreadyClaimed: true,
      coinsGranted: 0,
      gemsGranted: 0,
      summaryLabel: 'Reward sudah diklaim',
    };
  }

  let coinsGranted = def.coins ?? 0;
  let gemsGranted = def.gems ?? 0;
  let unlockedCharacterId: string | undefined;
  let unlockedCharacterName: string | undefined;
  let unlockedSkinId: SkinId | undefined;
  let unlockedTitleId: string | undefined = def.titleId;
  let unlockedFrameId: AvatarFrameId | undefined = def.avatarFrame;
  let unlockedWorldTheme = false;
  let usedFallback = false;

  if (def.characterRarity && profileId === 'solo') {
    const unlockedChar = characterUnlockManager.unlockFirstLockedByRarity(
      def.characterRarity,
      'level_reward'
    );
    if (unlockedChar) {
      unlockedCharacterId = unlockedChar.id;
      unlockedCharacterName = unlockedChar.name;
    } else {
      usedFallback = true;
      coinsGranted += def.fallbackCoins ?? 150;
      gemsGranted += def.fallbackGems ?? 8;
    }
  }

  if (def.skinId && profileId === 'solo') {
    const skinUnlocked = characterSkinManager.unlockMilestoneSkin(def.skinId, 'level_reward');
    if (skinUnlocked) {
      unlockedSkinId = def.skinId;
    } else {
      usedFallback = true;
      coinsGranted += def.fallbackCoins ?? 120;
      gemsGranted += def.fallbackGems ?? 6;
    }
  }

  if (def.avatarFrame && profileId === 'solo') {
    missionManager.grantFrameExternal(def.avatarFrame);
    unlockedFrameId = def.avatarFrame;
  }

  if (def.titleId && profileId === 'solo') {
    const tDef = getTitleById(def.titleId);
    missionManager.grantTitleExternal(tDef.name);
    unlockedTitleId = def.titleId;
  }

  if (def.worldThemeId === 'aurora_sky') {
    unlockedWorldTheme = true;
  }

  if ((coinsGranted > 0 || gemsGranted > 0) && profileId === 'solo') {
    currencyManager.awardEventOnce(`level_reward:${profileId}:${level}`, coinsGranted, gemsGranted);
    playerProgressionManager.recordCurrencyRewardStats(coinsGranted, gemsGranted, profileId);
  }

  const parts: string[] = [];
  if (unlockedCharacterName) parts.push(unlockedCharacterName);
  if (unlockedSkinId) parts.push(`${unlockedSkinId.toUpperCase()} Skin`);
  if (unlockedWorldTheme) parts.push('Aurora World Theme');
  if (unlockedFrameId) parts.push('Avatar Frame');
  if (unlockedTitleId) parts.push(`Title "${getTitleById(unlockedTitleId).name}"`);
  if (coinsGranted > 0) parts.push(`+${coinsGranted} Coins`);
  if (gemsGranted > 0) parts.push(`+${gemsGranted} Gems`);

  return {
    success: true,
    level,
    coinsGranted,
    gemsGranted,
    unlockedCharacterId,
    unlockedCharacterName,
    unlockedSkinId,
    unlockedTitleId,
    unlockedFrameId,
    unlockedWorldTheme,
    usedFallback,
    summaryLabel: parts.join(' · ') || def.title,
  };
}
