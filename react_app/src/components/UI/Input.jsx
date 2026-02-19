import styled from 'styled-components';

const StyledInput = styled.input`
  background-color: #1e2428;
  border: 1px solid #313d45;
  border-radius: 6px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  width: 100%;
  transition: 0.2s;

  &:focus {
    border-color: #3b8c7a;
    outline: none;
    box-shadow: 0 0 0 2px rgba(43, 110, 92, 0.3);
  }

  &::placeholder {
    color: #6c7a82;
  }
`;

export default StyledInput;