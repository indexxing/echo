import { interactions } from "../db/schema";
import { type Post } from "@skyware/bot";
import * as threadUtils from "../utils/thread";
import modelPrompt from "../model/prompt.txt";
import { GoogleGenAI } from "@google/genai";
import * as tools from "../tools";
import consola from "consola";
import { env } from "../env";
import db from "../db";
import * as yaml from "js-yaml";

const logger = consola.withTag("Post Handler");

const AUTHORIZED_USERS = [
    "did:plc:sfjxpxxyvewb2zlxwoz2vduw",
    "did:plc:wfa54mpcbngzazwne3piz7fp",
] as const;

const UNAUTHORIZED_MESSAGE =
    "hey there! thanks for the heads-up! i'm still under development, so i'm not quite ready to chat with everyone just yet. my admin, @indexx.dev, is working on getting me up to speed! 🤖";

const SUPPORTED_FUNCTION_CALLS = [
    "create_post",
    "create_blog_post",
    "mute_thread",
] as const;

type SupportedFunctionCall = typeof SUPPORTED_FUNCTION_CALLS[number];

async function isAuthorizedUser(did: string): Promise<boolean> {
    return AUTHORIZED_USERS.includes(did as any);
}

async function logInteraction(post: Post): Promise<void> {
    await db.insert(interactions).values([{
        uri: post.uri,
        did: post.author.did,
    }]);

    logger.success(`Logged interaction, initiated by @${post.author.handle}`);
}

async function generateAIResponse(parsedThread: string) {
    const genai = new GoogleGenAI({
        apiKey: env.GEMINI_API_KEY,
    });

    const config = {
        model: env.GEMINI_MODEL,
        config: {
            tools: tools.declarations,
        },
    };

    const contents = [
        {
            role: "model" as const,
            parts: [
                { text: modelPrompt },
            ],
        },
        {
            role: "user" as const,
            parts: [
                {
                    text:
                        `This is the thread. The top replies are older, the bottom replies are newer.    
                    ${parsedThread}`,
                },
            ],
        },
    ];

    let inference = await genai.models.generateContent({
        ...config,
        contents,
    });

    logger.log(
        `Initial inference took ${inference.usageMetadata?.totalTokenCount} tokens`,
    );

    if (inference.functionCalls && inference.functionCalls.length > 0) {
        const call = inference.functionCalls[0];

        if (
            call &&
            SUPPORTED_FUNCTION_CALLS.includes(
                call.name as SupportedFunctionCall,
            )
        ) {
            logger.log("Function called invoked:", call.name);

            const functionResponse = await tools.handler(
                call as typeof call & { name: SupportedFunctionCall },
            );

            logger.log("Function response:", functionResponse);

            //@ts-ignore
            contents.push(inference.candidates[0]?.content!);

            contents.push({
                role: "user" as const,
                parts: [{
                    //@ts-ignore
                    functionResponse: {
                        name: call.name as string,
                        response: { res: functionResponse },
                    },
                }],
            });

            inference = await genai.models.generateContent({
                ...config,
                contents,
            });
        }
    }

    return inference;
}

async function sendResponse(post: Post, text: string): Promise<void> {
    post.like();

    if (threadUtils.exceedsGraphemes(text)) {
        threadUtils.multipartResponse(text, post);
    } else {
        post.reply({ text });
    }
}

export async function handler(post: Post): Promise<void> {
    try {
        if (!await isAuthorizedUser(post.author.did)) {
            await post.reply({ text: UNAUTHORIZED_MESSAGE });
            return;
        }

        await logInteraction(post);

        if (await threadUtils.isThreadMuted(post)) {
            logger.warn("Thread is muted.");
            return;
        }

        const thread = await threadUtils.traverseThread(post);
        const parsedThread = threadUtils.parseThread(thread);
        logger.success("Generated thread context:", parsedThread);

        const inference = await generateAIResponse(parsedThread);
        logger.success("Generated text:", inference.text);

        const responseText = inference.text;
        if (responseText) {
            await sendResponse(post, responseText);
        }
    } catch (error) {
        logger.error("Error in post handler:", error);

        await post.reply({
            text:
                "aw, shucks, something went wrong! gonna take a quick nap and try again later. 😴",
        });
    }
}
