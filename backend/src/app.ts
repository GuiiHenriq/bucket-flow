import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";
import cors from "@koa/cors";
import { ApolloServer } from "apollo-server-koa";
import { typeDefs, resolvers } from "./graphql/schema";
import { authMiddleware } from "./middlewares/auth";

const app = new Koa();

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => {
    console.log(
      `GraphQL Request - Auth Status: ${
        ctx.state.user ? "Authenticated" : "Not Authenticated"
      }`
    );

    return { user: ctx.state.user };
  },
});

// Middleware
app.use(cors());
app.use(logger());
app.use(bodyParser());

app.use(authMiddleware);

const router = new Router();
app.use(router.routes()).use(router.allowedMethods());

apolloServer.start().then(() => {
  apolloServer.applyMiddleware({ app });
});

export { app };
