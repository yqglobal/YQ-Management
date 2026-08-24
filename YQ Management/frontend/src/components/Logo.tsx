import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  href?: string;
  forceTheme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  width = 151, 
  height = 24,
  href = '/',
  forceTheme
}) => {
  const content = (
    <div className={`relative flex items-center ${className}`} style={{ width, height }}>
      {/* Light Mode Logo */}
      <Image
        src="/qmova-light-logo.png"
        alt="Qmova Logo"
        width={width}
        height={height}
        unoptimized
        style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
        className={forceTheme === 'light' ? 'block' : forceTheme === 'dark' ? 'hidden' : 'block dark:hidden'}
        priority
      />
      {/* Dark Mode Logo */}
      <Image
        src="/qmova-dark-logo.png"
        alt="Qmova Logo"
        width={width}
        height={height}
        unoptimized
        style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
        className={forceTheme === 'dark' ? 'block' : forceTheme === 'light' ? 'hidden' : 'hidden dark:block'}
        priority
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    );
  }

  return content;
};
