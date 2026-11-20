import { getCharacterById, RARITY_META } from '../character/CharacterRegistry';

export function characterRegistryHasRareOrHigher(unlockedCharacterIds: readonly string[]): boolean {
  return unlockedCharacterIds.some((id) => {
    const def = getCharacterById(id);
    return RARITY_META[def.rarity].rank >= 3; // RARE, EPIC, LEGENDARY, MYTHIC
  });
}
