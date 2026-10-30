import React from 'react';
import { Dancer } from '../domain/types';

// A 2vs2 team's picture. An uploaded team photo always wins; without one, the team is assembled from its two
// dancers' own photos, so a fresh draw or a late swap needs no new composite. Placeholder only as a last resort.

interface Props {
  photoUrl?: string;
  dancers: (Dancer | undefined)[];
  placeholder: string;
  alt?: string;
}

const halfBodies = (dancers: (Dancer | undefined)[]) => {
  const urls = dancers.map((d) => d?.halfBodyUrl?.trim()).filter((u): u is string => Boolean(u));
  return urls.length === 2 ? urls : null;
};

/**
 * Large picture (LED, team card): the two half-body cut-outs standing side by side, shoulders slightly
 * overlapping, both on the bottom edge. `className` styles the single image (team photo / placeholder),
 * `boxClassName` the side-by-side box, `cutoutClassName` each cut-out (e.g. a drop shadow on the LED).
 */
export const TeamPhoto: React.FC<Props & { className: string; boxClassName: string; cutoutClassName?: string }> = ({
  photoUrl,
  dancers,
  placeholder,
  alt = '',
  className,
  boxClassName,
  cutoutClassName = '',
}) => {
  const pair = photoUrl ? null : halfBodies(dancers);
  if (!pair) return <img src={photoUrl || placeholder} alt={alt} className={className} />;
  return (
    <div role="img" aria-label={alt} className={`flex items-end justify-center ${boxClassName}`}>
      {pair.map((url, i) => (
        <img
          key={i} // the two members may share a photo
          src={url}
          alt=""
          className={`h-full w-auto min-w-0 max-w-[58%] object-contain object-bottom ${i === 1 ? '-ml-[10%]' : ''} ${cutoutClassName}`}
        />
      ))}
    </div>
  );
};

/** Small round thumbnail (bracket rows, operator cards): the two dancers' avatars overlapping. */
export const TeamThumb: React.FC<Props & { className: string; overlapClassName?: string }> = ({
  photoUrl,
  dancers,
  placeholder,
  alt = '',
  className,
  overlapClassName = '-ml-3',
}) => {
  const avatars = dancers.map((d) => d?.avatarUrl?.trim()).filter((u): u is string => Boolean(u));
  if (photoUrl || avatars.length < 2) return <img loading="lazy" decoding="async" src={photoUrl || placeholder} alt={alt} className={className} />;
  return (
    <span role="img" aria-label={alt} className="flex shrink-0">
      {avatars.map((url, i) => (
        <img key={i} loading="lazy" decoding="async" src={url} alt="" className={`${className} ${i === 1 ? overlapClassName : ''}`} />
      ))}
    </span>
  );
};
