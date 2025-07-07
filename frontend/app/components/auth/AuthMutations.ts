import { graphql } from 'relay-runtime';

export const registerMutation = graphql`
  mutation AuthMutationsRegisterMutation($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        username
      }
    }
  }
`;

export const loginMutation = graphql`
  mutation AuthMutationsLoginMutation($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        username
      }
    }
  }
`; 