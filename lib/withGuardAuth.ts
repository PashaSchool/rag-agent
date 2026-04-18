import { auth } from "../auth";
import { Session } from "next-auth";

type AuthenticatedHandler<TContext = unknown> = (
  request: Request,
  session: TContext & { session: Session & { user: { id: string } } },
) => Promise<Response>;

export default function withGuargAuth<TContext = unknown>(
  handler: AuthenticatedHandler,
) {
  return async (request: Request, ctx: TContext) => {
    const session = await auth();

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    return handler(request, {
      ...ctx,
      session: session as Session & { user: { id: string } },
    });
  };
}
