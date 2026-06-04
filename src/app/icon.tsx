import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), 'public/logo_sq.png'));

  return new ImageResponse(
    (
      <img
        src={`data:image/png;base64,${logo.toString('base64')}`}
        alt="TakaPilot"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    ),
    size
  );
}
