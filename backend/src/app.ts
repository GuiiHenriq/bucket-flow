import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";
import { ApolloServer } from "apollo-server-koa";
import { typeDefs, resolvers } from "./graphql/schema";
import { authMiddleware } from "./middlewares/auth";
import { routes } from "./routes";

const app = new Koa();

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => {
    return { user: ctx.state.user };
  },
});

// Middleware
app.use(logger());
app.use(bodyParser());

app.use(authMiddleware);

const router = new Router();
routes(router);
app.use(router.routes()).use(router.allowedMethods());

apolloServer.start().then(() => {
  apolloServer.applyMiddleware({ app });
});

export { app };
