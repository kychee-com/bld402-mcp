import { z } from "zod";
import { loadWallet, getAccount, getPublicClient } from "../wallet.js";
import { getApiBase } from "../config.js";
import { text, error } from "../errors.js";

export const generateImageSchema = {
  prompt: z
    .string()
    .describe("Image description. Max 1000 characters."),
  aspect: z
    .enum(["square", "landscape", "portrait"])
    .default("square")
    .describe(
      "Aspect ratio: square (1:1), landscape (16:9), portrait (9:16)",
    ),
};

export async function handleGenerateImage(args: {
  prompt: string;
  aspect?: string;
}): Promise<{
  [key: string]: unknown;
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
  isError?: boolean;
}> {
  const wallet = loadWallet();
  if (!wallet) {
    return error(`No wallet found. Run \`bld402_setup\` first.`);
  }

  const aspect = args.aspect || "square";

  // x402 payment — same pattern as tier subscription
  const [{ x402Client, wrapFetchWithPayment }, { ExactEvmScheme }, { toClientEvmSigner }] =
    await Promise.all([
      import("@x402/fetch"),
      import("@x402/evm/exact/client"),
      import("@x402/evm"),
    ]);

  const account = getAccount(wallet);
  const publicClient = getPublicClient();
  const signer = toClientEvmSigner(account, publicClient);

  const client = new x402Client();
  client.register("eip155:84532", new ExactEvmScheme(signer));
  const fetchPaid = wrapFetchWithPayment(fetch, client);

  const apiBase = getApiBase();

  let res: Response;
  try {
    res = await fetchPaid(`${apiBase}/generate-image/v1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: args.prompt, aspect }),
    });
  } catch (err) {
    return error(
      `Image generation failed: ${(err as Error).message}. Check wallet balance ($0.03 USDC required per image).`,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as Record<string, string>).error ||
      (body as Record<string, string>).message ||
      `HTTP ${res.status}`;
    return error(`Image generation failed: ${msg}`);
  }

  const body = (await res.json()) as {
    image: string;
    content_type: string;
    aspect: string;
  };

  return {
    content: [
      {
        type: "text",
        text: `Generated ${body.aspect} image ($0.03 USDC)`,
      },
      {
        type: "image",
        data: body.image,
        mimeType: body.content_type || "image/png",
      },
    ],
  };
}
