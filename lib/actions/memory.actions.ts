"use server"

import User from "../models/user.model"
import Memory from "../models/memory.model"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose"

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
    connectToDB();

    // Calculate the number of posts to skip
    const skipAmount = (pageNumber-1) * pageSize;

    // Fetch the posts that have no parents (top-level memories...) 
    const postsQuery = Memory.find({ parentId: { $in: [null, undefined] } })
        .sort({ createdAt: 'desc' })
        .skip(skipAmount)
        .limit(pageSize)
        .populate({ path: 'author', model: User })
        .populate({ 
            path: 'children',
            populate: {
                path: 'author',
                model: User,
                select: '_id name parentId image',
            },
        });
    
    const totalPostsCount = await Memory.countDocuments({ parentId: { $in: [null, undefined] } });

    const posts = await postsQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext };
}

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string,
}

export async function createMemory({text, author, communityId, path}: Params) {
    try {
        connectToDB();

        const createdMemory = await Memory.create({
            text, 
            author,
            community: null,
        });

        //Updade User model
        await User.findByIdAndUpdate(author, {
            $push: { memories: createdMemory._id}
        })

        revalidatePath(path);
    } catch (error: any) {
        throw new Error(`Error creating memory: ${error.message}`);
    }
}

export async function fetchMemoryById(memoryId: string) {
    connectToDB();

    try {
        const memory = await Memory.findById(memoryId)
            .populate({
                path: 'author',
                model: User,
                select: "_id id name image"
            })
            .populate({
                path: 'children',
                populate: [
                    {
                        path: 'author',
                        model: User,
                        select: "_id id name parentId image"
                    },
                    {
                        path: 'children',
                        model: Memory,
                        populate: {
                            path: 'author',
                            model: User,
                            select: "_id id name parentId image"
                        }
                    }
                ]
            }).exec();

        return memory;

    }catch (error: any) {
        throw new Error(`Error fetching memory: ${error.message}`)
    }
}

export async function addCommentToMemory(
    memoryId: string, 
    commentText: string, 
    userId: string, 
    path: string 
) {
    connectToDB();

    try {
        // find the original memory by its ID
        const originalMemory = await Memory.findById(memoryId);

        if(!originalMemory) {
            throw new Error("Memory not found!")
        }

        // create a new memory with the commented text
        const commentMemory = new Memory({
            text: commentText,
            author: userId,
            parentId: memoryId
        });

        const savedCommentMemory = await commentMemory.save();

        originalMemory.children.push(savedCommentMemory._id);

        await originalMemory.save();

        revalidatePath(path);
    } catch(error: any) {
        throw new Error(`Error adding comment to memory: ${error.message}`)
    }
}