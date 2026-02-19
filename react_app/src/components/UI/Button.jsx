import styled from 'styled-components';
import { memo } from 'react';

const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: 0.2s;
  background-color: ${({ variant }) =>
    variant === 'primary' ? '#2b6e5c' : 'transparent'};
  color: ${({ variant }) => (variant === 'primary' ? '#fff' : '#b3c2cc')};
  border: 1px solid ${({ variant }) => (variant === 'primary' ? '#2b6e5c' : '#3e4a52')};

  &:hover {
    background-color: ${({ variant }) =>
      variant === 'primary' ? '#1f5647' : '#1e2a30'};
    border-color: ${({ variant }) => (variant === 'primary' ? '#1f5647' : '#5b6b76')};
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Button = memo(({ children, icon, variant = 'primary', ...props }) => (
  <StyledButton variant={variant} {...props}>
    {icon && <span>{icon}</span>}
    {children}
  </StyledButton>
));

export default Button;