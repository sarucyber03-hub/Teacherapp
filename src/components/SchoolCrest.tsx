/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import schoolCrestLogo from '../assets/images/school_crest_white_bg_1780664957027.png';

interface SchoolCrestProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function SchoolCrest({ className = '', size = 'md' }: SchoolCrestProps) {
  const [imageError, setImageError] = useState(false);

  // Dimensions based on size preset
  const dimensions = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const textSizes = {
    sm: 'text-[6px]',
    md: 'text-[9px]',
    lg: 'text-[12px]',
    xl: 'text-[16px]',
  };

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {!imageError ? (
        <img
          src={schoolCrestLogo}
          alt="Kn/Tharumapuram Central College Crest"
          className={`${dimensions[size]} object-contain`}
          onError={() => {
            console.log("Crest image not found, falling back to SVG vector crest");
            setImageError(true);
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        /* High-fidelity custom SVG Vector replica of the actual crest */
        <svg
          viewBox="0 0 400 400"
          className={`${dimensions[size]} drop-shadow-md select-none`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main White Circular Box */}
          <circle cx="200" cy="190" r="130" fill="white" stroke="#BF8F00" strokeWidth="4" />
          
          {/* Internal Circular Border */}
          <circle cx="200" cy="190" r="126" fill="none" stroke="#2B2B2B" strokeWidth="2" />

          {/* Golden Sun & Rays */}
          <g id="solar-rays">
            {/* Sun Core */}
            <path d="M 160 160 Q 200 130 240 160 Z" fill="#FF5500" />
            <circle cx="200" cy="162" r="24" fill="#FF9900" />
            
            {/* Individual Sun Ray Paths */}
            <line x1="200" y1="130" x2="200" y2="108" stroke="#FF5500" strokeWidth="4" strokeLinecap="round" />
            <line x1="175" y1="135" x2="162" y2="115" stroke="#FF5500" strokeWidth="4" strokeLinecap="round" />
            <line x1="225" y1="135" x2="238" y2="115" stroke="#FF5500" strokeWidth="4" strokeLinecap="round" />
            <line x1="155" y1="148" x2="135" y2="135" stroke="#FF5500" strokeWidth="4" strokeLinecap="round" />
            <line x1="245" y1="148" x2="265" y2="135" stroke="#FF5500" strokeWidth="4" strokeLinecap="round" />
            <line x1="148" y1="168" x2="125" y2="162" stroke="#FF5500" strokeWidth="4" strokeLinecap="round" />
            <line x1="252" y1="168" x2="275" y2="162" stroke="#FF5500" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Golden Ears of Rice (Paddy Ears) Framing Both Sides */}
          <path
            d="M 102 240 C 95 180, 115 130, 200 110"
            fill="none"
            stroke="#DAA520"
            strokeWidth="3"
            strokeDasharray="2,2"
          />
          <path
            d="M 298 240 C 305 180, 285 130, 200 110"
            fill="none"
            stroke="#DAA520"
            strokeWidth="3"
            strokeDasharray="2,2"
          />
          
          {/* Left golden leaves */}
          <g fill="#DAA520">
            <ellipse cx="106" cy="220" rx="8" ry="16" transform="rotate(-30 106 220)" />
            <ellipse cx="103" cy="195" rx="8" ry="16" transform="rotate(-20 103 195)" />
            <ellipse cx="108" cy="170" rx="8" ry="16" transform="rotate(-10 108 170)" />
            <ellipse cx="118" cy="148" rx="8" ry="16" transform="rotate(5 118 148)" />
            <ellipse cx="134" cy="129" rx="8" ry="16" transform="rotate(20 134 129)" />
            <ellipse cx="155" cy="117" rx="8" ry="16" transform="rotate(40 155 117)" />
            <ellipse cx="178" cy="111" rx="8" ry="16" transform="rotate(60 178 111)" />
          </g>
          
          {/* Right golden leaves */}
          <g fill="#DAA520">
            <ellipse cx="294" cy="220" rx="8" ry="16" transform="rotate(30 294 220)" />
            <ellipse cx="297" cy="195" rx="8" ry="16" transform="rotate(20 297 195)" />
            <ellipse cx="292" cy="170" rx="8" ry="16" transform="rotate(10 292 170)" />
            <ellipse cx="282" cy="148" rx="8" ry="16" transform="rotate(-5 282 148)" />
            <ellipse cx="266" cy="129" rx="8" ry="16" transform="rotate(-20 266 129)" />
            <ellipse cx="245" cy="117" rx="8" ry="16" transform="rotate(-40 245 117)" />
            <ellipse cx="222" cy="111" rx="8" ry="16" transform="rotate(-60 222 111)" />
          </g>

          {/* School Slates with Golden Rope (Education Segment) */}
          <g id="slates-books" stroke="#333" strokeWidth="1">
            {/* Top Yellow Slate */}
            <rect x="140" y="170" width="108" height="24" rx="4" fill="#FFEB3B" stroke="#BF8F00" strokeWidth="3" transform="rotate(-10 194 182)" />
            {/* Slate text: அகரமுதல */}
            <text x="194" y="184" textAnchor="middle" fontStyle="normal" fontWeight="bold" fontSize="10" fill="#000" transform="rotate(-10 194 182)" fontFamily="sans-serif">
              அகர முதல
            </text>

            {/* Bottom Dark Slate */}
            <rect x="146" y="196" width="112" height="26" rx="4" fill="#2E2E2E" stroke="#BF8F00" strokeWidth="3" transform="rotate(-8 202 209)" />
            {/* Slate text: எழுத்தெல்லாம் */}
            <text x="202" y="211" textAnchor="middle" fontWeight="bold" fontSize="9" fill="#FFF" transform="rotate(-8 202 209)" fontFamily="sans-serif">
              எழுத்தெல்லாம்
            </text>

            {/* Hanging golden rope lines connecting slates */}
            <path d="M 144 175 C 130 185, 132 205, 148 201" fill="none" stroke="#DAA520" strokeWidth="3" />
            <path d="M 238 160 C 255 170, 252 195, 238 190" fill="none" stroke="#DAA520" strokeWidth="3" />
          </g>

          {/* Traditional Agricultural Hand-Plough (Branding agricultural heritage) */}
          <path
            d="M 110 188 L 135 188 L 164 245 L 172 250 L 225 250 Q 230 250 230 248 L 226 244 L 174 242 Z"
            fill="#3E2723"
            stroke="#212121"
            strokeWidth="1.5"
          />
          {/* Plough handle */}
          <line x1="110" y1="188" x2="118" y2="198" stroke="#3E2723" strokeWidth="4" strokeLinecap="round" />
          {/* Iron plough share */}
          <path d="M 172 245 L 234 251 Q 238 252 225 242 Z" fill="#757575" />

          {/* UPPER BROWN RIBBON: "வாழ்வாங்கு வாழக் கல்வி" (Tamil Scripture on top) */}
          <path id="top-ribbon-path" d="M 72 155 Q 200 45 328 155" fill="none" />
          <path
            d="M 68 150 C 130 55, 270 55, 332 150 C 312 165, 290 140, 200 95 C 110 140, 88 165, 68 150 Z"
            fill="#4E342E"
            stroke="#DAA520"
            strokeWidth="2"
          />
          {/* Curved Text along path */}
          <text fontSize="12" fill="#FFEB3B" fontWeight="bold" fontFamily="sans-serif">
            <textPath href="#top-ribbon-path" startOffset="50%" textAnchor="middle">
              வாழ்வாங்கு வாழக் கல்வி
            </textPath>
          </text>

          {/* LOWER BROWN RIBBON: "கிளி/தருமபுரம் மத்திய கல்லூரி" (Tamil Scripture on bottom) */}
          <path id="bottom-ribbon-path" d="M 50 220 Q 200 375 350 220" fill="none" />
          {/* Curved Ribbon Ribbon Body */}
          <path
            d="M 50 220 Q 200 365 350 220 C 375 250, 410 270, 360 300 Q 200 430, 40 300 C -10 270, 25 250, 50 220 Z"
            fill="#4E342E"
            stroke="#DAA520"
            strokeWidth="2.5"
          />
          {/* Ribbon Tail ends overlay */}
          <path d="M 25 250 L 5 285 L 45 280 Z" fill="#2B1B17" />
          <path d="M 375 250 L 395 285 L 355 280 Z" fill="#2B1B17" />
          
          {/* Curved bottom text */}
          <text fontSize="13.5" fill="#FFFFFF" fontWeight="bold" fontFamily="sans-serif">
            <textPath href="#bottom-ribbon-path" startOffset="50%" textAnchor="middle">
              கிளி/தருமபுரம் மத்திய கல்லூரி
            </textPath>
          </text>
        </svg>
      )}
    </div>
  );
}
