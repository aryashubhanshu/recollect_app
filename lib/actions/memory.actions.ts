"use server"

import User from "../models/user.model"
import Memory from "../models/memory.model"
import Community from "../models/community.model"

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
        .populate({ 
            path: 'author', 
            model: User 
        })
        .populate({
            path: 'community',
            model: Community
        })
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

        const communityIdObject = await Community.findOne(
            { id: communityId },
            { _id: 1 }
        );

        const createdMemory = await Memory.create({
            text, 
            author,
            community: communityIdObject,
        });

        //Updade User model
        await User.findByIdAndUpdate(author, {
            $push: { memories: createdMemory._id}
        });

        if(communityIdObject) {
            //Update Community model
            await Community.findByIdAndUpdate(communityIdObject, {
                $push: { memories: createdMemory._id },
            });
        }

        revalidatePath(path);
    } catch (error: any) {
        throw new Error(`Error creating memory: ${error.message}`);
    }
}

async function fetchAllChildMemories(memoryId: string): Promise<any[]> {
    const childMemories = await Memory.find({ parentId: memoryId });

    const descendantMemories = [];
    for(const childMemory of childMemories) {
        const descendants = await fetchAllChildMemories(childMemory._id);
        descendantMemories.push(childMemory, ...descendants);
    }

    return descendantMemories;
}

export async function deleteMemory(id: string, path: string): Promise<void> {
    try {
      connectToDB();
  
      // Find the memory to be deleted (the main memory)
      const mainMemory = await Memory.findById(id).populate("author community");
  
      if (!mainMemory) {
        throw new Error("Memory not found");
      }
  
      // Fetch all child memories and their descendants recursively
      const descendantMemories = await fetchAllChildMemories(id);
  
      // Get all descendant memory IDs including the main memory ID and child memory IDs
      const descendantMemoryIds = [
        id,
        ...descendantMemories.map((memory) => memory._id),
      ];
  
      // Extract the authorIds and communityIds to update User and Community models respectively
      const uniqueAuthorIds = new Set(
        [
          ...descendantMemories.map((memory) => memory.author?._id?.toString()), // Use optional chaining to handle possible undefined values
          mainMemory.author?._id?.toString(),
        ].filter((id) => id !== undefined)
      );
  
      const uniqueCommunityIds = new Set(
        [
          ...descendantMemories.map((memory) => memory.community?._id?.toString()), // Use optional chaining to handle possible undefined values
          mainMemory.community?._id?.toString(),
        ].filter((id) => id !== undefined)
      );
  
      // Recursively delete child memories and their descendants
      await Memory.deleteMany({ _id: { $in: descendantMemoryIds } });
  
      // Update User model
      await User.updateMany(
        { _id: { $in: Array.from(uniqueAuthorIds) } },
        { $pull: { memories: { $in: descendantMemoryIds } } }
      );
  
      // Update Community model
      await Community.updateMany(
        { _id: { $in: Array.from(uniqueCommunityIds) } },
        { $pull: { memories: { $in: descendantMemoryIds } } }
      );
  
      revalidatePath(path);
    } catch (error: any) {
      throw new Error(`Failed to delete memory: ${error.message}`);
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
                path: 'community',
                model: Community,
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