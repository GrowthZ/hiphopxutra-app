// High-fidelity Swiss sports breaking placeholders as clean SVG Data URLs

export const DEFAULT_MALE_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgMale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="accentMale" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bgMale)"/>
  <rect x="2" y="2" width="196" height="196" fill="none" stroke="#27272a" stroke-width="2"/>
  
  <!-- Subtle athletic grid lines -->
  <line x1="0" y1="100" x2="200" y2="100" stroke="#27272a" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="100" y1="0" x2="100" y2="200" stroke="#27272a" stroke-width="1" stroke-dasharray="4,4"/>

  <!-- Male Bboy Cap & Face Silhouette -->
  <g fill="#71717a">
    <!-- Cap Brim -->
    <path d="M 60 78 Q 100 62 148 74 L 140 82 Q 100 72 65 84 Z" fill="#a1a1aa"/>
    <!-- Cap Crown -->
    <path d="M 68 80 C 65 52, 90 44, 105 44 C 125 44, 138 56, 138 80 Z" fill="#52525b"/>
    <!-- Head/Jaw -->
    <path d="M 74 82 L 74 105 C 74 122, 90 134, 104 134 C 118 134, 132 122, 132 105 L 132 82 Z"/>
    <!-- Shoulders / Torso -->
    <path d="M 40 188 C 45 152, 65 142, 85 138 L 104 148 L 123 138 C 143 142, 163 152, 168 188 Z" fill="#3f3f46"/>
  </g>

  <!-- Tag Pill -->
  <rect x="62" y="162" width="76" height="20" rx="3" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="100" y="176" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="12" fill="#e4e4e7" letter-spacing="1">BBOY • NAM</text>
</svg>
`)}`;

export const DEFAULT_FEMALE_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgFemale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="accentFemale" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bgFemale)"/>
  <rect x="2" y="2" width="196" height="196" fill="none" stroke="#27272a" stroke-width="2"/>
  
  <!-- Subtle athletic grid lines -->
  <line x1="0" y1="100" x2="200" y2="100" stroke="#27272a" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="100" y1="0" x2="100" y2="200" stroke="#27272a" stroke-width="1" stroke-dasharray="4,4"/>

  <!-- Female Bgirl Hair & Silhouette -->
  <g fill="#71717a">
    <!-- Hair Bun / Bandana -->
    <circle cx="100" cy="46" r="14" fill="#a1a1aa"/>
    <path d="M 72 82 C 68 56, 82 50, 100 50 C 118 50, 132 56, 128 82 Z" fill="#52525b"/>
    <!-- Head/Jaw -->
    <path d="M 76 82 L 76 102 C 76 118, 90 128, 100 128 C 110 128, 124 118, 124 102 L 124 82 Z"/>
    <!-- Ponytail / Locks -->
    <path d="M 124 72 C 144 80, 148 108, 138 128 C 132 118, 130 96, 122 84 Z" fill="#52525b"/>
    <!-- Shoulders / Torso -->
    <path d="M 45 188 C 50 155, 68 142, 86 135 L 100 144 L 114 135 C 132 142, 150 155, 155 188 Z" fill="#3f3f46"/>
  </g>

  <!-- Tag Pill -->
  <rect x="60" y="162" width="80" height="20" rx="3" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
  <text x="100" y="176" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="12" fill="#f472b6" letter-spacing="1">BGIRL • NỮ</text>
</svg>
`)}`;

