/**
 * Company logos and photos, stored in /public so links never break.
 * Logos: public/logos/{TICKER}.webp (192px). Photos: public/photos/{id}.webp (480x600),
 * from Unsplash under the Unsplash License (see public/photos/CREDITS.md).
 */

/** White-on-transparent logos that need a dark tile */
export const DARK_LOGOS = new Set(["AMZN", "GME", "MARA", "QQQ", "UBER", "UNH", "V"]);

/** Logos that already sit on their own square background */
export const FULL_BLEED_LOGOS = new Set(["AAPL", "CRCL", "DIA", "IWM", "TLT"]);

export const PHOTOS: Record<string, string> = {
  "nvdax": "/photos/nvdax.webp",
  "tslax": "/photos/tslax.webp",
  "aaplx": "/photos/aaplx.webp",
  "coinx": "/photos/coinx.webp",
  "amznx": "/photos/amznx.webp",
  "metax": "/photos/metax.webp",
  "nflxx": "/photos/nflxx.webp",
  "gldx": "/photos/gldx.webp",
  "spyx": "/photos/spyx.webp",
  "llyx": "/photos/llyx.webp",
  "pltrx": "/photos/pltrx.webp",
  "msftx": "/photos/msftx.webp"
};

export const PHOTO_SOURCES: Record<string, string> = {
  "nvdax": "https://unsplash.com/photos/1591488320449-011701bb6704",
  "tslax": "https://unsplash.com/photos/1617788138017-80ad40651399",
  "aaplx": "https://unsplash.com/photos/1510557880182-3d4d3cba35a5",
  "coinx": "https://unsplash.com/photos/1518546305927-5a555bb7020d",
  "amznx": "https://unsplash.com/photos/1586528116311-ad8dd3c8310d",
  "metax": "https://unsplash.com/photos/1622979135225-d2ba269cf1ac",
  "nflxx": "https://unsplash.com/photos/1574375927938-d5a98e8ffe85",
  "gldx": "https://unsplash.com/photos/1610375461246-83df859d849d",
  "spyx": "https://unsplash.com/photos/1590283603385-17ffb3a7f29f",
  "llyx": "https://unsplash.com/photos/1584308666744-24d5c474f2ae",
  "pltrx": "https://unsplash.com/photos/1551288049-bebda4e38f71",
  "msftx": "https://unsplash.com/photos/1633419461186-7d40a38105ec"
};
