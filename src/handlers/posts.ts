import {
  isAuthorizedUser,
  logInteraction,
  getRecentInteractions,
} from "../utils/interactions";
import * as threadUtils from "../utils/thread";
import modelPrompt from "../model/prompt.txt";
import { GoogleGenAI } from "@google/genai";
import { type Post } from "@skyware/bot";
import * as c from "../constants";
import * as tools from "../tools";
import consola from "consola";
import { env } from "../env";
import { MemoryHandler } from "../utils/memory";
import * as yaml from "js-yaml";

const logger = consola.withTag("Post Handler");

type SupportedFunctionCall = typeof c.SUPPORTED_FUNCTION_CALLS[number];

async function generateAIResponse(memory: string, parsedThread: string) {
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
                {
                    /*
                        ? Once memory blocks are working, this will pull the prompt from the database, and the prompt will be
                        ? automatically initialized with the administrator's handle from the env variables. I only did this so
                        ? that if anybody runs the code themselves, they just have to edit the env variables, nothing else.
                    */
                    text: modelPrompt.replace(
                        "{{ administrator }}",
                        env.ADMIN_HANDLE,
                    ),
                },
                {
                    text: memory,
                },
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
            c.SUPPORTED_FUNCTION_CALLS.includes(
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
        post.reply({
            text,
            tags: c.TAGS,
        });
    }
}

export async function handler(post: Post): Promise<void> {
    try {
        if (!isAuthorizedUser(post.author.did)) {
            await post.reply({
                text: c.UNAUTHORIZED_MESSAGE,
                tags: c.TAGS,
            });
            return;
        }

        const isMuted = await threadUtils.isThreadMuted(post);
        if (isMuted) {
            logger.warn("Thread is muted.");
            await logInteraction(post, {
                responseText: null,
                wasMuted: true,
            });
            return;
        }

        const thread = await threadUtils.traverseThread(post);
        const parsedThread = threadUtils.parseThread(thread);
        logger.success("Generated thread context:", parsedThread);

        const botMemory = new MemoryHandler(
            env.DID,
            await MemoryHandler.getBlocks(env.DID),
        );
        const userMemory = new MemoryHandler(
            post.author.did,
            await MemoryHandler.getBlocks(post.author.did),
        );

        const recentInteractions = await getRecentInteractions(
            post.author.did,
            thread,
        );

        const memory = yaml.dump({
            users_with_memory_blocks: {
                [env.HANDLE]: botMemory.parseBlocks(),
                [post.author.handle]: userMemory.parseBlocks(),
            },
            recent_interactions: recentInteractions,
        });

        logger.log("Parsed memory blocks: ", memory);

        const inference = await generateAIResponse(memory, parsedThread);
        logger.success("Generated text:", inference.text);

        const responseText = inference.text;
        if (responseText) {
            await sendResponse(post, responseText);
        }

        await logInteraction(post, {
            responseText: responseText ?? null,
            wasMuted: false,
        });
    } catch (error) {
        logger.error("Error in post handler:", error);

        await post.reply({
            text:
                "aw, shucks, something went wrong! gonna take a quick nap and try again later. 😴",
            tags: c.TAGS,
        });
    }
}
