import { Outlet, NavLink } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background-color: #0a0c0f;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  padding: 20px 32px;
  border-bottom: 1px solid #232b30;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #b3e0d0;
`;

const Nav = styled.nav`
  display: flex;
  gap: 24px;
`;

const StyledNavLink = styled(NavLink)`
  padding: 8px 12px;
  border-radius: 6px;
  color: #a0b3ba;
  font-size: 15px;
  font-weight: 500;
  transition: 0.2s;

  &.active {
    background-color: #1a2c30;
    color: #b3e0d0;
  }

  &:hover {
    color: #fff;
    background-color: #1e2a30;
  }
`;

const Main = styled.main`
  flex: 1;
  padding: 24px 32px;
`;

export const Layout = () => (
  <Container>
    <Header>
      <Logo>⚙️ Device Manager</Logo>
      <Nav>
        <StyledNavLink to="/devices">Устройства</StyledNavLink>
        <StyledNavLink to="/create">Добавить устройство в базу данных</StyledNavLink>
      </Nav>
    </Header>
    <Main>
      <Outlet />
    </Main>
  </Container>
);