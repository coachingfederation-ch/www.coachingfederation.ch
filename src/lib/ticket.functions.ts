/**
 * Public ticket lookup.
 *
 * Unauthenticated by design: the ticket code is the credential, so anyone
 * holding it may see the ticket it belongs to. The response carries only the
 * holder's own name plus public event content, and an unknown or cancelled
 * code returns nothing rather than an explanation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getTicket = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z
          .string()
          .trim()
          .min(16)
          .max(64)
          .regex(/^[A-Za-z0-9_-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { loadTicket } = await import("./check-in.server");
    return loadTicket(data.token);
  });
