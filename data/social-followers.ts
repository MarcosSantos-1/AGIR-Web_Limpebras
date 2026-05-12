import type { SocialPublicationRede } from "@/data/social-posts";

/** Contagem de seguidores por rede (instantâneo atual; histórico mensal pode vir depois). */
export type SocialFollowerCounts = {
  facebook: number;
  instagram: number;
  linkedin: number;
  atualizadoEmMsFacebook: number | null;
  atualizadoEmMsInstagram: number | null;
  atualizadoEmMsLinkedin: number | null;
};

export const DEFAULT_SOCIAL_FOLLOWER_COUNTS: SocialFollowerCounts = {
  facebook: 0,
  instagram: 0,
  linkedin: 0,
  atualizadoEmMsFacebook: null,
  atualizadoEmMsInstagram: null,
  atualizadoEmMsLinkedin: null,
};

export const SOCIAL_NETWORK_ORDER: SocialPublicationRede[] = [
  "facebook",
  "instagram",
  "linkedin",
];

/** Um registo append-only na coleção `socialFollowerHistory`. */
export type FollowerHistoryRow = {
  id: string;
  rede: SocialPublicationRede;
  followers: number;
  recordedAtMs: number;
  yearMonth: string;
};
