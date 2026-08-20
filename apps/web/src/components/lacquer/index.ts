// Lacquer primitive barrel. Import from '@/components/lacquer' rather
// than reaching into individual files — Phase 4 screen work will
// touch many of these at once, and a single import line keeps the
// callsite readable.

export { PerryAvatar, type PerryAvatarProps } from './perry-avatar';
export { HeroCard, type HeroCardProps } from './hero-card';
export { LacquerChip, type LacquerChipProps, type LacquerChipVariant } from './chip';
export {
  EvidencePanel,
  type EvidencePanelProps,
  type EvidenceBullet,
  type EvidenceTone,
} from './evidence-panel';
export { CardArtFrame, type CardArtFrameProps, type CardArtSize } from './card-art-frame';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedControlItem,
} from './segmented-control';
export { BottomSheet, type BottomSheetProps } from './bottom-sheet';
