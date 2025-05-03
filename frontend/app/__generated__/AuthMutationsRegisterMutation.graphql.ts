/**
 * @generated SignedSource<<77535e7e10673da8f4ba7e12f696076d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RegisterInput = {
  password: string;
  username: string;
};
export type AuthMutationsRegisterMutation$variables = {
  input: RegisterInput;
};
export type AuthMutationsRegisterMutation$data = {
  readonly register: {
    readonly token: string;
    readonly user: {
      readonly id: string;
      readonly username: string;
    };
  };
};
export type AuthMutationsRegisterMutation = {
  response: AuthMutationsRegisterMutation$data;
  variables: AuthMutationsRegisterMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "AuthPayload",
    "kind": "LinkedField",
    "name": "register",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "token",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "User",
        "kind": "LinkedField",
        "name": "user",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "username",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "AuthMutationsRegisterMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "AuthMutationsRegisterMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d9ec2292723d5f24472f58bcf6398251",
    "id": null,
    "metadata": {},
    "name": "AuthMutationsRegisterMutation",
    "operationKind": "mutation",
    "text": "mutation AuthMutationsRegisterMutation(\n  $input: RegisterInput!\n) {\n  register(input: $input) {\n    token\n    user {\n      id\n      username\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "6b66a220c5be1800f5e260672cc729ee";

export default node;