export const DEFAULT_MALE_HALFBODY = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 440" width="320" height="440">
  <defs>
    <radialGradient id="glowMale" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="maleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <rect width="320" height="440" fill="url(#glowMale)"/>
  
  <!-- Male Breaker Pose Silhouette in athletic sports stance -->
  <g fill="url(#maleGrad)">
    <!-- Cap tilted -->
    <path d="M 125 70 Q 160 55, 195 72 L 188 80 Q 160 68, 130 78 Z" fill="#e2e8f0"/>
    <path d="M 132 72 C 130 48, 152 40, 165 40 C 180 40, 190 50, 188 72 Z" fill="#94a3b8"/>
    <!-- Head -->
    <path d="M 138 74 L 138 98 C 138 114, 150 124, 162 124 C 174 124, 184 114, 184 98 L 184 74 Z"/>
    
    <!-- Torso in Dynamic Stance -->
    <path d="M 110 140 C 95 180, 85 240, 95 320 L 225 320 C 235 240, 225 180, 210 140 Z"/>
    <!-- Left Arm outstretched -->
    <path d="M 112 142 L 50 190 L 65 210 L 115 175 Z" fill="#94a3b8"/>
    <!-- Right Arm flexing -->
    <path d="M 208 142 L 268 180 L 255 205 L 202 175 Z" fill="#94a3b8"/>
    <!-- Lower Body / Sweatpants -->
    <path d="M 95 320 L 80 440 L 150 440 L 158 360 L 165 360 L 175 440 L 245 440 L 225 320 Z" fill="#334155"/>
  </g>
</svg>
`)}`;

export const DEFAULT_FEMALE_HALFBODY = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 440" width="320" height="440">
  <defs>
    <radialGradient id="glowFemale" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#4c0519" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="femaleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fbcfe8"/>
      <stop offset="50%" stop-color="#f472b6"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <rect width="320" height="440" fill="url(#glowFemale)"/>

  <!-- Female Breaker Pose Silhouette in athletic sports stance -->
  <g fill="url(#femaleGrad)">
    <!-- Hair bun / Bandana -->
    <circle cx="160" cy="42" r="13" fill="#fdf2f8"/>
    <path d="M 136 74 C 132 50, 144 44, 160 44 C 176 44, 188 50, 184 74 Z" fill="#f472b6"/>
    <!-- Head -->
    <path d="M 140 74 L 140 94 C 140 108, 150 118, 160 118 C 170 118, 180 108, 180 94 L 180 74 Z"/>
    
    <!-- Torso Athletic -->
    <path d="M 120 135 C 108 175, 100 230, 108 310 L 212 310 C 220 230, 212 175, 200 135 Z"/>
    <!-- Left Arm toprock -->
    <path d="M 122 138 L 62 175 L 75 198 L 124 168 Z" fill="#cbd5e1"/>
    <!-- Right Arm style -->
    <path d="M 198 138 L 258 170 L 245 195 L 192 165 Z" fill="#cbd5e1"/>
    <!-- Lower Body / Cargo pants -->
    <path d="M 108 310 L 95 440 L 152 440 L 158 355 L 164 355 L 170 440 L 225 440 L 212 310 Z" fill="#334155"/>
  </g>
</svg>
`)}`;

export const DEFAULT_TEAM_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" width="480" height="320">
  <defs>
    <radialGradient id="glowTeam" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="teamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <rect width="480" height="320" fill="url(#glowTeam)"/>

  <!-- Left Dancer (Bboy) -->
  <g fill="url(#teamGrad)">
    <path d="M 148 64 Q 180 50, 210 65 L 205 72 Q 180 60, 152 70 Z" fill="#f1f5f9"/>
    <circle cx="178" cy="85" r="22" fill="#94a3b8"/>
    <path d="M 120 135 C 110 180, 100 240, 110 320 L 220 320 C 225 240, 220 180, 205 135 Z"/>
    <path d="M 120 140 L 70 190 L 88 208 L 132 170 Z" fill="#64748b"/>
  </g>

  <!-- Right Dancer (Partner) -->
  <g fill="url(#teamGrad)">
    <circle cx="302" cy="85" r="22" fill="#94a3b8"/>
    <path d="M 275 135 C 260 180, 255 240, 265 320 L 375 320 C 385 240, 375 180, 360 135 Z"/>
    <path d="M 360 140 L 410 190 L 392 208 L 348 170 Z" fill="#64748b"/>
  </g>
</svg>
`)}`;

/**
 * Returns the effective avatar URL with placeholder fallback according to gender and custom settings
 */
export function getDancerAvatarUrl(
  dancer?: { gender?: 'male' | 'female'; avatarUrl?: string },
  customPlaceholders?: { maleAvatarUrl?: string; femaleAvatarUrl?: string }
): string {
  if (dancer?.avatarUrl && dancer.avatarUrl.trim()) {
    return dancer.avatarUrl;
  }
  const isFemale = dancer?.gender === 'female';
  if (isFemale) {
    return customPlaceholders?.femaleAvatarUrl?.trim() || DEFAULT_FEMALE_AVATAR;
  }
  return customPlaceholders?.maleAvatarUrl?.trim() || DEFAULT_MALE_AVATAR;
}

/**
 * Returns the effective half-body URL with placeholder fallback according to gender and custom settings
 */
export function getDancerHalfBodyUrl(
  dancer?: { gender?: 'male' | 'female'; halfBodyUrl?: string },
  customPlaceholders?: { maleHalfBodyUrl?: string; femaleHalfBodyUrl?: string }
): string {
  if (dancer?.halfBodyUrl && dancer.halfBodyUrl.trim()) {
    return dancer.halfBodyUrl;
  }
  const isFemale = dancer?.gender === 'female';
  if (isFemale) {
    return customPlaceholders?.femaleHalfBodyUrl?.trim() || DEFAULT_FEMALE_HALFBODY;
  }
  return customPlaceholders?.maleHalfBodyUrl?.trim() || DEFAULT_MALE_HALFBODY;
}

/**
 * Returns the effective team photo URL with placeholder fallback
 */
export function getTeamPhotoUrl(
  team?: { teamPhotoUrl?: string },
  customPlaceholders?: { team2v2Url?: string }
): string {
  if (team?.teamPhotoUrl && team.teamPhotoUrl.trim()) {
    return team.teamPhotoUrl;
  }
  return customPlaceholders?.team2v2Url?.trim() || DEFAULT_TEAM_PHOTO;
}

/**
 * Strips BBOY / BGIRL / B-BOY / B-GIRL prefixes from dancer names (case-insensitive)
 * e.g., 'BBOY T-REX' -> 'T-REX', 'BGIRL MAYA' -> 'MAYA'
 */
export function stripBreakerPrefix(name?: string): string {
  if (!name) return '';
  return name.replace(/^(BBOY|BGIRL|B-BOY|B-GIRL|B BOY|B GIRL)\s+/i, '').trim();
}

export const DEFAULT_JUDGE_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgJudgeAv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="goldJudge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bgJudgeAv)"/>
  <rect x="2" y="2" width="196" height="196" fill="none" stroke="#f59e0b" stroke-width="2" stroke-opacity="0.6"/>
  <!-- Headphone Band -->
  <path d="M 60 90 A 40 40 0 0 1 140 90" fill="none" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>
  <!-- Head Silhouette -->
  <circle cx="100" cy="85" r="28" fill="#52525b"/>
  <!-- Cap / Visor -->
  <path d="M 72 75 Q 100 60 135 70 L 130 78 Q 100 70 76 80 Z" fill="#fbbf24"/>
  <!-- Earphones -->
  <rect x="54" y="80" width="12" height="24" rx="4" fill="#f59e0b"/>
  <rect x="134" y="80" width="12" height="24" rx="4" fill="#f59e0b"/>
  <!-- Torso with judge lanyard -->
  <path d="M 45 185 C 50 140, 75 130, 100 130 C 125 130, 150 140, 155 185 Z" fill="#27272a"/>
  <!-- Judge Badge Ribbon -->
  <path d="M 88 130 L 96 165 L 104 165 L 112 130 Z" fill="url(#goldJudge)"/>
  <!-- Badge text -->
  <rect x="65" y="166" width="70" height="18" rx="3" fill="#09090b" stroke="#f59e0b" stroke-width="1"/>
  <text x="100" y="179" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="11" fill="#fbbf24" letter-spacing="1">GIÁM KHẢO</text>
</svg>
`)}`;

export const DEFAULT_JUDGE_FULL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 440" width="320" height="440">
  <defs>
    <radialGradient id="glowJudgeFull" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#b45309" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
    <linearGradient id="judgeSilhouette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="40%" stop-color="#d4d4d8"/>
      <stop offset="100%" stop-color="#3f3f46"/>
    </linearGradient>
  </defs>
  <rect width="320" height="440" fill="url(#glowJudgeFull)"/>
  <rect x="4" y="4" width="312" height="432" fill="none" stroke="url(#goldBorder)" stroke-width="2" rx="8"/>

  <!-- Athletic background grid -->
  <line x1="0" y1="120" x2="320" y2="120" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.15" stroke-dasharray="4,4"/>
  <line x1="0" y1="260" x2="320" y2="260" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.15" stroke-dasharray="4,4"/>

  <!-- Top Banner Tag -->
  <rect x="70" y="24" width="180" height="22" rx="4" fill="#18181b" stroke="#f59e0b" stroke-width="1"/>
  <text x="160" y="39" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="12" fill="#fbbf24" letter-spacing="2">OFFICIAL JUDGE • WDSF</text>

  <!-- Judge Silhouette in athletic posture -->
  <g fill="url(#judgeSilhouette)">
    <!-- Cap brim & crown -->
    <path d="M 120 85 Q 160 68 200 80 L 195 90 Q 160 80 125 93 Z" fill="#fbbf24"/>
    <circle cx="160" cy="98" r="24" fill="#71717a"/>
    <!-- Head & Neck -->
    <path d="M 144 110 L 144 132 L 176 132 L 176 110 Z"/>
    <!-- Torso with athletic jacket -->
    <path d="M 100 150 C 95 200, 90 260, 105 340 L 215 340 C 230 260, 225 200, 220 150 Z" fill="#27272a"/>
    <!-- Arms crossed / authoritative athletic stance -->
    <path d="M 100 155 L 70 215 L 90 235 L 130 185 Z" fill="#3f3f46"/>
    <path d="M 220 155 L 250 215 L 230 235 L 190 185 Z" fill="#3f3f46"/>
    <path d="M 95 220 L 225 220 L 215 255 L 105 255 Z" fill="#52525b"/>
    <!-- Lower Body -->
    <path d="M 105 340 L 95 430 L 150 430 L 158 370 L 162 370 L 170 430 L 225 430 L 215 340 Z" fill="#18181b"/>
  </g>

  <!-- Bottom Crest Label -->
  <rect x="40" y="375" width="240" height="38" rx="6" fill="#09090b" fill-opacity="0.9" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="160" y="395" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-weight="900" font-size="14" fill="#ffffff" letter-spacing="1">HỘI ĐỒNG GIÁM KHẢO</text>
  <text x="160" y="407" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-weight="700" font-size="10" fill="#fbbf24" letter-spacing="2">HIPHOP XỨ TRÀ 2026</text>
</svg>
`)}`;

/**
 * Returns effective Judge avatar URL with SVG fallback
 */
export function getJudgeAvatarUrl(judge?: { avatar?: string }): string {
  if (judge?.avatar && judge.avatar.trim()) {
    return judge.avatar;
  }
  return DEFAULT_JUDGE_AVATAR;
}

/**
 * Returns effective Judge full-body photo URL with SVG fallback
 */
export function getJudgeFullPhotoUrl(judge?: { fullPhotoUrl?: string; avatar?: string }): string {
  if (judge?.fullPhotoUrl && judge.fullPhotoUrl.trim()) {
    return judge.fullPhotoUrl;
  }
  if (judge?.avatar && judge.avatar.trim()) {
    return judge.avatar;
  }
  return DEFAULT_JUDGE_FULL;
}


