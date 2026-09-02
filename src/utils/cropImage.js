// src/utils/cropImage.js
//
// Feature (Aug 2026) — crop tool for Section D craft images. Works
// identically whether the source is a brand-new upload or an image
// that's been sitting on a studio's profile for months — both cases are
// "an image at a URL" from here, which is the whole point of building
// this as a single mechanism instead of a separate "crop before upload"
// and "crop after upload" path.
//
// Loading a remote image into a canvas and reading pixels back out
// (canvas.toBlob) is blocked by browsers ("tainted canvas") unless the
// server serving that image sends permissive CORS headers — our studio
// images are served from GCS, which doesn't send those by default. This
// only works because of the GCS bucket CORS config that shipped
// alongside this feature (see the CORS steps given with this build) —
// without it, createImage() below will still load the image visually
// fine, but getCroppedImageBlob() will throw a SecurityError the moment
// it tries to read canvas pixels.

const MAX_OUTPUT_DIMENSION = 1600; // cap the long side of the exported crop

export function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Required for canvas pixel access on a cross-origin image — see
    // the module docstring above for why this depends on GCS CORS.
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (e) => reject(e));
    image.src = url;
  });
}

/**
 * Crops `pixelCrop` (the {x, y, width, height} region react-easy-crop
 * reports via onCropComplete, in the SOURCE image's real pixel
 * coordinates) out of the image at `imageUrl`, and returns a JPEG Blob.
 *
 * Scales the OUTPUT down if the cropped region's long side exceeds
 * MAX_OUTPUT_DIMENSION — a seller's original photo can be a 20+
 * megapixel phone photo; there's no reason to upload a crop that large
 * for how this ever actually displays (see StudioProfile.jsx's
 * .craft-detail-img, rendered at roughly 600-900px wide).
 */
export async function getCroppedImageBlob(imageUrl, pixelCrop, quality = 0.9) {
  const image = await createImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context');

  let targetWidth = Math.round(pixelCrop.width);
  let targetHeight = Math.round(pixelCrop.height);
  const longSide = Math.max(targetWidth, targetHeight);
  if (longSide > MAX_OUTPUT_DIMENSION) {
    const scale = MAX_OUTPUT_DIMENSION / longSide;
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,   // source region
    0, 0, targetWidth, targetHeight                                 // destination (possibly downscaled)
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Canvas export produced an empty blob')); return; }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}