import { prisma } from "../../../lib/prisma";
import withGuardAuth from "../../../lib/withGuardAuth";
import { Prisma } from "../../../generated/prisma/client";

export const POST = withGuardAuth(async (req: Request, { session }) => {
  try {
    const { title, messages } = await req.json();

    const created = prisma.chatSession.create({
      data: {
        userId: session.user.id,
        title,
        messages,
      },
    });

    return new Response(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if ((error.code = "P2003")) {
        return Response.json({ error: "User not found" }, { status: 400 });
      }

      if ((error.code = "P2002")) {
        return Response.json({ error: "Already exists" }, { status: 409 });
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
