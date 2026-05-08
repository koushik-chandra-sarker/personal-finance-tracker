import { ImageResponse } from 'next/og';

export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 48%, #4f46e5 100%)',
          borderRadius: 16,
          color: 'white',
          fontSize: 23,
          fontWeight: 900,
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
        }}
      >
        tk
        <div
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            background: 'white',
            color: '#4f46e5',
            fontSize: 13,
            fontWeight: 900,
            transform: 'rotate(45deg)',
          }}
        >
          ^
        </div>
      </div>
    ),
    size
  );
}
