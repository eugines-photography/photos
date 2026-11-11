import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {mkdir, readFile, rename, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Changing the recipe changes URLs, so browsers never reuse an outdated preview.
export async function prepareImage(input, outputDirectory, publicDirectory = 'generated/images', options = {}) {
  const quality = options.quality ?? 74;
  const recipe = `webp-${quality}-auto-orient-v1`;
  const original = await readFile(input);
  const hash = createHash('sha256').update(recipe).update(original).digest('hex').slice(0, 20);
  const metadata = await sharp(original).metadata();
  const rotated = metadata.orientation >= 5 && metadata.orientation <= 8;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  if (!width || !height) throw new Error(`Cannot read photograph dimensions: ${input}`);
  const widths = [...new Set((options.widths ?? [320, 640, 960, 1600]).map(size => Math.min(size, width)))];
  await mkdir(outputDirectory, {recursive: true});
  const variants = [];
  for (const size of widths) {
    const name = `${hash}-${size}.webp`;
    const destination = join(outputDirectory, name);
    let bytes = (await stat(destination).catch(() => null))?.size;
    if (!bytes) {
      const data = await sharp(original).rotate().resize({width: size, withoutEnlargement: true}).webp({quality, effort: 4}).toBuffer();
      const temporary = `${destination}.${process.pid}.tmp`;
      await writeFile(temporary, data);
      await rename(temporary, destination);
      bytes = data.length;
    }
    variants.push({src: `${publicDirectory}/${name}`, width: size, height: Math.round(height * size / width), bytes});
  }
  return {width, height, originalBytes: original.length, variants};
}
