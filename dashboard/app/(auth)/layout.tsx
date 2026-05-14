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
        <p className="mb-0">© 2024 AttendStack. A <a href="https://bhattsquare.com" target="_blank" rel="noopener noreferrer">Bhatt Square</a> Project.</p>
      </div>
    </Flex>
  );
};

export default AuthLayout;