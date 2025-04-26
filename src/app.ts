import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";
import { ApolloServer } from "apollo-server-koa";
import { authMiddleware } from "./middlewares/auth";

const app = new Koa();

const apolloServer = new ApolloServer({
  context: ({ ctx }) => {
    return { user: ctx.state.user };
  },
});

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
