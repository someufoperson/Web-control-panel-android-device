import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0a0c0f;
`;

const LoginBox = styled.div`
  background-color: #0e1215;
  border-radius: 16px;
  padding: 40px 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  border: 1px solid #232b30;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: #f0f6fa;
  margin-bottom: 32px;
  text-align: center;
`;

const Field = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #a0b3ba;
`;

const StyledInput = styled(Input)`
  background-color: #1e2428;
  border: 1px solid #313d45;
  color: #fff;
  width: 100%;

  &:focus {
    border-color: #3b8c7a;
    box-shadow: 0 0 0 2px rgba(43, 110, 92, 0.3);
  }
`;

const LoginButton = styled(Button)`
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  font-size: 16px;
`;

const Hint = styled.div`
  margin-top: 24px;
  padding: 12px;
  background-color: #1a2126;
  border-radius: 8px;
  color: #b3c2cc;
  font-size: 13px;
  text-align: center;
  border: 1px dashed #3e4a52;
`;

const LoginPage = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: 'login',
    password: 'password',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // Имитация проверки credentials
    setTimeout(() => {
      if (credentials.username === 'Scoorpion' && credentials.password === 'Scoorpion2025$') {
        // Сохраняем флаг авторизации
        localStorage.setItem('isAuthenticated', 'true');
        toast.success('✅ Успешный вход');
        navigate('/devices');
      } else {
        toast.error('❌ Неверный логин или пароль');
      }
      setLoading(false);
    }, 500); // небольшая задержка для имитации
  };

  return (
    <Container>
      <LoginBox>
        <Title>🔐 Вход в систему</Title>
        <form onSubmit={handleSubmit}>
          <Field>
            <Label>Логин</Label>
            <StyledInput
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="Введите логин"
              autoComplete="username"
            />
          </Field>
          <Field>
            <Label>Пароль</Label>
            <StyledInput
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Введите пароль"
              autoComplete="current-password"
            />
          </Field>
          <LoginButton type="submit" variant="primary" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </LoginButton>
        </form>
      </LoginBox>
    </Container>
  );
};

export default LoginPage;