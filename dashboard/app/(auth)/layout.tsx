//import node modules libraries
import { Container } from "react-bootstrap";

//import custom components
import Flex from "components/common/Flex";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex
      tag='main'
      direction='column'
      justifyContent='center'
      className='vh-100'>
      <section>
        <Container>{children}</Container>
      </section>
      <div className='custom-container'>
        <span className='me-1'>© All rights reserved by <a href="https://codescandy.com/" target="_blank">Codescandy</a>. Distributed by <a href="https://themewagon.com/" target="_blank">ThemeWagon</a>.</span>
      </div>
    </Flex>
  );
};

export default AuthLayout;
