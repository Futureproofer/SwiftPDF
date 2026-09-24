/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SwiftIconProps {
  className?: string;
}

/**
 * SwiftIcon: A dynamic, aerodynamic swift bird / supersonic speed silhouette
 * with swept-back crescent wings and speed trails conveying velocity and precision.
 */
export const SwiftIcon: React.FC<SwiftIconProps> = ({ className = 'w-4 h-4' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Aerodynamic swift bird swooping forward with swept wings and speed trails */}
      <path d="M21.75 3.25c-.28 0-.54.12-.73.32-2.15 2.2-5.45 4.88-8.82 6.43-1.6.74-3.32 1.25-5.1 1.4-1.25.1-2.48.02-3.7-.28-.53-.13-1.04.28-1.04.82 0 .34.2.65.51.78 2.05.88 4.25 1.25 6.48 1.05 2.1-.19 4.14-.88 6.02-1.98l.38-.23-4.22 5.62c-.44.59-.19 1.44.49 1.7.53.2 1.15.02 1.47-.44l4.98-7.12.3-.43c2.4-3.5 3.52-5.95 3.65-6.6.09-.44-.22-.84-.69-.87-.06 0-.12-.08-.18-.08z" />
      {/* Swift speed streaks / motion wake */}
      <path
        d="M2.5 8.25c2.2.4 4.3 1.2 6.2 2.3l-1.8.8c-1.6-.9-3.3-1.6-5.1-2 .3-.4.5-.8.7-1.1zm-.8 8.5c2.4-.2 4.7-.8 6.8-1.8l-1.5 1.5c-1.8.8-3.7 1.3-5.7 1.4.1-.4.2-.8.4-1.1z"
        opacity="0.75"
      />
    </svg>
  );
};

/**
 * SwiftLogoBadge: A gradient container with the swift bird and dynamic motion accent
 */
export const SwiftLogoBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 rounded-md',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-10 h-10 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={`relative bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center shadow-sm shadow-indigo-500/25 ${sizeClasses[size]} ${className}`}
    >
      <SwiftIcon className={`${iconSizes[size]} drop-shadow-xs text-white`} />
      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
    </div>
  );
};
