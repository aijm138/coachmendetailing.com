import React from 'react';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  as?: 'button' | 'a';
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  as = 'button',
  href,
  ...props
}) => {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  if (as === 'a') {
    return (
      <a href={href} className={`${base} ${className}`} {...(props as any)}>
        {children}
      </a>
    );
  }
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
